"""
RAID Pipeline — Configuration
All tunable parameters in one place. Edit here, nothing else needs changing.
"""

from __future__ import annotations

# ── Word count bounds ──────────────────────────────────────────────────────────
# Applied to BOTH human and AI text after collection/generation.
# Rows outside these bounds are discarded — no training-time handling needed.

WORD_MIN = 150    # shorter than this = too little signal for a detector
WORD_MAX = 512    # longer than this = truncated to sentence boundary within limit

# ── Domains ───────────────────────────────────────────────────────────────────
# Each entry defines:
#   name         — identifier used in output schema
#   source       — where we scrape human text from
#   scrape_limit — how many documents to collect per run
#   description  — fed to the AI prompt so it knows the genre

DOMAINS = [
    {
        "name":        "wikipedia",
        "source":      "wikipedia",
        "scrape_limit": 2000,
        "description": "a Wikipedia encyclopaedia article section",
    },
    {
        "name":        "news",
        "source":      "news",
        "scrape_limit": 2000,
        "description": "a news article",
    },
    {
        "name":        "reddit",
        "source":      "reddit",
        "scrape_limit": 2000,
        "description": "a Reddit post",
    },
    {
        "name":        "abstracts",
        "source":      "arxiv",
        "scrape_limit": 2000,
        "description": "an academic paper abstract",
    },
    {
        "name":        "recipes",
        "source":      "recipes",
        "scrape_limit": 2000,
        "description": "a cooking recipe",
    },
    {
        "name":        "reviews",
        "source":      "reviews",
        "scrape_limit": 2000,
        "description": "a movie or product review",
    },
    {
        "name":        "books",
        "source":      "books",
        "scrape_limit": 2000,
        "description": "a passage from a book or novel",
    },
    {
        "name":        "poetry",
        "source":      "poetry",
        "scrape_limit": 2000,
        "description": "a poem",
    },
]

# ── Human text sources (URLs scraped per domain) ───────────────────────────────
SOURCE_URLS = {
    "wikipedia": [
        "https://en.wikipedia.org/wiki/Special:Random",
    ],
    "news": [
        "https://feeds.bbci.co.uk/news/rss.xml",
        "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml",
        "https://feeds.reuters.com/reuters/topNews",
    ],
    "reddit": [
        "https://www.reddit.com/r/todayilearned/top/.json?limit=100&t=year",
        "https://www.reddit.com/r/explainlikeimfive/top/.json?limit=100&t=year",
        "https://www.reddit.com/r/science/top/.json?limit=100&t=year",
        "https://www.reddit.com/r/worldnews/top/.json?limit=100&t=year",
        "https://www.reddit.com/r/history/top/.json?limit=100&t=year",
    ],
    "arxiv": [
        "https://export.arxiv.org/api/query?search_query=all:machine+learning&max_results=200&sortBy=submittedDate&sortOrder=descending",
        "https://export.arxiv.org/api/query?search_query=all:natural+language+processing&max_results=200&sortBy=submittedDate&sortOrder=descending",
        "https://export.arxiv.org/api/query?search_query=all:computer+vision&max_results=200&sortBy=submittedDate&sortOrder=descending",
    ],
    "recipes": [
        "https://www.allrecipes.com/recipes/",
        "https://www.epicurious.com/recipes-menus",
    ],
    "reviews": [
        "https://www.imdb.com/chart/top/",
    ],
    "books": [
        "https://www.gutenberg.org/browse/scores/top",
    ],
    "poetry": [
        "https://www.poetryfoundation.org/poems/browse#page=1&sort_by=recently_added",
        "https://poets.org/poems",
    ],
}

# ── Decoding strategies (RAID-exact) ──────────────────────────────────────────
# Applied only to local/open-source models (Ollama).
# For API models (Groq), temperature is controlled but rep_penalty may not apply.

DECODING_STRATEGIES = [
    {
        "name":              "greedy",
        "temperature":       0.0,
        "repetition_penalty": 1.0,    # no penalty
        "description":       "greedy decoding (T=0, no repetition penalty)",
    },
    {
        "name":              "sampling",
        "temperature":       1.0,
        "repetition_penalty": 1.0,
        "description":       "random sampling (T=1, no repetition penalty)",
    },
    {
        "name":              "greedy_penalty",
        "temperature":       0.0,
        "repetition_penalty": 1.2,    # RAID uses θ=1.2
        "description":       "greedy decoding with repetition penalty (T=0, θ=1.2)",
    },
    {
        "name":              "sampling_penalty",
        "temperature":       1.0,
        "repetition_penalty": 1.2,
        "description":       "random sampling with repetition penalty (T=1, θ=1.2)",
    },
]

# ── Models ────────────────────────────────────────────────────────────────────

# Groq — free tier, very fast, no credit card required for basic use
# Sign up at console.groq.com and set GROQ_API_KEY env var
GROQ_MODELS = [
    {
        "name":     "llama-3.3-70b",
        "model_id": "llama-3.3-70b-versatile",   # current — primary model
        "provider": "groq",
        "enabled":  True,
    },
    {
        "name":     "llama-3.1-8b",
        "model_id": "llama-3.1-8b-instant",       # current — fast smaller model
        "provider": "groq",
        "enabled":  True,
    },
    {
        "name":     "mixtral-8x7b",
        "model_id": "mixtral-8x7b-32768",          # DEPRECATED Mar 2025 — returns 400
        "provider": "groq",
        "enabled":  False,
    },
    {
        "name":     "gemma-2-9b",
        "model_id": "gemma2-9b-it",                # DEPRECATED Aug 2025 — returns 400
        "provider": "groq",
        "enabled":  False,
    },
]

# Gemini Flash — optional, cheap (~$0.075/1M tokens)
# Set GEMINI_API_KEY env var. Leave enabled=False to skip for now.
GEMINI_MODELS = [
    {
        "name":     "gemini-flash-1.5",
        "model_id": "gemini-1.5-flash",
        "provider": "gemini",
        "enabled":  False,   # <-- set True when ready
    },
    {
        "name":     "gemini-flash-2.0",
        "model_id": "gemini-2.0-flash",
        "provider": "gemini",
        "enabled":  False,   # <-- set True when ready
    },
]

# Ollama — local, fully free, runs on your machine
# Install: https://ollama.ai — then: ollama pull mistral
OLLAMA_MODELS = [
    {
        "name":     "mistral-7b",
        "model_id": "mistral",
        "provider": "ollama",
        "enabled":  False,    # set False if not installed
    },
    {
        "name":     "llama3-8b",
        "model_id": "llama3",
        "provider": "ollama",
        "enabled":  False,   # set True if pulled
    },
]

# ── Adversarial attacks ───────────────────────────────────────────────────────
# All 11 from RAID + "none" (clean baseline)
ADVERSARIAL_ATTACKS = [
    "none",               # clean — always included
    "article_deletion",   # delete articles (a/an/the)
    "homoglyph",          # replace chars with Unicode lookalikes
    "number_swap",        # replace numbers with neighbours ±1
    "synonym_swap",      # replace ~20% words with synonyms
    "misspelling",        # introduce realistic spelling errors
    "whitespace",         # add random extra spaces between words
    "upper_lower",        # randomly toggle case of some chars
    "zero_width_space",   # insert invisible zero-width spaces
    "insert_paragraphs",  # insert AI-generated filler paragraphs
    "paraphrase",         # full paraphrase via another LLM call
    "alternative_spelling", # British↔American spelling variants
]

# ── Rate limiting ─────────────────────────────────────────────────────────────
GROQ_RPM       = 10    # requests per minute on free tier
GEMINI_RPM     = 60
OLLAMA_RPM     = 999   # local, no limit

# ── Output ────────────────────────────────────────────────────────────────────
OUTPUT_DIR     = "./dataset_output"
CHECKPOINT_DIR = "./checkpoints"     # resume from here if interrupted

# ── Groq rate limit handling ──────────────────────────────────────────────────
RETRY_ATTEMPTS = 5
RETRY_DELAY_S  = 10    # seconds between retries on 429