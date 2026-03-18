"""
UltraScrap — Data Cleaner
Post-processing pipeline applied to flattened rows before export.
Each option is independent and can be toggled on/off.
"""

from __future__ import annotations

import re
import html
from datetime import datetime, timezone
from typing import Any


# ── Individual cleaning functions ─────────────────────────────────────────────

def strip_html_tags(value: str) -> str:
    """Remove all HTML tags and decode entities."""
    text = re.sub(r"<[^>]+>", " ", str(value))
    text = html.unescape(text)
    return text


def normalize_whitespace(value: str) -> str:
    """Collapse multiple spaces/newlines into a single space and strip."""
    return re.sub(r"\s+", " ", str(value)).strip()


def parse_price(value: str) -> Any:
    """
    Try to extract a numeric price from a string like '$1,299.99' or '€ 45.00'.
    Returns float if successful, original string otherwise.
    """
    if value in ("", None):
        return value
    cleaned = re.sub(r"[^\d.,]", "", str(value)).replace(",", "")
    try:
        return float(cleaned)
    except ValueError:
        return value


# Common date patterns, ordered most-specific first
_DATE_PATTERNS = [
    (r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}",    "%Y-%m-%dT%H:%M:%S"),
    (r"\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}",     "%Y-%m-%d %H:%M:%S"),
    (r"\d{2}/\d{2}/\d{4} \d{2}:\d{2}",            "%m/%d/%Y %H:%M"),
    (r"\d{4}-\d{2}-\d{2}",                         "%Y-%m-%d"),
    (r"\d{2}/\d{2}/\d{4}",                         "%m/%d/%Y"),
    (r"\d{2}-\d{2}-\d{4}",                         "%d-%m-%Y"),
    (r"[A-Za-z]+ \d{1,2},? \d{4}",                "%B %d %Y"),
    (r"\d{1,2} [A-Za-z]+ \d{4}",                  "%d %B %Y"),
]

def parse_date_to_iso(value: str) -> str:
    """
    Try to detect and normalize date strings to ISO 8601 (YYYY-MM-DD).
    Returns original string if no date pattern found.
    """
    s = str(value).strip()
    for pattern, fmt in _DATE_PATTERNS:
        m = re.search(pattern, s)
        if m:
            raw = m.group(0).replace(",", "")
            try:
                dt = datetime.strptime(raw, fmt)
                return dt.date().isoformat()
            except ValueError:
                continue
    return value


_PRICE_COLS  = {"prices", "price", "cost", "amount", "fee", "rate", "salary"}
_DATE_COLS   = {"timestamp", "date", "published", "created_at", "updated_at",
                "published_date", "modified", "scraped_at"}
_TEXT_COLS   = {"heading", "first_para", "title", "description", "content",
                "summary", "body", "text"}


# ── Main apply function ────────────────────────────────────────────────────────

def apply_cleaning(
    rows: list[dict],
    opts: dict,
) -> list[dict]:
    """
    Apply cleaning options to a list of flattened rows.
    Returns cleaned rows (same interface as before).
    Use apply_cleaning_with_log() to also get the activity log.
    """
    cleaned, _ = apply_cleaning_with_log(rows, opts)
    return cleaned


def apply_cleaning_with_log(
    rows: list[dict],
    opts: dict,
) -> tuple[list[dict], list[dict]]:
    """
    Apply cleaning and return (cleaned_rows, log_entries).

    Each log entry: { type, message }
    type: 'removed_duplicate' | 'removed_empty' | 'modified' | 'info'
    """
    strip_html     = opts.get("strip_html",        False)
    normalize_ws   = opts.get("normalize_ws",       False)
    remove_empty   = opts.get("remove_empty_rows",  False)
    dedup          = opts.get("deduplicate",         False)
    do_prices      = opts.get("parse_prices",        False)
    do_dates       = opts.get("parse_dates",         False)
    max_len        = int(opts.get("max_text_len",    0))

    seen_urls: set[str] = set()
    cleaned: list[dict] = []
    log: list[dict] = []

    # Summary counters
    n_dedup   = 0
    n_empty   = 0
    n_html    = 0
    n_ws      = 0
    n_prices  = 0
    n_dates   = 0
    n_trunc   = 0

    for row in rows:
        url = row.get("url", "")

        # ── Deduplication ──
        if dedup and url:
            if url in seen_urls:
                n_dedup += 1
                log.append({
                    "type": "removed_duplicate",
                    "message": f"Removed duplicate: {url[:70]}",
                })
                continue
            seen_urls.add(url)

        new_row: dict[str, Any] = {}
        row_modified = False

        for key, val in row.items():
            if val is None or val == "":
                new_row[key] = val
                continue

            s = str(val)

            if strip_html:
                stripped = strip_html_tags(s)
                if stripped != s:
                    n_html += 1
                    row_modified = True
                s = stripped

            if normalize_ws:
                normed = normalize_whitespace(s)
                if normed != s:
                    n_ws += 1
                    row_modified = True
                s = normed

            if max_len > 0 and key in _TEXT_COLS and len(s) > max_len:
                s = s[:max_len].rstrip() + "…"
                n_trunc += 1
                row_modified = True

            if do_prices and (key in _PRICE_COLS or "price" in key.lower()):
                result = parse_price(s)
                new_row[key] = result
                if result != s:
                    n_prices += 1
                    row_modified = True
                continue

            if do_dates and (key in _DATE_COLS or "date" in key.lower() or "time" in key.lower()):
                result = parse_date_to_iso(s)
                new_row[key] = result
                if result != s:
                    n_dates += 1
                    row_modified = True
                continue

            new_row[key] = s

        # ── Remove empty rows ──
        if remove_empty:
            non_url_vals = [v for k, v in new_row.items()
                            if k != "url" and v not in ("", None, 0)]
            if not non_url_vals:
                n_empty += 1
                log.append({
                    "type": "removed_empty",
                    "message": f"Removed empty row: {url[:70] or '(no url)'}",
                })
                continue

        cleaned.append(new_row)

    # ── Summary log entries ──
    if n_dedup:
        log.append({"type": "info", "message": f"Deduplication: removed {n_dedup} duplicate URL(s)"})
    if n_empty:
        log.append({"type": "info", "message": f"Empty rows: removed {n_empty} row(s) with no content"})
    if n_html:
        log.append({"type": "info", "message": f"HTML stripping: cleaned tags from {n_html} field value(s)"})
    if n_ws:
        log.append({"type": "info", "message": f"Whitespace: normalized {n_ws} field value(s)"})
    if n_prices:
        log.append({"type": "info", "message": f"Prices: parsed {n_prices} value(s) to numeric"})
    if n_dates:
        log.append({"type": "info", "message": f"Dates: normalized {n_dates} value(s) to ISO 8601"})
    if n_trunc:
        log.append({"type": "info", "message": f"Truncation: shortened {n_trunc} text field(s) to {max_len} chars"})
    if not log:
        log.append({"type": "info", "message": "No cleaning applied — all options were off"})

    return cleaned, log