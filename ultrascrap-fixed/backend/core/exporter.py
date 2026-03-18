"""
UltraScrap — Data Exporter
Converts scraped job results into CSV, TSV, JSONL, Parquet, or Excel.
Supports field selection, column renames, and data cleaning.
"""

from __future__ import annotations

import csv
import io
import json
from typing import Any

SUPPORTED_FORMATS = ["csv", "tsv", "jsonl", "json", "parquet", "xlsx"]


def _flatten_result(result: dict) -> dict:
    """
    Flatten a ScrapeResult.to_dict() into a single-level row suitable
    for tabular formats.
    """
    data = result.get("data", {}) or {}
    inner = data.get("data", {}) or {}

    row: dict[str, Any] = {
        "url":         result.get("url", ""),
        "title":       data.get("title", ""),
        "status":      result.get("status", ""),
        "http_code":   result.get("http_code", ""),
        "duration_ms": result.get("duration_ms", ""),
        "timestamp":   result.get("timestamp", ""),
    }

    for k, v in (data.get("meta") or {}).items():
        safe_key = "meta_" + k.replace(":", "_").replace("-", "_")
        row[safe_key] = str(v)[:500] if v else ""

    prices = inner.get("prices") or []
    if prices:
        row["prices"] = " | ".join(p.get("price", "") for p in prices)

    for k, v in (inner.get("attributes") or {}).items():
        safe_key = "attr_" + k.replace(" ", "_").lower()[:40]
        row[safe_key] = str(v)[:500]

    texts = inner.get("text") or []
    headings   = [b["text"] for b in texts if b.get("tag", "").startswith("h")]
    paragraphs = [b["text"] for b in texts if b.get("tag") == "p"]
    row["heading"]          = headings[0][:300]   if headings   else ""
    row["first_para"]       = paragraphs[0][:500] if paragraphs else ""
    row["text_block_count"] = len(texts)

    tables = inner.get("tables") or []
    row["table_count"] = len(tables)
    if tables:
        row["first_table_json"] = json.dumps(tables[0][:10])

    row["link_count"]  = len(data.get("links")  or [])
    row["image_count"] = len(data.get("images") or [])

    structured = inner.get("structured") or []
    if structured:
        row["json_ld"] = json.dumps(structured[0])[:1000]

    return row


def _to_rows(results: list[dict]) -> tuple[list[str], list[dict]]:
    """Return (fieldnames, rows) — fieldnames are union of all keys."""
    rows = [_flatten_result(r) for r in results]
    fixed = [
        "url", "title", "status", "http_code", "duration_ms", "timestamp",
        "heading", "first_para", "text_block_count",
        "prices", "table_count", "first_table_json",
        "link_count", "image_count", "json_ld",
    ]
    extra: list[str] = []
    for row in rows:
        for k in row:
            if k not in fixed and k not in extra:
                extra.append(k)
    fieldnames = [f for f in fixed if any(f in r for r in rows)] + extra
    return fieldnames, rows


# ── Public API ─────────────────────────────────────────────────────────────────

def export(results: list[dict], fmt: str) -> tuple[bytes, str, str]:
    """Export all fields with no cleaning. Returns (bytes, media_type, ext)."""
    return export_with_fields(results, fmt, fields=[], renames={}, cleaning={})


def export_with_fields(
    results: list[dict],
    fmt: str,
    fields: list[str],
    renames: dict[str, str],
    cleaning: dict | None = None,
) -> tuple[bytes, str, str]:
    """
    Export with optional field selection, column renames, and data cleaning.
    fields=[]   → include all fields
    renames={}  → no renames
    cleaning={} → no cleaning applied
    Returns (file_bytes, media_type, file_extension).
    """
    from core.cleaner import apply_cleaning

    fmt = fmt.lower().strip()

    all_fieldnames, all_rows = _to_rows(results)

    # ── Apply cleaning before field filtering ──
    if cleaning:
        all_rows = apply_cleaning(all_rows, cleaning)

    # ── Field selection ──
    if fields:
        fieldnames = [f for f in fields if f in all_fieldnames]
        for f in fields:
            if f not in fieldnames:
                fieldnames.append(f)
    else:
        fieldnames = all_fieldnames

    # ── Apply renames ──
    def rename_row(row: dict) -> dict:
        return {renames.get(k, k): row.get(k, "") for k in fieldnames}

    renamed_fieldnames = [renames.get(f, f) for f in fieldnames]
    rows = [rename_row(r) for r in all_rows]

    if fmt == "csv":
        return _write_csv(rows, renamed_fieldnames, ","), "text/csv", "csv"
    if fmt == "tsv":
        return _write_csv(rows, renamed_fieldnames, "\t"), "text/tab-separated-values", "tsv"
    if fmt == "jsonl":
        lines = [json.dumps(r, ensure_ascii=False) for r in rows]
        return ("\n".join(lines) + "\n").encode("utf-8"), "application/x-ndjson", "jsonl"
    if fmt in ("json", ""):
        return json.dumps(rows, indent=2, ensure_ascii=False).encode("utf-8"), "application/json", "json"
    if fmt == "parquet":
        return _write_parquet(rows, renamed_fieldnames), "application/octet-stream", "parquet"
    if fmt in ("xlsx", "excel"):
        return _write_xlsx(rows, renamed_fieldnames), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx"
    raise ValueError(f"Unsupported format: {fmt}. Choose from: {SUPPORTED_FORMATS}")


# ── Writers ────────────────────────────────────────────────────────────────────

def _write_csv(rows: list[dict], fieldnames: list[str], delimiter: str) -> bytes:
    buf = io.StringIO()
    writer = csv.DictWriter(
        buf, fieldnames=fieldnames,
        extrasaction="ignore", restval="",
        delimiter=delimiter,
        lineterminator="\n",
        quoting=csv.QUOTE_MINIMAL,
    )
    writer.writeheader()
    writer.writerows(rows)
    return buf.getvalue().encode("utf-8")


def _write_parquet(rows: list[dict], fieldnames: list[str]) -> bytes:
    try:
        import pandas as pd
    except ImportError:
        raise RuntimeError("pandas is required for Parquet export. Run: pip install pandas pyarrow")
    df = pd.DataFrame(rows, columns=fieldnames)
    for col in ["http_code", "duration_ms", "text_block_count",
                "table_count", "link_count", "image_count"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
    buf = io.BytesIO()
    try:
        df.to_parquet(buf, index=False, engine="pyarrow")
    except (ImportError, Exception) as e:
        if "pyarrow" in str(e).lower():
            raise RuntimeError("pyarrow is required for Parquet export. Run: pip install pyarrow")
        raise
    return buf.getvalue()


def _write_xlsx(rows: list[dict], fieldnames: list[str]) -> bytes:
    try:
        import pandas as pd
    except ImportError:
        raise RuntimeError("pandas + openpyxl required. Run: pip install pandas openpyxl")
    df = pd.DataFrame(rows, columns=fieldnames)
    for col in ["http_code", "duration_ms", "text_block_count",
                "table_count", "link_count", "image_count"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="scraped_data")
        ws = writer.sheets["scraped_data"]
        for col_cells in ws.columns:
            max_len = max((len(str(c.value or "")) for c in col_cells), default=10)
            ws.column_dimensions[col_cells[0].column_letter].width = min(max_len + 2, 60)
    return buf.getvalue()