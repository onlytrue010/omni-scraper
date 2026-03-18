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

    # Domains where seed-crawling produces garbage (bot challenges, pagination junk)
    NO_CRAWL_DOMAINS = {
        "pypi.org", "www.pypi.org",
        "npmjs.com", "www.npmjs.com",
        "reddit.com", "www.reddit.com",
        "github.com", "www.github.com",
    }

    @classmethod
    async def resolve(cls, target: str, limit: int = 50) -> list[str]:
        target = target.strip().strip('"').strip("'").strip()

        # Full URL
        if re.match(r"^https?://", target):
            if "wikipedia.org/wiki/" in target:
                slug = target.split("/wiki/")[-1].split("#")[0]
                query = slug.replace("_", " ")
                return await cls._wikipedia_urls(query, limit)
            # Don't seed-crawl known problematic domains
            domain = urlparse(target).netloc.lstrip("www.")
            if domain in cls.NO_CRAWL_DOMAINS:
                return [target]
            return await cls._crawl_seed(target, limit)

        # Wikipedia shorthand
        if any(re.search(p, target, re.I) for p in cls.WIKIPEDIA_PATTERNS):
            query = re.sub(r"wikipedia[:/]?\s*", "", target, flags=re.I).strip()
            return await cls._wikipedia_urls(query, limit)

        # Bare domain
        if re.match(r"^[\w\-]+\.(com|org|net|io|co|gov|edu)", target):
            domain = target.split("/")[0].lstrip("www.")
            if domain in cls.NO_CRAWL_DOMAINS:
                return [f"https://{target}"]
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
                r = await client.get(search_url, headers={"User-Agent": "UltraScrap/1.0"})
                data = r.json()
                if len(data) >= 4:
                    urls = list(data[3])
        except Exception as e:
            print(f"[discovery] wikipedia error: {e}")

        if not urls:
            slug = query.replace(" ", "_")
            urls = [f"https://en.wikipedia.org/wiki/{slug}"]

        return urls[:limit]

    @classmethod
    async def _pypi_urls(cls, query: str, limit: int) -> list[str]:
        """
        Search PyPI JSON API and return individual package page URLs.
        Avoids the search results page which triggers Cloudflare challenges.
        """
        urls = []
        try:
            search_url = f"https://pypi.org/search/?q={quote_plus(query)}&format=json"
            async with httpx.AsyncClient(timeout=10) as client:
                # Try PyPI's Simple API first for exact match
                r = await client.get(
                    f"https://pypi.org/pypi/{quote_plus(query.strip())}/json",
                    headers={"User-Agent": "UltraScrap/1.0"},
                )
                if r.status_code == 200:
                    urls.append(f"https://pypi.org/project/{query.strip()}/")

            # Fall back: scrape the search results page for package links
            if not urls:
                async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
                    r = await client.get(
                        f"https://pypi.org/search/?q={quote_plus(query)}",
                        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"},
                    )
                    soup = BeautifulSoup(r.text, "lxml")
                    for a in soup.select('a[href^="/project/"]'):
                        href = a["href"].strip()
                        full = f"https://pypi.org{href}"
                        # Skip classifier/filter URLs
                        if "?c=" in full or full in urls:
                            continue
                        urls.append(full)
                        if len(urls) >= limit:
                            break
        except Exception as e:
            print(f"[discovery] pypi error: {e}")

        # Always include the search page itself as fallback
        if not urls:
            urls = [f"https://pypi.org/search/?q={quote_plus(query)}"]

        return urls[:limit]

    @classmethod
    async def _npm_urls(cls, query: str, limit: int) -> list[str]:
        """
        Use the npm registry search API to get package page URLs directly.
        Avoids the npmjs.com search page which has dynamic rendering issues.
        """
        urls = []
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.get(
                    f"https://registry.npmjs.org/-/v1/search?text={quote_plus(query)}&size={min(limit, 20)}",
                    headers={"User-Agent": "UltraScrap/1.0"},
                )
                if r.status_code == 200:
                    data = r.json()
                    for obj in data.get("objects", []):
                        name = obj.get("package", {}).get("name", "")
                        if name:
                            urls.append(f"https://www.npmjs.com/package/{name}")
        except Exception as e:
            print(f"[discovery] npm error: {e}")

        if not urls:
            urls = [f"https://www.npmjs.com/search?q={quote_plus(query)}"]

        return urls[:limit]

    @classmethod
    async def _natural_language_resolve(cls, target: str, limit: int) -> list[str]:
        t = target.lower()

        if "github" in t:
            q = re.sub(r"github\s*:?\s*", "", t).strip()
            return [f"https://github.com/search?q={quote_plus(q)}&type=repositories"]

        if "pypi" in t or "python package" in t:
            q = re.sub(r"(pypi|python package[s]?)\s*:?\s*", "", t).strip()
            return await cls._pypi_urls(q, limit)

        if "npm" in t or "node package" in t:
            q = re.sub(r"(npm|node package[s]?)\s*:?\s*", "", t).strip()
            return await cls._npm_urls(q, limit)

        if "reddit" in t:
            q = re.sub(r"reddit\s*:?\s*", "", t).strip()
            return [f"https://www.reddit.com/search/?q={quote_plus(q)}"]

        # Default: Wikipedia search
        return await cls._wikipedia_urls(target, limit)