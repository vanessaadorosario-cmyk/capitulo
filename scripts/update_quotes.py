import json
from datetime import datetime, timezone

import yfinance as yf

SYMBOLS = {
    "GOLD": "GC=F",
    "COPPER": "HG=F",
    "CL": "CL=F",
    "OSLO": "OSEAX.OL",
    "ZS": "ZS=F",
    "YMH26": "YM=F",
    "GDOW": "^DJI",
    "VALE.K": "VALE",
    "PBR": "PBR",
    "EWZ": "EWZ",
    "XLF": "XLF",
    "XLP": "XLP",
    "XLE": "XLE",
    "XME": "XME",
    "EEM": "EEM",
    "SOXX.O": "SOXX",
    ".BSESN": "^BSESN",
    "CHINA": "000001.SS",
    "MINERIO_SINA": "TIO=F",
    "DX": "DX-Y.NYB",
    "VX": "^VIX",
    "USD/MXN": "USDMXN=X",
    "USD/NOK": "USDNOK=X",
    "USD/NZD": "USDNZD=X",
    "USD/AUD": "USDAUD=X",
    "USD/KRW": "USDKRW=X",
    "USD/CNY": "USDCNY=X",
    "EUR/BRL": "EURBRL=X",
}


def _round_or_none(value, digits=4):
    if value is None:
        return None
    try:
        return round(float(value), digits)
    except Exception:
        return None


def load_quotes():
    data = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "source": "yfinance",
        "variacoes": {},
        "precos": {},
    }

    for codigo, ticker in SYMBOLS.items():
        try:
            info = yf.Ticker(ticker).fast_info
            if not info:
                continue

            pct = info.get("regularMarketChangePercent")
            last_price = info.get("lastPrice")
            if pct is not None:
                data["variacoes"][codigo] = _round_or_none(pct, 4)
            if last_price is not None:
                data["precos"][codigo] = _round_or_none(last_price, 6)
        except Exception:
            continue

    return data


def main():
    payload = load_quotes()
    with open("data/quotes.json", "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
