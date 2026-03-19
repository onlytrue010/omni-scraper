"""
RAID Pipeline — Human Text Collector
Domain-specific scrapers for all 8 RAID domains.
Returns clean HumanDocument objects ready for generation.
"""

from __future__ import annotations

import re
import time
import xml.etree.ElementTree as ET
from typing import Iterator, Optional

import httpx
from bs4 import BeautifulSoup

from config import SOURCE_URLS, WORD_MIN, WORD_MAX
from schema import HumanDocument, word_count

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    )
}

_CLIENT_TIMEOUT = 20


def _get(url: str, as_json: bool = False, extra_headers: dict = None):
    headers = {**_HEADERS, **(extra_headers or {})}
    with httpx.Client(timeout=_CLIENT_TIMEOUT, follow_redirects=True, headers=headers) as c:
        r = c.get(url)
        r.raise_for_status()
        return r.json() if as_json else r.text


def _clean_text(raw: str) -> str:
    """Strip boilerplate noise from scraped text."""
    # Remove excessive whitespace
    text = re.sub(r"\n{3,}", "\n\n", raw)
    text = re.sub(r"[ \t]+", " ", text)
    # Remove lines that are just numbers, dates, or single words (nav links)
    lines = [l.strip() for l in text.split("\n") if len(l.strip().split()) > 3]
    return " ".join(lines).strip()


# ── Wikipedia ─────────────────────────────────────────────────────────────────

def collect_wikipedia(limit: int) -> Iterator[HumanDocument]:
    """
    Use Wikipedia's API to fetch random article sections.
    Targets the intro section (most factual, clean, human-written pre-2022).
    """
    collected = 0
    attempts  = 0

    while collected < limit and attempts < limit * 3:
        attempts += 1
        try:
            # Get a random article title
            rand = _get(
                "https://en.wikipedia.org/w/api.php"
                "?action=query&list=random&rnnamespace=0&rnlimit=10&format=json",
                as_json=True,
            )
            pages = rand.get("query", {}).get("random", [])

            for page in pages:
                if collected >= limit:
                    break
                title = page["title"]

                # Fetch extract (intro paragraphs only — cleanest human text)
                data = _get(
                    f"https://en.wikipedia.org/w/api.php"
                    f"?action=query&prop=extracts&exintro=true"
                    f"&explaintext=true&titles={httpx.URL(title).path}&format=json",
                    as_json=True,
                )
                pages_data = data.get("query", {}).get("pages", {})
                for pid, pdata in pages_data.items():
                    if pid == "-1":
                        continue
                    extract = pdata.get("extract", "")
                    clean   = _clean_text(extract)
                    doc     = HumanDocument.create("wikipedia", f"https://en.wikipedia.org/wiki/{title}", title, clean)
                    if doc:
                        yield doc
                        collected += 1

            time.sleep(0.5)

        except Exception as e:
            print(f"[wikipedia] error: {e}")
            time.sleep(2)


# ── News (BBC + NYT + Reuters via RSS) ────────────────────────────────────────

def collect_news(limit: int) -> Iterator[HumanDocument]:
    collected = 0

    for rss_url in SOURCE_URLS["news"]:
        if collected >= limit:
            break
        try:
            xml_text = _get(rss_url)
            root = ET.fromstring(xml_text)

            items = root.findall(".//item")
            for item in items:
                if collected >= limit:
                    break

                title = (item.findtext("title") or "").strip()
                link  = (item.findtext("link")  or "").strip()
                desc  = (item.findtext("description") or "").strip()

                if not title or not link:
                    continue

                # Fetch full article text
                try:
                    html  = _get(link)
                    soup  = BeautifulSoup(html, "lxml")

                    # Remove nav/header/footer noise
                    for tag in soup.select("nav, header, footer, aside, .ad, script, style, noscript"):
                        tag.decompose()

                    # Extract article body paragraphs
                    paragraphs = soup.select("article p, .article-body p, .story-body p, [class*='article'] p")
                    if not paragraphs:
                        paragraphs = soup.find_all("p")

                    text  = " ".join(p.get_text(strip=True) for p in paragraphs if len(p.get_text(strip=True)) > 40)
                    clean = _clean_text(text)
                    doc   = HumanDocument.create("news", link, title, clean)
                    if doc:
                        yield doc
                        collected += 1
                    time.sleep(0.3)

                except Exception:
                    # Fall back to RSS description if full article fails
                    clean = _clean_text(desc)
                    doc   = HumanDocument.create("news", link, title, clean)
                    if doc:
                        yield doc
                        collected += 1

        except Exception as e:
            print(f"[news] RSS error {rss_url}: {e}")


# ── Reddit (JSON API, no auth required for top posts) ─────────────────────────

def collect_reddit(limit: int) -> Iterator[HumanDocument]:
    collected = 0

    for json_url in SOURCE_URLS["reddit"]:
        if collected >= limit:
            break
        try:
            data = _get(
                json_url,
                as_json=True,
                extra_headers={"Accept": "application/json"},
            )
            posts = data.get("data", {}).get("children", [])

            for post in posts:
                if collected >= limit:
                    break
                pd = post.get("data", {})

                # Only self-posts (text posts) — not link posts
                if pd.get("is_self") and pd.get("selftext"):
                    title   = pd.get("title", "").strip()
                    text    = pd.get("selftext", "").strip()
                    url     = f"https://reddit.com{pd.get('permalink', '')}"
                    clean   = _clean_text(text)
                    doc     = HumanDocument.create("reddit", url, title, clean)
                    if doc:
                        yield doc
                        collected += 1

        except Exception as e:
            print(f"[reddit] error {json_url}: {e}")
            time.sleep(2)


# ── ArXiv abstracts ───────────────────────────────────────────────────────────

def collect_arxiv(limit: int) -> Iterator[HumanDocument]:
    collected = 0

    for api_url in SOURCE_URLS["arxiv"]:
        if collected >= limit:
            break
        try:
            xml_text = _get(api_url)
            root = ET.fromstring(xml_text)
            ns   = {"atom": "http://www.w3.org/2005/Atom"}

            for entry in root.findall("atom:entry", ns):
                if collected >= limit:
                    break
                title    = (entry.findtext("atom:title", namespaces=ns) or "").strip().replace("\n", " ")
                abstract = (entry.findtext("atom:summary", namespaces=ns) or "").strip().replace("\n", " ")
                link     = ""
                for l in entry.findall("atom:link", ns):
                    if l.get("type") == "text/html":
                        link = l.get("href", "")
                        break

                clean = _clean_text(abstract)
                doc   = HumanDocument.create("abstracts", link, title, clean)
                if doc:
                    yield doc
                    collected += 1

        except Exception as e:
            print(f"[arxiv] error: {e}")


# ── Recipes ───────────────────────────────────────────────────────────────────

def collect_recipes(limit: int) -> Iterator[HumanDocument]:
    """
    Scrape AllRecipes — one of the cleanest recipe sources.
    Uses sitemap for reliable URL discovery.
    """
    collected = 0
    seen: set[str] = set()

    # Use AllRecipes sitemap to find recipe URLs
    try:
        sitemap = _get("https://www.allrecipes.com/sitemap.xml")
        urls    = re.findall(r'<loc>(https://www\.allrecipes\.com/recipe/[^<]+)</loc>', sitemap)

        for url in urls:
            if collected >= limit:
                break
            if url in seen:
                continue
            seen.add(url)

            try:
                html   = _get(url)
                soup   = BeautifulSoup(html, "lxml")

                title_tag = soup.find("h1")
                title     = title_tag.get_text(strip=True) if title_tag else ""
                if not title:
                    continue

                # Get ingredients + directions
                ingredients = [li.get_text(strip=True) for li in soup.select("[class*='ingredient']")]
                directions  = [li.get_text(strip=True) for li in soup.select("[class*='instruction'], [class*='direction']")]

                if not ingredients or not directions:
                    continue

                text  = (
                    f"Ingredients: {', '.join(ingredients)}. "
                    f"Instructions: {' '.join(directions)}"
                )
                clean = _clean_text(text)
                doc   = HumanDocument.create("recipes", url, title, clean)
                if doc:
                    yield doc
                    collected += 1
                time.sleep(0.4)

            except Exception:
                pass

    except Exception as e:
        print(f"[recipes] sitemap error: {e}")


# ── Movie Reviews (IMDb) ──────────────────────────────────────────────────────

def collect_reviews(limit: int) -> Iterator[HumanDocument]:
    collected = 0

    try:
        html  = _get("https://www.imdb.com/chart/top/")
        soup  = BeautifulSoup(html, "lxml")
        links = [
            "https://www.imdb.com" + a["href"]
            for a in soup.select("a[href*='/title/']")
            if a.get("href", "").startswith("/title/")
        ]
        links = list(dict.fromkeys(links))[:200]   # deduplicate

        for movie_url in links:
            if collected >= limit:
                break

            try:
                # Get user reviews page
                reviews_url = movie_url.rstrip("/") + "/reviews"
                html2 = _get(reviews_url)
                soup2 = BeautifulSoup(html2, "lxml")

                title_tag = soup2.find("h3", itemprop="name") or soup2.find("h1")
                title     = title_tag.get_text(strip=True) if title_tag else "Movie Review"

                for review_div in soup2.select(".text.show-more__control, [class*='review-text']"):
                    if collected >= limit:
                        break
                    text  = review_div.get_text(strip=True)
                    clean = _clean_text(text)
                    doc   = HumanDocument.create("reviews", reviews_url, title, clean)
                    if doc:
                        yield doc
                        collected += 1

                time.sleep(0.5)
            except Exception:
                pass

    except Exception as e:
        print(f"[reviews] error: {e}")


# ── Books (Project Gutenberg) ─────────────────────────────────────────────────

def collect_books(limit: int) -> Iterator[HumanDocument]:
    """
    Project Gutenberg — pre-copyright texts, guaranteed pre-2022 human writing.
    """
    collected = 0

    try:
        html  = _get("https://www.gutenberg.org/browse/scores/top")
        soup  = BeautifulSoup(html, "lxml")

        book_links = []
        for a in soup.select("ol li a"):
            href = a.get("href", "")
            if "/ebooks/" in href:
                book_id = href.rstrip("/").split("/")[-1]
                book_links.append((a.get_text(strip=True), book_id))

        for title, book_id in book_links:
            if collected >= limit:
                break
            try:
                # Fetch plain text version
                txt_url = f"https://www.gutenberg.org/cache/epub/{book_id}/pg{book_id}.txt"
                text    = _get(txt_url)

                # Strip Gutenberg header/footer boilerplate
                start = max(text.find("*** START OF"), text.find("*END*THE SMALL PRINT"))
                end   = text.find("*** END OF")

                if start > 0:
                    text = text[start + 80:]
                if end > 0:
                    text = text[:end]

                # Split into ~500-word chunks, yield each as a doc
                words  = text.split()
                chunk_size = 400
                for i in range(0, len(words), chunk_size):
                    if collected >= limit:
                        break
                    chunk = " ".join(words[i: i + chunk_size])
                    clean = _clean_text(chunk)
                    doc   = HumanDocument.create(
                        "books",
                        f"https://www.gutenberg.org/ebooks/{book_id}",
                        f"{title} (excerpt)",
                        clean,
                    )
                    if doc:
                        yield doc
                        collected += 1

                time.sleep(1)
            except Exception:
                pass

    except Exception as e:
        print(f"[books] error: {e}")


# ── Poetry ────────────────────────────────────────────────────────────────────

def collect_poetry(limit: int) -> Iterator[HumanDocument]:
    collected = 0

    try:
        # Poetry Foundation has a JSON API
        for page in range(1, 20):
            if collected >= limit:
                break
            try:
                data = _get(
                    f"https://www.poetryfoundation.org/api/poems?page={page}&pageSize=20",
                    as_json=True,
                    extra_headers={"Accept": "application/json"},
                )
                poems = data.get("results", data.get("poems", []))
                if not poems:
                    break

                for poem in poems:
                    if collected >= limit:
                        break
                    title  = poem.get("title", "").strip()
                    body   = poem.get("content", poem.get("body", "")).strip()

                    # Strip HTML if present
                    if "<" in body:
                        body = BeautifulSoup(body, "lxml").get_text(" ")

                    clean = _clean_text(body)
                    url   = poem.get("url", poem.get("link", "https://www.poetryfoundation.org"))
                    doc   = HumanDocument.create("poetry", url, title, clean)
                    if doc:
                        yield doc
                        collected += 1

                time.sleep(0.3)

            except Exception:
                break

    except Exception as e:
        print(f"[poetry] error: {e}")


# ── Domain router ─────────────────────────────────────────────────────────────

_COLLECTORS = {
    "wikipedia": collect_wikipedia,
    "news":      collect_news,
    "reddit":    collect_reddit,
    "arxiv":     collect_arxiv,
    "recipes":   collect_recipes,
    "reviews":   collect_reviews,
    "books":     collect_books,
    "poetry":    collect_poetry,
}


def collect_domain(source: str, limit: int) -> Iterator[HumanDocument]:
    """
    Entry point. Yields HumanDocument objects for a given source name.
    All returned docs are guaranteed to pass word-count bounds.
    """
    collector = _COLLECTORS.get(source)
    if not collector:
        raise ValueError(f"Unknown source: {source}. Available: {list(_COLLECTORS)}")
    yield from collector(limit)