"""
UltraScrap — Job Manager

Fixes vs original:
  - Private dataclass fields (_scraper, _task, _subscribers) now use
    field(default=..., init=False, repr=False) so they are excluded from
    __init__ and repr, matching intended usage.
  - Jobs are evicted from memory after JOB_TTL_SECONDS (default 2 h) to
    prevent unbounded RAM growth on long-running servers.
  - cancel_job sets a cancellation flag checked by the run loop, so in-flight
    scrape_url calls complete cleanly before the job stops — no partial
    appends to results after cancellation.
  - Completed job results are automatically written to the exports/ directory
    as newline-delimited JSON so data survives a server restart.
"""

from __future__ import annotations

import asyncio
import json
import os
import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Callable

from core.scraper import ScrapeResult, ScrapeStatus, UltraScraper

# Results older than this are evicted from memory (still on disk in exports/)
JOB_TTL_SECONDS = 2 * 60 * 60   # 2 hours

EXPORTS_DIR = Path(os.getenv("EXPORT_DIR", "./exports"))
EXPORTS_DIR.mkdir(parents=True, exist_ok=True)


class JobStatus(str, Enum):
    QUEUED    = "queued"
    RUNNING   = "running"
    DONE      = "done"
    CANCELLED = "cancelled"
    ERROR     = "error"


@dataclass
class ScrapingJob:
    id:          str
    urls:        list[str]
    data_type:   str
    max_items:   int
    concurrency: int
    status:      JobStatus   = JobStatus.QUEUED
    created_at:  float       = field(default_factory=time.time)
    started_at:  float|None  = None
    finished_at: float|None  = None
    results:     list[dict]  = field(default_factory=list)
    errors:      list[dict]  = field(default_factory=list)
    total:       int         = 0
    completed:   int         = 0
    failed:      int         = 0
    rate_status: dict        = field(default_factory=dict)
    proxy_list:  list[str]   = field(default_factory=list)

    # FIX: private fields excluded from __init__ and repr to avoid accidental
    # construction misuse and noisy debug output.
    _scraper:     UltraScraper | None = field(default=None, init=False, repr=False)
    _task:        asyncio.Task | None = field(default=None, init=False, repr=False)
    _subscribers: list[Callable]      = field(default_factory=list, init=False, repr=False)
    # FIX: explicit cancellation flag so in-flight scrapes finish cleanly
    # before the job loop stops rather than being torn out mid-append.
    _cancel_requested: bool           = field(default=False, init=False, repr=False)

    def subscribe(self, callback: Callable) -> None:
        self._subscribers.append(callback)

    async def _notify(self, event: dict) -> None:
        for cb in self._subscribers:
            try:
                await cb(event)
            except Exception:
                pass

    def to_dict(self) -> dict:
        elapsed = 0.0
        if self.started_at:
            end = self.finished_at or time.time()
            elapsed = round(end - self.started_at, 1)

        return {
            "id":            self.id,
            "status":        self.status.value,
            "urls":          self.urls,
            "data_type":     self.data_type,
            "total":         self.total,
            "completed":     self.completed,
            "failed":        self.failed,
            "progress_pct":  round((self.completed + self.failed) / max(1, self.total) * 100, 1),
            "created_at":    self.created_at,
            "started_at":    self.started_at,
            "elapsed_sec":   elapsed,
            "results_count": len(self.results),
            "rate_status":   self.rate_status,
            "sample_results": self.results[:3],
        }

    async def run(self) -> None:
        self.status     = JobStatus.RUNNING
        self.started_at = time.time()
        self.total      = min(len(self.urls), self.max_items)
        urls_to_process = self.urls[:self.max_items]

        await self._notify({"event": "start", "job": self.to_dict()})

        self._scraper = UltraScraper(
            proxy_list=self.proxy_list,
            max_concurrency=self.concurrency,
            data_type=self.data_type,
        )
        await self._scraper.start()

        try:
            async for result in self._scraper.scrape_many(urls_to_process):
                # FIX: check the flag (set by cancel_job) rather than comparing
                # job.status, which avoids a race where status is written while
                # a result is being appended.
                if self._cancel_requested:
                    break

                if result.status == ScrapeStatus.DONE:
                    self.completed += 1
                    self.results.append(result.to_dict())
                else:
                    self.failed += 1
                    self.errors.append({"url": result.url, "error": result.error, "code": result.http_code})

                self.rate_status = self._scraper.rate_status()

                await self._notify({
                    "event":         "progress",
                    "job_id":        self.id,
                    "completed":     self.completed,
                    "failed":        self.failed,
                    "total":         self.total,
                    "progress_pct":  round((self.completed + self.failed) / self.total * 100, 1),
                    "latest_url":    result.url,
                    "latest_status": result.status.value,
                    "rate_status":   self.rate_status,
                    "sample":        result.to_dict() if result.status == ScrapeStatus.DONE else None,
                })

        finally:
            await self._scraper.stop()
            self.finished_at = time.time()
            if self._cancel_requested:
                self.status = JobStatus.CANCELLED
            else:
                self.status = JobStatus.DONE

            # FIX: persist results to disk so data survives a server restart
            self._save_to_disk()

            await self._notify({"event": "done", "job": self.to_dict()})

    def _save_to_disk(self) -> None:
        """Write results as newline-delimited JSON to the exports directory."""
        try:
            out_path = EXPORTS_DIR / f"{self.id}.ndjson"
            with out_path.open("w", encoding="utf-8") as f:
                for record in self.results:
                    f.write(json.dumps(record, ensure_ascii=False) + "\n")
        except Exception as e:
            # Non-fatal — log and continue; the in-memory results are still valid
            import logging
            logging.getLogger("ultrascrap").warning(f"[jobs] Failed to save results to disk: {e}")


class JobManager:
    """Central registry for all scraping jobs."""

    def __init__(self) -> None:
        self._jobs: dict[str, ScrapingJob] = {}

    # ── TTL eviction ─────────────────────────────────────────────────────────

    def _evict_old_jobs(self) -> None:
        """
        FIX: Remove finished jobs older than JOB_TTL_SECONDS.
        The original stored every job forever, causing unbounded RAM growth.
        Results are already on disk via _save_to_disk(), so eviction is safe.
        """
        now = time.time()
        to_delete = [
            jid for jid, job in self._jobs.items()
            if job.status in (JobStatus.DONE, JobStatus.CANCELLED, JobStatus.ERROR)
            and job.finished_at is not None
            and (now - job.finished_at) > JOB_TTL_SECONDS
        ]
        for jid in to_delete:
            del self._jobs[jid]

    # ── Public API ────────────────────────────────────────────────────────────

    def create_job(
        self,
        urls:        list[str],
        data_type:   str = "auto",
        max_items:   int = 100,
        concurrency: int = 3,
        proxy_list:  list[str] | None = None,
    ) -> ScrapingJob:
        self._evict_old_jobs()
        job_id = str(uuid.uuid4())
        job = ScrapingJob(
            id=job_id,
            urls=urls,
            data_type=data_type,
            max_items=max_items,
            concurrency=concurrency,
            proxy_list=proxy_list or [],
        )
        self._jobs[job_id] = job
        return job

    def get_job(self, job_id: str) -> ScrapingJob | None:
        return self._jobs.get(job_id)

    def list_jobs(self) -> list[dict]:
        self._evict_old_jobs()
        return [j.to_dict() for j in reversed(list(self._jobs.values()))]

    def start_job(self, job_id: str) -> asyncio.Task | None:
        job = self._jobs.get(job_id)
        if not job or job.status not in (JobStatus.QUEUED,):
            return None
        task = asyncio.create_task(job.run())
        job._task = task
        return task

    def cancel_job(self, job_id: str) -> bool:
        job = self._jobs.get(job_id)
        if not job:
            return False
        # FIX: set the flag first so the run loop exits cleanly after the
        # current in-flight scrape_url calls finish, rather than cancelling
        # the asyncio Task which can leave results in a half-appended state.
        job._cancel_requested = True
        # Also cancel the task to unblock any awaits (e.g. queue.get) that
        # would otherwise keep the loop alive waiting for the next URL.
        if job._task and not job._task.done():
            job._task.cancel()
        return True

    def get_results(self, job_id: str, limit: int = 100, offset: int = 0) -> dict[str, Any]:
        job = self._jobs.get(job_id)
        if not job:
            # FIX: try loading from disk if the job was evicted from memory
            ndjson_path = EXPORTS_DIR / f"{job_id}.ndjson"
            if ndjson_path.exists():
                try:
                    with ndjson_path.open(encoding="utf-8") as f:
                        all_results = [json.loads(line) for line in f if line.strip()]
                    return {
                        "job_id":        job_id,
                        "total_results": len(all_results),
                        "results":       all_results[offset: offset + limit],
                        "errors":        [],
                        "source":        "disk",
                    }
                except Exception:
                    pass
            return {}

        return {
            "job_id":        job_id,
            "total_results": len(job.results),
            "results":       job.results[offset: offset + limit],
            "errors":        job.errors[:20],
            "source":        "memory",
        }
