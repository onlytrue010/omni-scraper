"""
UltraScrap — Scheduler
APScheduler-based recurring scrape jobs with cron expressions,
delta mode, and run history.
"""

from __future__ import annotations

import asyncio
import json
import time
import uuid
from dataclasses import dataclass, field, asdict
from typing import Any, Callable

try:
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    from apscheduler.triggers.cron import CronTrigger
    HAS_APSCHEDULER = True
except ImportError:
    HAS_APSCHEDULER = False


@dataclass
class ScheduleConfig:
    id:           str
    name:         str
    target:       str
    cron:         str        # standard 5-field cron: "0 6 * * *" = daily at 6am
    data_type:    str  = "auto"
    max_items:    int  = 50
    concurrency:  int  = 3
    delta_mode:   bool = True   # only scrape new URLs since last run
    export_fmt:   str  = "csv"
    fields:       list = field(default_factory=list)
    renames:      dict = field(default_factory=dict)
    cleaning:     dict = field(default_factory=dict)
    created_at:   float = field(default_factory=time.time)
    enabled:      bool = True
    last_run_at:  float | None = None
    next_run_at:  float | None = None
    last_status:  str = "never"   # never | running | done | error
    total_runs:   int = 0

    def to_dict(self) -> dict:
        return asdict(self)


class ScheduleManager:
    """
    In-memory schedule registry backed by APScheduler.
    Schedules survive server restarts via a simple JSON file.
    """

    STORE_PATH_DEFAULT = None   # set at init

    def __init__(self, store_path: str | None = None, job_runner: Callable | None = None):
        from pathlib import Path
        self._store = Path(store_path or "exports/schedules.json")
        self._store.parent.mkdir(parents=True, exist_ok=True)
        self._schedules: dict[str, ScheduleConfig] = {}
        self._job_runner: Callable | None = job_runner  # async fn(schedule) -> None
        self._scheduler: Any = None
        self._load()

    # ── Persistence ───────────────────────────────────────────────────────────

    def _load(self) -> None:
        if self._store.exists():
            try:
                data = json.loads(self._store.read_text())
                for item in data:
                    sc = ScheduleConfig(**item)
                    self._schedules[sc.id] = sc
            except Exception as e:
                print(f"[scheduler] load error: {e}")

    def _save(self) -> None:
        try:
            self._store.write_text(
                json.dumps([s.to_dict() for s in self._schedules.values()], indent=2)
            )
        except Exception as e:
            print(f"[scheduler] save error: {e}")

    # ── APScheduler lifecycle ─────────────────────────────────────────────────

    def start(self) -> None:
        if not HAS_APSCHEDULER:
            print("[scheduler] APScheduler not installed — scheduled jobs disabled. Run: pip install apscheduler")
            return
        self._scheduler = AsyncIOScheduler(timezone="UTC")
        for sc in self._schedules.values():
            if sc.enabled:
                self._add_apscheduler_job(sc)
        self._scheduler.start()
        print(f"[scheduler] Started with {len(self._schedules)} schedule(s)")

    def stop(self) -> None:
        if self._scheduler:
            self._scheduler.shutdown(wait=False)

    def _add_apscheduler_job(self, sc: ScheduleConfig) -> None:
        if not self._scheduler:
            return
        try:
            parts = sc.cron.strip().split()
            if len(parts) == 5:
                minute, hour, day, month, dow = parts
            else:
                print(f"[scheduler] Invalid cron '{sc.cron}' for schedule {sc.id}")
                return
            self._scheduler.add_job(
                self._run_schedule,
                CronTrigger(minute=minute, hour=hour, day=day, month=month, day_of_week=dow),
                args=[sc.id],
                id=sc.id,
                replace_existing=True,
                misfire_grace_time=3600,
            )
            # Update next_run_at
            job = self._scheduler.get_job(sc.id)
            if job and job.next_run_time:
                sc.next_run_at = job.next_run_time.timestamp()
        except Exception as e:
            print(f"[scheduler] Failed to add job {sc.id}: {e}")

    def _remove_apscheduler_job(self, schedule_id: str) -> None:
        if not self._scheduler:
            return
        try:
            self._scheduler.remove_job(schedule_id)
        except Exception:
            pass

    # ── Schedule CRUD ─────────────────────────────────────────────────────────

    def create(
        self,
        name: str,
        target: str,
        cron: str,
        data_type: str = "auto",
        max_items: int = 50,
        concurrency: int = 3,
        delta_mode: bool = True,
        export_fmt: str = "csv",
        fields: list | None = None,
        renames: dict | None = None,
        cleaning: dict | None = None,
    ) -> ScheduleConfig:
        sc = ScheduleConfig(
            id=str(uuid.uuid4()),
            name=name,
            target=target,
            cron=cron,
            data_type=data_type,
            max_items=max_items,
            concurrency=concurrency,
            delta_mode=delta_mode,
            export_fmt=export_fmt,
            fields=fields or [],
            renames=renames or {},
            cleaning=cleaning or {},
        )
        self._schedules[sc.id] = sc
        self._add_apscheduler_job(sc)
        self._save()
        return sc

    def get(self, schedule_id: str) -> ScheduleConfig | None:
        return self._schedules.get(schedule_id)

    def list_all(self) -> list[dict]:
        result = []
        for sc in self._schedules.values():
            d = sc.to_dict()
            from core.delta import get_seen_count, get_run_history
            d["seen_url_count"] = get_seen_count(sc.id)
            d["run_history"] = get_run_history(sc.id, limit=5)
            result.append(d)
        return result

    def delete(self, schedule_id: str) -> bool:
        if schedule_id not in self._schedules:
            return False
        self._remove_apscheduler_job(schedule_id)
        del self._schedules[schedule_id]
        self._save()
        return True

    def toggle(self, schedule_id: str) -> ScheduleConfig | None:
        sc = self._schedules.get(schedule_id)
        if not sc:
            return None
        sc.enabled = not sc.enabled
        if sc.enabled:
            self._add_apscheduler_job(sc)
        else:
            self._remove_apscheduler_job(schedule_id)
        self._save()
        return sc

    def clear_delta(self, schedule_id: str) -> bool:
        if schedule_id not in self._schedules:
            return False
        from core.delta import clear_delta
        clear_delta(schedule_id)
        return True

    # ── Runner ────────────────────────────────────────────────────────────────

    async def _run_schedule(self, schedule_id: str) -> None:
        sc = self._schedules.get(schedule_id)
        if not sc or not sc.enabled:
            return
        sc.last_status = "running"
        sc.last_run_at = time.time()
        self._save()
        try:
            if self._job_runner:
                await self._job_runner(sc)
            sc.last_status = "done"
            sc.total_runs += 1
        except Exception as e:
            sc.last_status = "error"
            print(f"[scheduler] Run error for {schedule_id}: {e}")
        finally:
            # Update next run time
            if self._scheduler:
                job = self._scheduler.get_job(schedule_id)
                if job and job.next_run_time:
                    sc.next_run_at = job.next_run_time.timestamp()
            self._save()

    async def run_now(self, schedule_id: str) -> bool:
        """Trigger a schedule immediately (for testing)."""
        sc = self._schedules.get(schedule_id)
        if not sc:
            return False
        asyncio.create_task(self._run_schedule(schedule_id))
        return True


# ── Cron helpers ──────────────────────────────────────────────────────────────

CRON_PRESETS = [
    {"label": "Every hour",        "cron": "0 * * * *"},
    {"label": "Every 6 hours",     "cron": "0 */6 * * *"},
    {"label": "Daily at midnight", "cron": "0 0 * * *"},
    {"label": "Daily at 6am",      "cron": "0 6 * * *"},
    {"label": "Daily at noon",     "cron": "0 12 * * *"},
    {"label": "Weekly (Monday)",   "cron": "0 6 * * 1"},
    {"label": "Every weekday",     "cron": "0 6 * * 1-5"},
    {"label": "Monthly (1st)",     "cron": "0 6 1 * *"},
]