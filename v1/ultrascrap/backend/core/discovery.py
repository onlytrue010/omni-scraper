"""
UltraScrap — URL Discovery
Converts natural language targets into URL lists.
Pure heuristic logic, no LLM required.
"""

from __future__ import annotations

import re
from urllib.parse import quote_plus, urlparse, urljoin
import httpx
from bs4 import BeautifulSoup


class URLDiscovery:

    WIKIPEDIA_PATTERNS = [
        r"wikipedia\.org",
        r"^wiki[:/]",
        r"wikipedia",
    ]

    @classmethod
    async def resolve(cls, target: str, limit: int = 50) -> list[str]:
        # Strip surrounding quotes users accidentally include e.g. "https://..."
        target = target.strip().strip('"').strip("'").strip()

        # Full URL
        if re.match(r"^https?://", target):
            # Wikipedia article URL → use search API to get related articles
            if "wikipedia.org/wiki/" in target:
                slug = target.split("/wiki/")[-1].split("#")[0]
                query = slug.replace("_", " ")
                return await cls._wikipedia_urls(query, limit)
            # Any other URL → seed crawl for internal links
            return await cls._crawl_seed(target, limit)

        # Wikipedia shorthand e.g. "wikipedia python" or "wiki: machine learning"
        if any(re.search(p, target, re.I) for p in cls.WIKIPEDIA_PATTERNS):
            query = re.sub(r"wikipedia[:/]?\s*", "", target, flags=re.I).strip()
            return await cls._wikipedia_urls(query, limit)

        # Bare domain e.g. "github.com"
        if re.match(r"^[\w\-]+\.(com|org|net|io|co|gov|edu)", target):
            return await cls._crawl_seed(f"https://{target}", limit)

        # Natural language
        return await cls._natural_language_resolve(target, limit)

    @classmethod
    async def _crawl_seed(cls, url: str, limit: int) -> list[str]:
        """Crawl seed URL and collect internal links."""
        urls = [url]
        try:
            async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
                r = await client.get(url, headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                })
                soup = BeautifulSoup(r.text, "lxml")
                base = urlparse(url)
                for a in soup.find_all("a", href=True):
                    href = a["href"].strip()
                    if href.startswith(("#", "javascript:", "mailto:", "tel:")):
                        continue
                    full = urljoin(url, href)
                    parsed = urlparse(full)
                    if parsed.netloc == base.netloc and full not in urls:
                        urls.append(full)
                    if len(urls) >= limit:
                        break
        except Exception as e:
            print(f"[discovery] crawl error: {e}")
        return urls[:limit]

    @classmethod
    async def _wikipedia_urls(cls, query: str, limit: int) -> list[str]:
        """Search Wikipedia API and return article URLs."""
        urls = []
        try:
            search_url = (
                f"https://en.wikipedia.org/w/api.php"
                f"?action=opensearch&search={quote_plus(query)}"
                f"&limit={min(limit, 50)}&format=json"
            )
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.get(search_url, headers={
                    "User-Agent": "UltraScrap/1.0"
                })
                data = r.json()
                # opensearch returns [query, titles, descriptions, urls]
                if len(data) >= 4:
                    urls = list(data[3])
        except Exception as e:
            print(f"[discovery] wikipedia error: {e}")

        if not urls:
            # Fallback: direct article URL
            slug = query.replace(" ", "_")
            urls = [f"https://en.wikipedia.org/wiki/{slug}"]

        return urls[:limit]

    @classmethod
    async def _natural_language_resolve(cls, target: str, limit: int) -> list[str]:
        t = target.lower()

        if "github" in t:
            q = re.sub(r"github\s*:?\s*", "", t).strip()
            return [f"https://github.com/search?q={quote_plus(q)}&type=repositories"]

        if "pypi" in t or "python package" in t:
            q = re.sub(r"(pypi|python package[s]?)\s*:?\s*", "", t).strip()
            return [f"https://pypi.org/search/?q={quote_plus(q)}"]

        if "npm" in t or "node package" in t:
            q = re.sub(r"(npm|node package[s]?)\s*:?\s*", "", t).strip()
            return [f"https://www.npmjs.com/search?q={quote_plus(q)}"]

        if "reddit" in t:
            q = re.sub(r"reddit\s*:?\s*", "", t).strip()
            return [f"https://www.reddit.com/search/?q={quote_plus(q)}"]

        # Default: Wikipedia search
        return await cls._wikipedia_urls(target, limit)
