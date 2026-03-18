"""
UltraScrap — FastAPI Backend
WebSocket-powered real-time scraping API.
Phase 5: Scheduled recurring jobs with delta mode.
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
import time
from pathlib import Path

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

sys.path.insert(0, str(Path(__file__).parent))

from core.discovery import URLDiscovery
from core.exporter import export as export_data, export_with_fields, SUPPORTED_FORMATS
from core.jobs import JobManager
from core.scraper import UltraScraper
from core.scheduler import ScheduleManager, CRON_PRESETS

app = FastAPI(title="UltraScrap API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

job_manager = JobManager()
ws_clients: dict[str, list[WebSocket]] = {}
schedule_mgr: ScheduleManager | None = None


class ScrapeRequest(BaseModel):
    target: str
    data_type: str = "auto"
    max_items: int = 50
    concurrency: int = 3
    proxy_list: list[str] = []

class ExportRequest(BaseModel):
    fmt: str = "csv"
    fields: list[str] = []
    renames: dict[str, str] = {}
    cleaning: dict = {}

class CleanPreviewRequest(BaseModel):
    cleaning: dict = {}

class ScheduleCreateRequest(BaseModel):
    name: str
    target: str
    cron: str
    data_type: str = "auto"
    max_items: int = 50
    concurrency: int = 3
    delta_mode: bool = True
    export_fmt: str = "csv"
    fields: list[str] = []
    renames: dict[str, str] = {}
    cleaning: dict = {}


async def broadcast(job_id: str, event: dict) -> None:
    clients = ws_clients.get(job_id, [])
    dead = []
    for ws in clients:
        try:
            await ws.send_text(json.dumps(event))
        except Exception:
            dead.append(ws)
    for d in dead:
        clients.remove(d)


async def run_scheduled_job(sc) -> None:
    from core.delta import filter_new_urls, mark_scraped, log_run
    urls = await URLDiscovery.resolve(sc.target, limit=sc.max_items)
    skipped = 0
    if sc.delta_mode and urls:
        urls, skipped = filter_new_urls(sc.id, urls)
        if not urls:
            log_run(sc.id, new_urls=0, skipped=skipped, status="skipped")
            return
    job = job_manager.create_job(urls=urls, data_type=sc.data_type, max_items=sc.max_items, concurrency=sc.concurrency)
    task = job_manager.start_job(job.id)
    if task:
        await task
    if sc.delta_mode:
        scraped_urls = [r["url"] for r in job.results if r.get("status") == "done"]
        mark_scraped(sc.id, scraped_urls)
    log_run(sc.id, new_urls=len(urls), skipped=skipped, status=job.status.value)


@app.on_event("startup")
async def startup():
    global schedule_mgr
    schedule_mgr = ScheduleManager(job_runner=run_scheduled_job)
    schedule_mgr.start()

@app.on_event("shutdown")
async def shutdown():
    if schedule_mgr:
        schedule_mgr.stop()


@app.get("/api/health")
async def health():
    return {"status": "ok", "timestamp": time.time()}

@app.post("/api/discover")
async def discover_urls(req: ScrapeRequest):
    urls = await URLDiscovery.resolve(req.target, limit=req.max_items)
    return {"target": req.target, "urls": urls, "count": len(urls)}

@app.post("/api/sample")
async def sample_scrape(req: ScrapeRequest):
    from core.exporter import _flatten_result
    urls = await URLDiscovery.resolve(req.target, limit=req.max_items)
    if not urls:
        return {"error": "Could not resolve any URLs from target"}
    scraper = UltraScraper(data_type=req.data_type)
    await scraper.start()
    try:
        result = await scraper.scrape_url(urls[0])
        if result.status.value == "error":
            return {"error": result.error or "Scrape failed", "urls": urls}
        row = _flatten_result(result.to_dict())
    finally:
        await scraper.stop()
    fields = []
    for key, val in row.items():
        fields.append({"key": key, "label": key, "sample": str(val)[:120] if val not in ("", None) else "", "include": True, "empty": val in ("", None, 0)})
    return {"urls": urls, "sample_url": urls[0], "fields": fields, "sample_row": {k: str(v)[:120] for k, v in row.items()}}

@app.post("/api/jobs/create")
async def create_job(req: ScrapeRequest):
    urls = await URLDiscovery.resolve(req.target, limit=req.max_items)
    if not urls:
        return {"error": "Could not resolve any URLs from target"}
    job = job_manager.create_job(urls=urls, data_type=req.data_type, max_items=req.max_items, concurrency=min(req.concurrency, 15), proxy_list=req.proxy_list)
    return {"job_id": job.id, "urls": urls, "count": len(urls)}

@app.post("/api/jobs/{job_id}/start")
async def start_job(job_id: str):
    job = job_manager.get_job(job_id)
    if not job:
        return {"error": "Job not found"}
    async def on_event(event: dict):
        await broadcast(job_id, event)
    job.subscribe(on_event)
    task = job_manager.start_job(job_id)
    if not task:
        return {"error": "Could not start job"}
    return {"status": "started", "job_id": job_id}

@app.post("/api/jobs/{job_id}/cancel")
async def cancel_job(job_id: str):
    return {"cancelled": job_manager.cancel_job(job_id)}

@app.get("/api/jobs")
async def list_jobs():
    return {"jobs": job_manager.list_jobs()}

@app.get("/api/jobs/{job_id}")
async def get_job(job_id: str):
    job = job_manager.get_job(job_id)
    return job.to_dict() if job else {"error": "Not found"}

@app.get("/api/jobs/{job_id}/results")
async def get_results(job_id: str, limit: int = 50, offset: int = 0):
    return job_manager.get_results(job_id, limit=limit, offset=offset)

@app.get("/api/formats")
async def list_formats():
    return {"formats": [
        {"value": "csv",     "label": "CSV",           "desc": "pandas, Excel, Google Sheets"},
        {"value": "tsv",     "label": "TSV",           "desc": "NLP tools, Excel, R"},
        {"value": "jsonl",   "label": "JSONL",         "desc": "ML training datasets, HuggingFace"},
        {"value": "json",    "label": "JSON",          "desc": "APIs, JavaScript, general use"},
        {"value": "parquet", "label": "Parquet",       "desc": "Spark, DuckDB, BigQuery, PyArrow"},
        {"value": "xlsx",    "label": "Excel (.xlsx)", "desc": "Non-technical users, spreadsheets"},
    ]}

@app.get("/api/jobs/{job_id}/export")
async def export_job(job_id: str, fmt: str = "csv"):
    from fastapi.responses import Response
    job = job_manager.get_job(job_id)
    if not job: return {"error": "Job not found"}
    if not job.results: return {"error": "No results to export"}
    try:
        file_bytes, media_type, ext = export_data(job.results, fmt)
    except (ValueError, RuntimeError) as e:
        return {"error": str(e)}
    return Response(content=file_bytes, media_type=media_type, headers={"Content-Disposition": f'attachment; filename="ultrascrap-{job_id[:8]}.{ext}"'})

@app.post("/api/jobs/{job_id}/export")
async def export_job_filtered(job_id: str, req: ExportRequest):
    from fastapi.responses import Response
    job = job_manager.get_job(job_id)
    if not job: return {"error": "Job not found"}
    if not job.results: return {"error": "No results to export"}
    try:
        file_bytes, media_type, ext = export_with_fields(job.results, req.fmt, req.fields, req.renames, req.cleaning)
    except (ValueError, RuntimeError) as e:
        return {"error": str(e)}
    return Response(content=file_bytes, media_type=media_type, headers={"Content-Disposition": f'attachment; filename="ultrascrap-{job_id[:8]}.{ext}"'})

@app.post("/api/jobs/{job_id}/clean-preview")
async def clean_preview(job_id: str, req: CleanPreviewRequest):
    from core.exporter import _to_rows
    from core.cleaner import apply_cleaning_with_log
    job = job_manager.get_job(job_id)
    if not job: return {"error": "Job not found"}
    if not job.results: return {"error": "No results yet"}
    _, all_rows = _to_rows(job.results)
    _, log = apply_cleaning_with_log(all_rows, req.cleaning)
    return {"total_input": len(all_rows), "log": log}

@app.post("/api/quick-scrape")
async def quick_scrape(req: ScrapeRequest):
    urls = await URLDiscovery.resolve(req.target, limit=1)
    if not urls: return {"error": "Could not resolve URL"}
    scraper = UltraScraper(data_type=req.data_type)
    await scraper.start()
    try:
        result = await scraper.scrape_url(urls[0])
        return result.to_dict()
    finally:
        await scraper.stop()


# ── Schedule endpoints ────────────────────────────────────────────────────────

@app.get("/api/schedules")
async def list_schedules():
    if not schedule_mgr: return {"schedules": [], "error": "Scheduler not initialized"}
    return {"schedules": schedule_mgr.list_all(), "cron_presets": CRON_PRESETS}

@app.post("/api/schedules")
async def create_schedule(req: ScheduleCreateRequest):
    if not schedule_mgr: return {"error": "Scheduler not available"}
    try:
        sc = schedule_mgr.create(name=req.name, target=req.target, cron=req.cron, data_type=req.data_type, max_items=req.max_items, concurrency=req.concurrency, delta_mode=req.delta_mode, export_fmt=req.export_fmt, fields=req.fields, renames=req.renames, cleaning=req.cleaning)
        return {"schedule": sc.to_dict()}
    except Exception as e:
        return {"error": str(e)}

@app.delete("/api/schedules/{schedule_id}")
async def delete_schedule(schedule_id: str):
    if not schedule_mgr: return {"error": "Scheduler not available"}
    return {"deleted": schedule_mgr.delete(schedule_id)}

@app.post("/api/schedules/{schedule_id}/toggle")
async def toggle_schedule(schedule_id: str):
    if not schedule_mgr: return {"error": "Scheduler not available"}
    sc = schedule_mgr.toggle(schedule_id)
    return {"schedule": sc.to_dict()} if sc else {"error": "Schedule not found"}

@app.post("/api/schedules/{schedule_id}/run-now")
async def run_schedule_now(schedule_id: str):
    if not schedule_mgr: return {"error": "Scheduler not available"}
    ok = await schedule_mgr.run_now(schedule_id)
    return {"triggered": ok}

@app.post("/api/schedules/{schedule_id}/clear-delta")
async def clear_schedule_delta(schedule_id: str):
    if not schedule_mgr: return {"error": "Scheduler not available"}
    return {"cleared": schedule_mgr.clear_delta(schedule_id)}

@app.get("/api/schedules/{schedule_id}")
async def get_schedule(schedule_id: str):
    if not schedule_mgr: return {"error": "Scheduler not available"}
    sc = schedule_mgr.get(schedule_id)
    if not sc: return {"error": "Not found"}
    from core.delta import get_run_history, get_seen_count
    d = sc.to_dict()
    d["seen_url_count"] = get_seen_count(schedule_id)
    d["run_history"]    = get_run_history(schedule_id, limit=20)
    return d


# ── WebSocket ─────────────────────────────────────────────────────────────────

@app.websocket("/ws/{job_id}")
async def websocket_endpoint(websocket: WebSocket, job_id: str):
    await websocket.accept()
    ws_clients.setdefault(job_id, []).append(websocket)
    job = job_manager.get_job(job_id)
    if job:
        await websocket.send_text(json.dumps({"event": "state", "job": job.to_dict()}))
    try:
        while True:
            await asyncio.sleep(1)
            await websocket.send_text(json.dumps({"event": "ping"}))
    except WebSocketDisconnect:
        if job_id in ws_clients and websocket in ws_clients[job_id]:
            ws_clients[job_id].remove(websocket)


# ── Static frontend ───────────────────────────────────────────────────────────

frontend_dist = Path(__file__).parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")

if __name__ == "__main__":
    port = int(os.getenv("APP_PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False, log_level="info")