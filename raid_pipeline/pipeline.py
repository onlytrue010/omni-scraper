"""
RAID Pipeline — Master Orchestrator

Flow per domain:
  1. Collect human documents (scrape)
  2. Write human rows (label=0)
  3. For each doc × model × decoding strategy:
       a. Build prompt
       b. Generate AI text
       c. Validate word bounds
       d. Apply all adversarial attacks
       e. Write AI rows (label=1)
  4. Checkpoint after each doc

Resume: Restart with the same command — already-processed docs are skipped.
"""

from __future__ import annotations

import argparse
import os
import sys
import time
from pathlib import Path

# ── Make sure project root is on path ─────────────────────────────────────────
sys.path.insert(0, str(Path(__file__).parent))
sys.path.insert(0, str(Path(__file__).parent / "collect"))
sys.path.insert(0, str(Path(__file__).parent / "generate"))
sys.path.insert(0, str(Path(__file__).parent / "attacks"))

from config import (
    DOMAINS, DECODING_STRATEGIES, ADVERSARIAL_ATTACKS,
    GROQ_MODELS, GEMINI_MODELS, OLLAMA_MODELS,
    OUTPUT_DIR, CHECKPOINT_DIR,
)
from schema import DatasetWriter, DatasetRow, Checkpoint
from collect.collector import collect_domain
from generate.prompts import build_prompt, get_prompt_string
from generate.models import ModelRouter
from attacks.adversarial import apply_attack


# ── Active model list ─────────────────────────────────────────────────────────

def get_active_models() -> list[dict]:
    """Return all models where enabled=True."""
    active = []
    for m in GROQ_MODELS:
        if m["enabled"]:
            active.append(m)
    for m in GEMINI_MODELS:
        if m["enabled"]:
            active.append(m)
    for m in OLLAMA_MODELS:
        if m["enabled"]:
            active.append(m)
    return active


# ── Stats tracker ─────────────────────────────────────────────────────────────

class Stats:
    def __init__(self):
        self.human_written   = 0
        self.ai_generated    = 0
        self.ai_failed       = 0
        self.ai_out_of_bounds = 0
        self.attacked        = 0
        self.start_time      = time.monotonic()

    def report(self) -> str:
        elapsed = time.monotonic() - self.start_time
        rate    = (self.human_written + self.ai_generated) / max(1, elapsed) * 60
        return (
            f"\n{'─'*60}\n"
            f"  Human rows:      {self.human_written:>8,}\n"
            f"  AI rows:         {self.ai_generated:>8,}\n"
            f"  AI failed:       {self.ai_failed:>8,}\n"
            f"  Out of bounds:   {self.ai_out_of_bounds:>8,}\n"
            f"  Attacked rows:   {self.attacked:>8,}\n"
            f"  Rows/min:        {rate:>8.1f}\n"
            f"  Elapsed:         {elapsed/60:>7.1f} min\n"
            f"{'─'*60}"
        )


# ── Main pipeline ─────────────────────────────────────────────────────────────

def run_pipeline(
    domains:     list[str] | None = None,
    limit:       int = 2000,
    attacks:     list[str] | None = None,
    output_file: str = "raid_dataset.jsonl",
    dry_run:     bool = False,
):
    """
    Run the full pipeline.

    Args:
        domains:     list of domain names to process (None = all)
        limit:       max human docs per domain
        attacks:     list of attacks to apply (None = all ADVERSARIAL_ATTACKS)
        output_file: filename inside OUTPUT_DIR
        dry_run:     collect and validate human text only, skip AI generation
    """
    Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)
    Path(CHECKPOINT_DIR).mkdir(parents=True, exist_ok=True)

    active_models   = get_active_models()
    active_attacks  = attacks or ADVERSARIAL_ATTACKS
    active_domains  = [d for d in DOMAINS if domains is None or d["name"] in (domains or [])]

    if not active_models and not dry_run:
        print("[pipeline] ERROR: No models enabled. Check config.py and API keys.")
        return

    print(f"\n{'='*60}")
    print(f"  RAID Dataset Pipeline")
    print(f"{'='*60}")
    print(f"  Domains:   {[d['name'] for d in active_domains]}")
    print(f"  Models:    {[m['name'] for m in active_models]}")
    print(f"  Strategies:{[s['name'] for s in DECODING_STRATEGIES]}")
    print(f"  Attacks:   {active_attacks}")
    print(f"  Doc limit: {limit} per domain")
    print(f"  Dry run:   {dry_run}")
    print(f"  Output:    {OUTPUT_DIR}/{output_file}")
    print(f"{'='*60}\n")

    writer   = DatasetWriter(f"{OUTPUT_DIR}/{output_file}")
    router   = ModelRouter()
    stats    = Stats()

    for domain_cfg in active_domains:
        domain_name = domain_cfg["name"]
        source      = domain_cfg["source"]
        description = domain_cfg["description"]

        checkpoint = Checkpoint(CHECKPOINT_DIR, f"{domain_name}")

        print(f"\n[pipeline] ── Domain: {domain_name} ──────────────────")
        print(f"[pipeline] Scraping {limit} documents from {source}...")

        doc_count = 0

        for doc in collect_domain(source, limit):
            if doc_count >= limit:
                break

            # Skip already-processed docs (resume support)
            if checkpoint.is_done(doc.id):
                continue

            doc_count += 1

            # ── 1. Write human row ────────────────────────────────────────────
            human_row = DatasetRow.human_row(doc)
            if writer.write(human_row):
                stats.human_written += 1

            if dry_run:
                checkpoint.mark_done(doc.id)
                continue

            # ── 2. Generate AI text for each model × decoding strategy ────────
            for model_cfg in active_models:
                for decoding in DECODING_STRATEGIES:

                    system_prompt, user_prompt = build_prompt(
                        domain     = domain_name,
                        title      = doc.title,
                        text       = doc.human_text,
                        word_count = doc.word_count,
                        chat_mode  = True,
                    )

                    prompt_log = get_prompt_string(
                        domain_name, doc.title, doc.human_text, doc.word_count
                    )

                    ai_text, gen_ms = router.generate(
                        provider           = model_cfg["provider"],
                        model_id           = model_cfg["model_id"],
                        system_prompt      = system_prompt,
                        user_prompt        = user_prompt,
                        temperature        = decoding["temperature"],
                        repetition_penalty = decoding["repetition_penalty"],
                    )

                    if ai_text is None:
                        stats.ai_failed += 1
                        print(
                            f"[pipeline] FAIL {model_cfg['name']} "
                            f"{decoding['name']} on {doc.id[:8]}"
                        )
                        continue

                    # ── Word count validation BEFORE applying attacks ──────────
                    # Reject if AI output is outside ±15% of human word count.
                    # Done here so we don't waste time on 12 attack variants
                    # of text that will be discarded anyway.
                    from schema import word_count as _wc, enforce_bounds as _eb
                    raw_clean = _eb(ai_text)
                    if raw_clean is None:
                        stats.ai_out_of_bounds += 1
                        continue
                    ai_wc    = _wc(raw_clean)
                    human_wc = doc.word_count
                    if not (human_wc * 0.85 <= ai_wc <= human_wc * 1.15):
                        stats.ai_out_of_bounds += 1
                        print(
                            f"[pipeline] BOUNDS {model_cfg['name']} "
                            f"{decoding['name']} on {doc.id[:8]} "
                            f"(human={human_wc} ai={ai_wc} "
                            f"allowed={int(human_wc*0.85)}-{int(human_wc*1.15)})"
                        )
                        continue

                    # ── 3. Apply all adversarial attacks ──────────────────────
                    for attack_name in active_attacks:

                        attacked_text = apply_attack(ai_text, attack_name)

                        ai_row = DatasetRow.ai_row(
                            doc     = doc,
                            ai_text = attacked_text,
                            model   = model_cfg["name"],
                            provider= model_cfg["provider"],
                            decoding= decoding,
                            prompt  = prompt_log,
                            attack  = attack_name,
                            gen_ms  = gen_ms,
                        )

                        if ai_row is None:
                            stats.ai_out_of_bounds += 1
                        else:
                            if writer.write(ai_row):
                                if attack_name == "none":
                                    stats.ai_generated += 1
                                else:
                                    stats.attacked += 1

            # Mark doc fully processed
            checkpoint.mark_done(doc.id)

            # Progress log every 10 docs
            if doc_count % 10 == 0:
                print(
                    f"[pipeline] {domain_name}: {doc_count}/{limit} docs | "
                    f"rows: {writer.written:,} | "
                    f"failed: {stats.ai_failed}"
                )

        print(f"[pipeline] {domain_name}: done — {doc_count} docs processed")

    print(stats.report())
    print(f"\n[pipeline] Dataset written to: {OUTPUT_DIR}/{output_file}")
    print(f"[pipeline] Total rows: {writer.written:,}")
    print(f"[pipeline] {writer.stats()}")


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="RAID-aligned AI vs Human text dataset pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Full pipeline — all domains, all models, all attacks
  python pipeline.py

  # Dry run — collect and validate human text only (no API calls)
  python pipeline.py --dry-run

  # Specific domains only
  python pipeline.py --domains wikipedia news reddit

  # Small test run — 10 docs per domain, no attacks
  python pipeline.py --limit 10 --attacks none

  # Only clean generations (no adversarial attacks)
  python pipeline.py --attacks none

  # Custom output file
  python pipeline.py --output my_dataset.jsonl
        """,
    )
    parser.add_argument(
        "--domains", nargs="+",
        choices=[d["name"] for d in DOMAINS],
        default=None,
        help="Domains to process (default: all)",
    )
    parser.add_argument(
        "--limit", type=int, default=2000,
        help="Max human documents per domain (default: 2000)",
    )
    parser.add_argument(
        "--attacks", nargs="+",
        choices=ADVERSARIAL_ATTACKS,
        default=None,
        help="Adversarial attacks to apply (default: all). Use 'none' for clean only.",
    )
    parser.add_argument(
        "--output", default="raid_dataset.jsonl",
        help="Output filename inside dataset_output/ (default: raid_dataset.jsonl)",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Collect and validate human text only — no AI generation",
    )

    args = parser.parse_args()

    run_pipeline(
        domains    = args.domains,
        limit      = args.limit,
        attacks    = args.attacks,
        output_file= args.output,
        dry_run    = args.dry_run,
    )


if __name__ == "__main__":
    main()