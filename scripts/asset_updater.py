import csv
import json
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

LINE_KEYS = ("blue", "red", "green", "gray")


class SourceError(Exception):
    pass


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def load_config(config_path: Path) -> Dict:
    with config_path.open("r", encoding="utf-8") as f:
        return json.load(f)


def validate_assets_config(config: Dict) -> List[str]:
    errors: List[str] = []
    if not isinstance(config.get("assets"), list) or not config["assets"]:
        return ["config.assets must be a non-empty list"]

    required = {"symbol", "display_name", "group", "preferred_sources"}
    valid_groups = {"safety", "risk", "reference"}
    seen = set()

    for idx, asset in enumerate(config["assets"]):
        missing = required.difference(asset.keys())
        if missing:
            errors.append(f"assets[{idx}] missing fields: {sorted(missing)}")
        symbol = asset.get("symbol")
        if symbol:
            if symbol in seen:
                errors.append(f"duplicate symbol: {symbol}")
            seen.add(symbol)
        if asset.get("group") not in valid_groups:
            errors.append(f"assets[{idx}] invalid group: {asset.get('group')}")
        if not isinstance(asset.get("preferred_sources"), list) or not asset.get("preferred_sources"):
            errors.append(f"assets[{idx}] preferred_sources must be a non-empty list")

    return errors


def parse_float(value: object) -> Optional[float]:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip().replace("%", "").replace(" ", "")
    if not text:
        return None
    text = text.replace(",", ".")
    try:
        return float(text)
    except ValueError:
        return None


def fetch_text(url: str, timeout: int = 12, retries: int = 2) -> str:
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; capitulo-market-updater/1.0)",
        "Accept": "text/html,application/json,text/plain,*/*",
    }
    request = Request(url, headers=headers)
    last_error = None

    for attempt in range(retries + 1):
        try:
            with urlopen(request, timeout=timeout) as response:
                return response.read().decode("utf-8", errors="replace")
        except (HTTPError, URLError, TimeoutError) as exc:
            last_error = exc
            if attempt < retries:
                time.sleep(0.4 * (attempt + 1))

    raise SourceError(f"fetch failed: {url} ({last_error})")


def fetch_json(url: str, timeout: int = 12, retries: int = 2) -> Dict:
    text = fetch_text(url, timeout=timeout, retries=retries)
    return json.loads(text)


def extract_investing_percent(html: str, candidates: List[str]) -> Optional[float]:
    for token in candidates:
        if not token:
            continue
        pos = html.lower().find(token.lower())
        if pos < 0:
            continue
        window = html[max(0, pos - 220): pos + 220]
        match = re.search(r"([-+]?\d{1,3}(?:[\.,]\d+)?)\s*%", window)
        if match:
            return parse_float(match.group(1))
    return None


def extract_investing_price(html: str, candidates: List[str]) -> Optional[float]:
    for token in candidates:
        if not token:
            continue
        pos = html.lower().find(token.lower())
        if pos < 0:
            continue
        window = html[max(0, pos - 220): pos + 220]
        numbers = re.findall(r"\d+(?:[\.,]\d+)?", window)
        if numbers:
            parsed = [parse_float(n) for n in numbers]
            parsed = [n for n in parsed if n is not None]
            if parsed:
                return parsed[0]
    return None


def from_investing_portfolio(asset: Dict, context: Dict) -> Optional[Dict]:
    html = context.get("investing_html")
    if not html:
        return None
    candidates = asset.get("parsing_hints", {}).get("investing_search", [asset.get("symbol")])
    pct = extract_investing_percent(html, candidates)
    price = extract_investing_price(html, candidates)
    if pct is None and price is None:
        return None
    return {"price": price, "change_pct": pct}


def from_sina_hq(asset: Dict, context: Dict) -> Optional[Dict]:
    code = asset.get("source_symbols", {}).get("sina_hq")
    if not code:
        return None

    payload = context.get("sina_payload")
    if payload is None:
        return None

    match = re.search(rf"hq_str_{re.escape(code)}=\"([^\"]*)\"", payload)
    if not match:
        return None

    parts = [p.strip() for p in match.group(1).split(",") if p.strip()]
    numbers = [parse_float(p) for p in parts]
    numbers = [n for n in numbers if n is not None]
    if not numbers:
        return None

    price = numbers[0]
    prev = numbers[1] if len(numbers) > 1 else None

    pct = None
    if prev not in (None, 0):
        pct = ((price - prev) / prev) * 100

    return {"price": price, "change_pct": pct}


def from_yahoo_chart(asset: Dict, context: Dict) -> Optional[Dict]:
    ticker = asset.get("source_symbols", {}).get("yahoo_chart")
    if not ticker:
        return None

    timeout = int(context["settings"].get("request_timeout_seconds", 12))
    retries = int(context["settings"].get("request_retries", 2))

    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{quote(ticker)}?interval=5m&range=1d"
    payload = fetch_json(url, timeout=timeout, retries=retries)
    result = (((payload.get("chart") or {}).get("result") or [None])[0])
    if not result:
        return None

    meta = result.get("meta") or {}
    indicators = result.get("indicators") or {}
    quotes = (indicators.get("quote") or [{}])[0]
    closes = [x for x in (quotes.get("close") or []) if x is not None]

    price = parse_float(meta.get("regularMarketPrice"))
    if price is None and closes:
        price = parse_float(closes[-1])

    prev = parse_float(meta.get("previousClose"))
    pct = parse_float(meta.get("regularMarketChangePercent"))
    if pct is None and price is not None and prev not in (None, 0):
        pct = ((price - prev) / prev) * 100

    if pct is None and price is None:
        return None

    return {"price": price, "change_pct": pct}


def from_stooq(asset: Dict, context: Dict) -> Optional[Dict]:
    symbol = asset.get("source_symbols", {}).get("stooq")
    if not symbol:
        return None

    timeout = int(context["settings"].get("request_timeout_seconds", 12))
    retries = int(context["settings"].get("request_retries", 2))
    url = f"https://stooq.com/q/d/l/?s={quote(symbol)}&i=d"
    text = fetch_text(url, timeout=timeout, retries=retries)

    rows = list(csv.DictReader(text.splitlines()))
    rows = [row for row in rows if row.get("Close") and row["Close"] != "N/D"]
    if not rows:
        return None

    latest = rows[-1]
    price = parse_float(latest.get("Close"))
    pct = None

    if len(rows) >= 2:
        previous = parse_float(rows[-2].get("Close"))
        if previous not in (None, 0) and price is not None:
            pct = ((price - previous) / previous) * 100

    if price is None and pct is None:
        return None

    return {"price": price, "change_pct": pct}


def classify_status(change_pct: Optional[float], neutral_threshold_pct: float) -> str:
    value = parse_float(change_pct)
    if value is None:
        return "neutral"
    if abs(value) < neutral_threshold_pct:
        return "neutral"
    return "up" if value > 0 else "down"


def aggregate_lines(assets_latest: List[Dict]) -> Dict:
    lines = {
        "blue": 0,
        "red": 0,
        "green": 0,
        "gray": 0,
    }
    counts = {
        "blue": {"up": 0, "down": 0, "neutral": 0},
        "red": {"up": 0, "down": 0, "neutral": 0},
        "green": {"up": 0, "down": 0, "neutral": 0},
    }

    for asset in assets_latest:
        status = asset["status"]
        memberships = asset.get("line_memberships") or []

        if status == "neutral":
            lines["gray"] += 1

        for line in memberships:
            if line not in ("blue", "red", "green"):
                continue
            counts[line][status] += 1
            if status == "up":
                lines[line] += 1
            elif status == "down":
                lines[line] -= 1

    return {"line_values": lines, "line_status_counts": counts}


def fetch_asset(asset: Dict, context: Dict) -> Dict:
    source_handlers = {
        "investing_portfolio": from_investing_portfolio,
        "sina_hq": from_sina_hq,
        "yahoo_chart": from_yahoo_chart,
        "stooq": from_stooq,
        "manual_placeholder": lambda *_: {"price": None, "change_pct": None},
    }

    best = None
    last_error = None

    for source in asset.get("preferred_sources", []):
        handler = source_handlers.get(source)
        if handler is None:
            continue
        try:
            sample = handler(asset, context)
            if not sample:
                continue
            sample["source_used"] = source
            if sample.get("change_pct") is not None:
                return sample
            if best is None:
                best = sample
        except Exception as exc:  # noqa: BLE001 - resilient source fallback
            last_error = str(exc)

    if best:
        if last_error:
            best["warning"] = last_error
        return best

    return {"price": None, "change_pct": None, "source_used": "unavailable", "warning": last_error}


def build_latest_payload(config: Dict) -> Dict:
    settings = config.get("settings", {})
    updated_at = utc_now_iso()
    timeout = int(settings.get("request_timeout_seconds", 12))
    retries = int(settings.get("request_retries", 2))

    context = {
        "settings": settings,
        "investing_html": None,
        "sina_payload": None,
    }

    investing_url = (config.get("source_endpoints") or {}).get("investing_portfolio_url")
    if investing_url:
        try:
            context["investing_html"] = fetch_text(investing_url, timeout=timeout, retries=retries)
        except Exception:
            context["investing_html"] = None

    sina_api = (config.get("source_endpoints") or {}).get("sina_hq_iron_api")
    if sina_api:
        try:
            context["sina_payload"] = fetch_text(sina_api, timeout=timeout, retries=retries)
        except Exception:
            context["sina_payload"] = None

    assets_latest = []
    for asset in config["assets"]:
        fetched = fetch_asset(asset, context)
        threshold = parse_float(asset.get("neutral_threshold_pct"))
        if threshold is None:
            threshold = parse_float(settings.get("neutral_threshold_pct")) or 0.15

        status = classify_status(fetched.get("change_pct"), threshold)
        assets_latest.append(
            {
                "symbol": asset["symbol"],
                "display_name": asset["display_name"],
                "group": asset["group"],
                "line_memberships": asset.get("line_memberships", []),
                "price": fetched.get("price"),
                "change_pct": fetched.get("change_pct"),
                "status": status,
                "source_used": fetched.get("source_used"),
                "warning": fetched.get("warning"),
            }
        )

    aggregates = aggregate_lines(assets_latest)

    return {
        "updated_at": updated_at,
        "source_priority": "investing_portfolio -> sina_hq -> yahoo_chart -> stooq",
        "assets": assets_latest,
        "aggregates": aggregates,
    }


def update_history(history_path: Path, latest_payload: Dict, history_limit: int) -> Dict:
    history_data = {"updated_at": latest_payload["updated_at"], "series": []}
    if history_path.exists():
        try:
            history_data = json.loads(history_path.read_text(encoding="utf-8"))
            if not isinstance(history_data.get("series"), list):
                history_data["series"] = []
        except Exception:
            history_data = {"updated_at": latest_payload["updated_at"], "series": []}

    lines = latest_payload["aggregates"]["line_values"]
    point = {
        "ts": latest_payload["updated_at"],
        "blue": lines["blue"],
        "red": lines["red"],
        "green": lines["green"],
        "gray": lines["gray"],
    }

    series = history_data["series"]
    if series and series[-1].get("ts") == point["ts"]:
        series[-1] = point
    else:
        series.append(point)

    if len(series) > history_limit:
        history_data["series"] = series[-history_limit:]

    history_data["updated_at"] = latest_payload["updated_at"]
    return history_data


def build_legacy_quotes(latest_payload: Dict) -> Dict:
    variacoes = {}
    precos = {}
    for asset in latest_payload["assets"]:
        symbol = asset["symbol"]
        if asset.get("change_pct") is not None:
            variacoes[symbol] = round(float(asset["change_pct"]), 6)
        if asset.get("price") is not None:
            precos[symbol] = round(float(asset["price"]), 6)
    return {
        "updated_at": latest_payload["updated_at"],
        "source": "multi-source",
        "variacoes": variacoes,
        "precos": precos,
    }


def run_update(repo_root: Path) -> Dict:
    config_path = repo_root / "config" / "assets.json"
    latest_path = repo_root / "data" / "assets_latest.json"
    history_path = repo_root / "data" / "series_history.json"
    legacy_quotes_path = repo_root / "data" / "quotes.json"

    config = load_config(config_path)
    errors = validate_assets_config(config)
    if errors:
        raise ValueError("Invalid config/assets.json: " + "; ".join(errors))

    latest_payload = build_latest_payload(config)
    history_limit = int((config.get("settings") or {}).get("history_limit", 576))
    history_payload = update_history(history_path, latest_payload, history_limit)
    legacy_payload = build_legacy_quotes(latest_payload)

    latest_path.write_text(json.dumps(latest_payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    history_path.write_text(json.dumps(history_payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    legacy_quotes_path.write_text(json.dumps(legacy_payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    return {
        "latest_path": str(latest_path),
        "history_path": str(history_path),
        "legacy_quotes_path": str(legacy_quotes_path),
        "updated_at": latest_payload["updated_at"],
        "assets_count": len(latest_payload["assets"]),
    }
