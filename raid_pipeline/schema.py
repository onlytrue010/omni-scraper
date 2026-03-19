"""
RAID Pipeline — Schema & I/O
Defines the exact data model for every row in the dataset.
Enforces word count bounds. Writes RAID-compatible JSONL.
"""

from __future__ import annotations

import hashlib
import json
import re
import time
import uuid
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Optional

from config import WORD_MIN, WORD_MAX


# ── Word count utilities ───────────────────────────────────────────────────────

def word_count(text: str) -> int:
    return len(text.split())


def truncate_to_word_limit(text: str, max_words: int = WORD_MAX) -> str:
    """
    Truncate text to max_words, cutting at the nearest sentence boundary.
    Never cuts mid-sentence — always ends on a complete sentence.
    """
    words = text.split()
    if len(words) <= max_words:
        return text

    # Take first max_words words, then find last sentence boundary
    candidate = " ".join(words[:max_words])

    # Try to cut at sentence end (.  !  ?)
    sentence_end = max(
        candidate.rfind(". "),
        candidate.rfind("! "),
        candidate.rfind("? "),
        candidate.rfind(".\n"),
    )

    if sentence_end > len(candidate) * 0.5:
        # Found a sentence boundary in the second half — cut there cleanly
        return candidate[: sentence_end + 1].strip()

    # No good boundary found — just cut at word boundary
    return candidate.strip()


def is_within_bounds(text: str) -> bool:
    wc = word_count(text)
    return WORD_MIN <= wc <= WORD_MAX


def enforce_bounds(text: str) -> Optional[str]:
    """
    Return text if within bounds, truncated text if over, None if under.
    """
    text = text.strip()
    wc = word_count(text)

    if wc < WORD_MIN:
        return None   # too short — discard

    if wc > WORD_MAX:
        text = truncate_to_word_limit(text, WORD_MAX)
        if word_count(text) < WORD_MIN:
            return None
        return text

    return text


# ── Core data model ────────────────────────────────────────────────────────────

@dataclass
class HumanDocument:
    """A single human-written document after collection and validation."""
    id:          str            # stable UUID based on content hash
    domain:      str            # e.g. "wikipedia", "news", "reddit"
    source_url:  str            # where it was scraped from
    title:       str            # title/headline — used in AI prompt
    human_text:  str            # clean body text within [WORD_MIN, WORD_MAX]
    word_count:  int
    scraped_at:  str            # ISO timestamp

    @classmethod
    def create(cls, domain: str, source_url: str, title: str, text: str) -> Optional["HumanDocument"]:
        """
        Validate and construct. Returns None if text fails word-count bounds.
        """
        clean = enforce_bounds(text)
        if clean is None:
            return None

        content_hash = hashlib.sha256(clean.encode()).hexdigest()[:16]
        return cls(
            id          = content_hash,
            domain      = domain,
            source_url  = source_url,
            title       = title.strip()[:200],
            human_text  = clean,
            word_count  = word_count(clean),
            scraped_at  = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        )

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class DatasetRow:
    """
    One complete row in the final dataset.
    Follows RAID's schema exactly, extended with provenance fields.
    label: 0 = human, 1 = AI
    """
    # ── Identity ──────────────────────────────────────────────────────────────
    id:                  str    # unique row ID

    # ── Source ────────────────────────────────────────────────────────────────
    domain:              str    # "wikipedia" | "news" | "reddit" | ...
    source_url:          str
    scraped_at:          str

    # ── Human side ────────────────────────────────────────────────────────────
    human_id:            str    # links back to HumanDocument.id
    title:               str
    human_text:          str
    human_word_count:    int
    label:               int    # 0 = human-written

    # ── AI side (None for human rows) ─────────────────────────────────────────
    ai_text:             Optional[str]   = None
    ai_word_count:       Optional[int]   = None
    model:               Optional[str]   = None   # e.g. "llama-3.1-70b"
    provider:            Optional[str]   = None   # "groq" | "ollama" | "gemini"
    decoding_strategy:   Optional[str]   = None   # "greedy" | "sampling" | ...
    temperature:         Optional[float] = None
    repetition_penalty:  Optional[float] = None
    prompt_used:         Optional[str]   = None   # exact prompt sent
    generation_ms:       Optional[int]   = None   # latency

    # ── Adversarial ───────────────────────────────────────────────────────────
    attack:              str = "none"   # attack applied to ai_text

    # ── Quality flags ─────────────────────────────────────────────────────────
    within_word_bounds:  bool = True
    passed_quality:      bool = True

    def to_dict(self) -> dict:
        return {k: v for k, v in asdict(self).items()}

    @classmethod
    def human_row(cls, doc: HumanDocument) -> "DatasetRow":
        """Create the human-written (label=0) row for a document."""
        return cls(
            id               = f"h_{doc.id}",
            domain           = doc.domain,
            source_url       = doc.source_url,
            scraped_at       = doc.scraped_at,
            human_id         = doc.id,
            title            = doc.title,
            human_text       = doc.human_text,
            human_word_count = doc.word_count,
            label            = 0,
        )

    @classmethod
    def ai_row(
        cls,
        doc:       HumanDocument,
        ai_text:   str,
        model:     str,
        provider:  str,
        decoding:  dict,
        prompt:    str,
        attack:    str = "none",
        gen_ms:    int = 0,
    ) -> Optional["DatasetRow"]:
        """Create an AI-generated (label=1) row. Returns None if ai_text fails bounds."""
        clean = enforce_bounds(ai_text)
        if clean is None:
            return None

        row_id = hashlib.sha256(
            f"{doc.id}_{model}_{decoding['name']}_{attack}".encode()
        ).hexdigest()[:20]

        return cls(
            id                 = f"a_{row_id}",
            domain             = doc.domain,
            source_url         = doc.source_url,
            scraped_at         = doc.scraped_at,
            human_id           = doc.id,
            title              = doc.title,
            human_text         = doc.human_text,
            human_word_count   = doc.word_count,
            label              = 1,
            ai_text            = clean,
            ai_word_count      = word_count(clean),
            model              = model,
            provider           = provider,
            decoding_strategy  = decoding["name"],
            temperature        = decoding["temperature"],
            repetition_penalty = decoding["repetition_penalty"],
            prompt_used        = prompt,
            generation_ms      = gen_ms,
            attack             = attack,
        )


# ── JSONL writer ──────────────────────────────────────────────────────────────

class DatasetWriter:
    """
    Thread-safe JSONL writer with deduplication by row ID.
    Appends to file — safe to resume after interruption.
    """

    def __init__(self, output_path: str):
        self.path    = Path(output_path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._seen: set[str] = set()
        self._written = 0
        self._discarded = 0
        self._load_seen_ids()

    def _load_seen_ids(self) -> None:
        if not self.path.exists():
            return
        with self.path.open("r", encoding="utf-8") as f:
            for line in f:
                try:
                    row = json.loads(line)
                    self._seen.add(row["id"])
                    self._written += 1
                except Exception:
                    pass
        if self._seen:
            print(f"[writer] Resuming — {self._written} rows already in {self.path.name}")

    def write(self, row: DatasetRow) -> bool:
        """Write row. Returns True if written, False if duplicate."""
        if row.id in self._seen:
            return False
        self._seen.add(row.id)
        with self.path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(row.to_dict(), ensure_ascii=False) + "\n")
        self._written += 1
        return True

    def discard(self) -> None:
        self._discarded += 1

    @property
    def written(self) -> int:
        return self._written

    @property
    def discarded(self) -> int:
        return self._discarded

    def stats(self) -> str:
        total = self._written + self._discarded
        return (
            f"Written: {self._written:,}  "
            f"Discarded: {self._discarded:,}  "
            f"Total attempted: {total:,}"
        )


# ── Checkpoint (resume support) ───────────────────────────────────────────────

class Checkpoint:
    """
    Tracks which human document IDs have been fully processed (all models × strategies × attacks).
    Lets the pipeline resume from where it left off after a crash.
    """

    def __init__(self, checkpoint_dir: str, name: str):
        self.path = Path(checkpoint_dir) / f"{name}.json"
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._done: set[str] = set()
        self._load()

    def _load(self) -> None:
        if self.path.exists():
            try:
                data = json.loads(self.path.read_text())
                self._done = set(data.get("done", []))
                if self._done:
                    print(f"[checkpoint] {len(self._done)} docs already processed")
            except Exception:
                pass

    def _save(self) -> None:
        self.path.write_text(json.dumps({"done": list(self._done)}, indent=2))

    def is_done(self, doc_id: str) -> bool:
        return doc_id in self._done

    def mark_done(self, doc_id: str) -> None:
        self._done.add(doc_id)
        self._save()

    @property
    def count(self) -> int:
        return len(self._done)