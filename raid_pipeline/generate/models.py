"""
RAID Pipeline — Model Clients
Unified interface for Groq, Gemini (optional), and Ollama.
All return plain text. All respect rate limits.
"""

from __future__ import annotations

import os
import time
from typing import Optional

import httpx

from config import (
    GROQ_RPM, GEMINI_RPM, OLLAMA_RPM,
    RETRY_ATTEMPTS, RETRY_DELAY_S,
)


# ── Base client ───────────────────────────────────────────────────────────────

class RateLimiter:
    """Simple token-bucket rate limiter."""

    def __init__(self, rpm: int):
        self._interval = 60.0 / rpm
        self._last     = 0.0

    def wait(self) -> None:
        elapsed = time.monotonic() - self._last
        gap     = self._interval - elapsed
        if gap > 0:
            time.sleep(gap)
        self._last = time.monotonic()


# ── Groq client ───────────────────────────────────────────────────────────────

class GroqClient:
    """
    Groq API — free tier, extremely fast inference.
    Set GROQ_API_KEY environment variable.
    Docs: https://console.groq.com/docs/openai
    """

    BASE_URL = "https://api.groq.com/openai/v1/chat/completions"

    def __init__(self):
        self._key     = os.getenv("GROQ_API_KEY", "")
        self._limiter = RateLimiter(GROQ_RPM)

        if not self._key:
            print("[groq] WARNING: GROQ_API_KEY not set. Groq calls will fail.")

    def generate(
        self,
        model_id:           str,
        system_prompt:      str,
        user_prompt:        str,
        temperature:        float = 1.0,
        repetition_penalty: float = 1.0,
        max_tokens:         int   = 1024,
    ) -> Optional[str]:
        """
        Generate text. Returns the assistant message content, or None on failure.
        Respects rate limit and retries on 429.
        Note: Groq doesn't support repetition_penalty directly — we log it for
        schema completeness but don't send it (it has no effect on API models).
        """
        if not self._key:
            return None

        payload = {
            "model":       model_id,
            "temperature": max(0.001, temperature),   # Groq requires > 0
            "max_tokens":  max_tokens,
            "messages": [
                {"role": "system",    "content": system_prompt},
                {"role": "user",      "content": user_prompt},
            ],
        }

        for attempt in range(RETRY_ATTEMPTS):
            self._limiter.wait()
            try:
                with httpx.Client(timeout=60) as client:
                    r = client.post(
                        self.BASE_URL,
                        headers={
                            "Authorization": f"Bearer {self._key}",
                            "Content-Type":  "application/json",
                        },
                        json=payload,
                    )

                if r.status_code == 429:
                    wait = RETRY_DELAY_S * (attempt + 1)
                    print(f"[groq] 429 rate limited — waiting {wait}s")
                    time.sleep(wait)
                    continue

                r.raise_for_status()
                data = r.json()
                return data["choices"][0]["message"]["content"].strip()

            except Exception as e:
                print(f"[groq] attempt {attempt+1} failed: {e}")
                time.sleep(RETRY_DELAY_S)

        return None


# ── Gemini client (optional) ──────────────────────────────────────────────────

class GeminiClient:
    """
    Google Gemini API — optional, enable in config.py when ready.
    Set GEMINI_API_KEY environment variable.
    Very cheap: ~$0.075/1M tokens for Flash.
    Docs: https://ai.google.dev/api
    """

    BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

    def __init__(self):
        self._key     = os.getenv("GEMINI_API_KEY", "")
        self._limiter = RateLimiter(GEMINI_RPM)

        if not self._key:
            print("[gemini] WARNING: GEMINI_API_KEY not set. Gemini calls will fail.")

    def generate(
        self,
        model_id:           str,
        system_prompt:      str,
        user_prompt:        str,
        temperature:        float = 1.0,
        repetition_penalty: float = 1.0,
        max_tokens:         int   = 1024,
    ) -> Optional[str]:
        if not self._key:
            return None

        url = self.BASE_URL.format(model=model_id)

        payload = {
            "systemInstruction": {"parts": [{"text": system_prompt}]},
            "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
            "generationConfig": {
                "temperature":     temperature,
                "maxOutputTokens": max_tokens,
            },
        }

        for attempt in range(RETRY_ATTEMPTS):
            self._limiter.wait()
            try:
                with httpx.Client(timeout=60) as client:
                    r = client.post(
                        url,
                        params={"key": self._key},
                        headers={"Content-Type": "application/json"},
                        json=payload,
                    )

                if r.status_code == 429:
                    wait = RETRY_DELAY_S * (attempt + 1)
                    print(f"[gemini] 429 rate limited — waiting {wait}s")
                    time.sleep(wait)
                    continue

                r.raise_for_status()
                data = r.json()
                candidates = data.get("candidates", [])
                if not candidates:
                    return None
                parts = candidates[0].get("content", {}).get("parts", [])
                return "".join(p.get("text", "") for p in parts).strip()

            except Exception as e:
                print(f"[gemini] attempt {attempt+1} failed: {e}")
                time.sleep(RETRY_DELAY_S)

        return None


# ── Ollama client (local) ─────────────────────────────────────────────────────

class OllamaClient:
    """
    Ollama — local LLM inference, fully free, no API key needed.
    Install: https://ollama.ai
    Pull models: ollama pull mistral / ollama pull llama3

    Supports repetition_penalty directly via the 'repeat_penalty' parameter.
    This is the only client where all 4 RAID decoding strategies are exact.
    """

    BASE_URL = "http://localhost:11434/api/chat"

    def __init__(self):
        self._limiter = RateLimiter(OLLAMA_RPM)

    def _is_running(self) -> bool:
        try:
            with httpx.Client(timeout=3) as c:
                c.get("http://localhost:11434/api/tags")
            return True
        except Exception:
            return False

    def generate(
        self,
        model_id:           str,
        system_prompt:      str,
        user_prompt:        str,
        temperature:        float = 1.0,
        repetition_penalty: float = 1.0,
        max_tokens:         int   = 1024,
    ) -> Optional[str]:
        if not self._is_running():
            print("[ollama] Server not running. Start with: ollama serve")
            return None

        payload = {
            "model":  model_id,
            "stream": False,
            "options": {
                "temperature":    temperature,
                "repeat_penalty": repetition_penalty,   # exact RAID parameter
                "num_predict":    max_tokens,
            },
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_prompt},
            ],
        }

        for attempt in range(RETRY_ATTEMPTS):
            self._limiter.wait()
            try:
                with httpx.Client(timeout=120) as client:
                    r = client.post(self.BASE_URL, json=payload)
                r.raise_for_status()
                data = r.json()
                return data["message"]["content"].strip()
            except Exception as e:
                print(f"[ollama] attempt {attempt+1} failed: {e}")
                time.sleep(2)

        return None


# ── Unified generator ─────────────────────────────────────────────────────────

class ModelRouter:
    """
    Routes generation requests to the correct client based on provider name.
    Single instance reused across all calls (connection pooling).
    """

    def __init__(self):
        self._groq   = GroqClient()
        self._gemini = GeminiClient()
        self._ollama = OllamaClient()

    def generate(
        self,
        provider:           str,
        model_id:           str,
        system_prompt:      str,
        user_prompt:        str,
        temperature:        float = 1.0,
        repetition_penalty: float = 1.0,
        max_tokens:         int   = 900,
    ) -> tuple[Optional[str], int]:
        """
        Returns (generated_text, latency_ms).
        generated_text is None if generation failed.
        max_tokens set to 900 to stay within WORD_MAX (512 words ≈ 700 tokens).
        """
        t0 = time.monotonic()

        if provider == "groq":
            text = self._groq.generate(
                model_id, system_prompt, user_prompt,
                temperature, repetition_penalty, max_tokens,
            )
        elif provider == "gemini":
            text = self._gemini.generate(
                model_id, system_prompt, user_prompt,
                temperature, repetition_penalty, max_tokens,
            )
        elif provider == "ollama":
            text = self._ollama.generate(
                model_id, system_prompt, user_prompt,
                temperature, repetition_penalty, max_tokens,
            )
        else:
            raise ValueError(f"Unknown provider: {provider}")

        latency_ms = int((time.monotonic() - t0) * 1000)
        return text, latency_ms