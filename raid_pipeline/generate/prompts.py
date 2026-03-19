"""
RAID Pipeline — Prompt Engineering
Domain-specific prompts for AI text generation.

Design principles (aligned with RAID + your requirements):
1. Zero-shot — no examples given (RAID standard)
2. Length anchor — instructs model to match original length exactly
3. Meaning preservation — explicitly forbids summary/compression
4. No meta-commentary — model must output ONLY the text, no preamble
5. Style naturalness — instructs model to write as a modern LLM would,
   not to mimic the human's exact quirks
6. Domain-appropriate voice — different register per domain

Two templates per domain:
  - CHAT template   → for instruction-tuned models (Llama, Mistral-Instruct, etc.)
  - NONCHAT template → for base/completion models (legacy, kept for compatibility)
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass
class PromptTemplate:
    system: str   # system prompt (for chat models)
    user:   str   # user turn (for chat models) / full prompt (for nonchat)


# ── Shared system instruction ─────────────────────────────────────────────────
# This is the critical part that solves the "summary / wrong length" problem.

_SYSTEM_BASE = """\
You are a skilled writer. Your task is to rewrite a given text in the natural \
style of a modern AI language model, while following these strict rules:

RULES — read carefully, break none of them:
1. LENGTH: Your output MUST contain approximately the same number of words as \
the original text. Count the words in the original. Match that count within ±15%.
2. MEANING: Preserve every key fact, argument, and piece of information from the \
original. Do not add new information. Do not omit information.
3. NO META-COMMENTARY: Begin your response immediately with the rewritten text. \
Do not write phrases like "Here is the rewritten version:" or "Certainly!" or \
"Sure, here's..." — output ONLY the rewritten text itself.
4. NO SUMMARY: This is a full rewrite, not a summary. The output must be as \
detailed as the input.
5. STYLE: Write in the clear, confident, well-structured style characteristic \
of modern AI language models. Use smooth transitions. Vary sentence structure. \
Avoid the specific phrasing and idiosyncrasies of the original author.
6. COMPLETENESS: End with a complete sentence. Do not cut off mid-sentence."""


# ── Domain-specific prompts ───────────────────────────────────────────────────

PROMPTS: dict[str, PromptTemplate] = {

    "wikipedia": PromptTemplate(
        system=_SYSTEM_BASE,
        user=(
            "Rewrite the following Wikipedia article section about \"{title}\".\n\n"
            "ORIGINAL TEXT ({word_count} words):\n"
            "{text}\n\n"
            "REWRITTEN VERSION (target: ~{word_count} words):"
        ),
    ),

    "news": PromptTemplate(
        system=_SYSTEM_BASE,
        user=(
            "Rewrite the following news article about \"{title}\" as it would be "
            "written by an AI assistant: factual, clear, journalistic in tone.\n\n"
            "ORIGINAL ARTICLE ({word_count} words):\n"
            "{text}\n\n"
            "REWRITTEN ARTICLE (target: ~{word_count} words):"
        ),
    ),

    "reddit": PromptTemplate(
        system=_SYSTEM_BASE,
        user=(
            "Rewrite the following Reddit post titled \"{title}\" in an AI writing "
            "style: informative, conversational, but more polished and structured "
            "than the original. Keep the same topic and all details.\n\n"
            "ORIGINAL POST ({word_count} words):\n"
            "{text}\n\n"
            "REWRITTEN POST (target: ~{word_count} words):"
        ),
    ),

    "abstracts": PromptTemplate(
        system=_SYSTEM_BASE,
        user=(
            "Rewrite the following academic paper abstract for the paper \"{title}\" "
            "in the precise, structured style of an AI-generated academic abstract. "
            "Preserve all technical terms, findings, and methodology details exactly.\n\n"
            "ORIGINAL ABSTRACT ({word_count} words):\n"
            "{text}\n\n"
            "REWRITTEN ABSTRACT (target: ~{word_count} words):"
        ),
    ),

    "recipes": PromptTemplate(
        system=_SYSTEM_BASE,
        user=(
            "Rewrite the following recipe for \"{title}\" in a clear, structured "
            "AI style. Keep every ingredient and every step. Do not omit, add, "
            "or alter any quantities, ingredients, or instructions.\n\n"
            "ORIGINAL RECIPE ({word_count} words):\n"
            "{text}\n\n"
            "REWRITTEN RECIPE (target: ~{word_count} words):"
        ),
    ),

    "reviews": PromptTemplate(
        system=_SYSTEM_BASE,
        user=(
            "Rewrite the following movie or product review about \"{title}\" in "
            "a well-structured, analytical AI writing style. Preserve the reviewer's "
            "opinion, all specific observations, and the overall sentiment.\n\n"
            "ORIGINAL REVIEW ({word_count} words):\n"
            "{text}\n\n"
            "REWRITTEN REVIEW (target: ~{word_count} words):"
        ),
    ),

    "books": PromptTemplate(
        system=_SYSTEM_BASE,
        user=(
            "Rewrite the following literary passage from \"{title}\" in a "
            "contemporary AI writing style: fluent, descriptive, and engaging, "
            "while preserving the scene, characters, events, and dialogue present "
            "in the original.\n\n"
            "ORIGINAL PASSAGE ({word_count} words):\n"
            "{text}\n\n"
            "REWRITTEN PASSAGE (target: ~{word_count} words):"
        ),
    ),

    "poetry": PromptTemplate(
        system=(
            _SYSTEM_BASE + "\n"
            "Additional rule for poetry: preserve the number of stanzas and "
            "approximate line count. Maintain the emotional register and imagery, "
            "but rewrite in a modern AI poetic style."
        ),
        user=(
            "Rewrite the following poem titled \"{title}\" in a modern AI poetic "
            "style. Keep the same themes, imagery, and emotional tone.\n\n"
            "ORIGINAL POEM ({word_count} words):\n"
            "{text}\n\n"
            "REWRITTEN POEM (target: ~{word_count} words):"
        ),
    ),
}

# Fallback for unknown domains
_DEFAULT_PROMPT = PromptTemplate(
    system=_SYSTEM_BASE,
    user=(
        "Rewrite the following text about \"{title}\" in a natural AI writing style "
        "while preserving all information and approximately matching the original length.\n\n"
        "ORIGINAL TEXT ({word_count} words):\n"
        "{text}\n\n"
        "REWRITTEN TEXT (target: ~{word_count} words):"
    ),
)


def build_prompt(
    domain:     str,
    title:      str,
    text:       str,
    word_count: int,
    chat_mode:  bool = True,
) -> tuple[str, str]:
    """
    Build (system_prompt, user_prompt) for a given domain and document.

    Args:
        domain:     one of the RAID domain names
        title:      document title (used in prompt)
        text:       human text to be rewritten
        word_count: word count of human text (used for length anchoring)
        chat_mode:  True for instruction-tuned models, False for base models

    Returns:
        (system_prompt, user_message) tuple ready for the chat API
    """
    template = PROMPTS.get(domain, _DEFAULT_PROMPT)

    user = template.user.format(
        title      = title,
        text       = text,
        word_count = word_count,
    )

    if chat_mode:
        return template.system, user
    else:
        # For completion/non-chat models: concatenate system + user
        combined = f"{template.system}\n\n{user}"
        return "", combined


def get_prompt_string(domain: str, title: str, text: str, word_count: int) -> str:
    """Return the full prompt as a single string (for logging/storage)."""
    system, user = build_prompt(domain, title, text, word_count)
    if system:
        return f"[SYSTEM]\n{system}\n\n[USER]\n{user}"
    return user