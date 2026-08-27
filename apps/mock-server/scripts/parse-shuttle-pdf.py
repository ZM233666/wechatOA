#!/usr/bin/env python3
"""Parse Knorr-Bremse shuttle PDF into ShuttleData JSON."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

try:
    import fitz
except ImportError:
    print("PyMuPDF (fitz) is required: pip install pymupdf", file=sys.stderr)
    raise SystemExit(2)

ROUTE_HEAD_RE = re.compile(
    r"(K\d+)\.\s*([^:：\n]+?)\s*[:：]\s*",
    re.MULTILINE,
)
# Time at start of a stop segment (half/full-width colon)
TIME_HEAD_RE = re.compile(r"^(\d{1,2})[:：](\d{2})\s*(.*)$")
# Trailing note in parentheses
NOTE_TAIL_RE = re.compile(r"^(.*?)[（(]([^（）()]+)[）)]\s*$")
# Special: （下班增加XXX）
OFFWORK_ADD_RE = re.compile(r"^[（(]下班增加(.+?)[）)]\s*$")
# Duplicate trailing time glued to name: 彩香新村7:50
DUP_TIME_TAIL_RE = re.compile(r"^(.*?)(\d{1,2})[:：](\d{2})$")


def normalize_text(raw: str) -> str:
    text = raw.replace("\u3000", " ").replace("\xa0", " ")
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    # Join soft line wraps inside routes (newline between time continuation)
    text = re.sub(r"(?<=\S)\n(?=\S)", "", text)
    text = re.sub(r"[ \t]+", " ", text)
    return text


def extract_notice(text: str) -> str:
    m = re.search(r"Shuttle Bus Route[（(]([^）)]+)[）)]", text)
    cn = m.group(1).strip() if m else "以上站点仅做参考，部分站点可能有调整未登记，请知悉"
    return f"{cn}。(Note: Stations are for reference only and may be subject to change.)"


def split_stop_segments(body: str) -> list[str]:
    # Normalize dash variants used as separators between stops
    body = body.replace("—", "--").replace("–", "--").replace("－", "--")
    # 7:52-7:55 glued times → treat as stop separator
    body = re.sub(r"(?<=\d)[-](?=\d{1,2}[:：])", "--", body)
    parts = re.split(r"\s*--+\s*", body)
    return [p.strip(" \t，,;") for p in parts if p.strip(" \t，,;")]


def parse_stop(segment: str) -> dict | None:
    segment = segment.strip()
    if not segment:
        return None

    offwork = OFFWORK_ADD_RE.match(segment)
    if offwork:
        return {"name": offwork.group(1).strip(), "note": "下班增加"}

    time: str | None = None
    rest = segment
    tm = TIME_HEAD_RE.match(segment)
    if tm:
        time = f"{int(tm.group(1))}:{tm.group(2)}"
        rest = tm.group(3).strip()

    # Clean glued duplicate time at end of name (OCR/PDF quirks)
    if time:
        dup = DUP_TIME_TAIL_RE.match(rest)
        if dup and f"{int(dup.group(2))}:{dup.group(3)}" == time:
            rest = dup.group(1).strip()

    note: str | None = None
    nm = NOTE_TAIL_RE.match(rest)
    if nm and nm.group(1).strip():
        rest = nm.group(1).strip()
        note = nm.group(2).strip()
    elif nm and not nm.group(1).strip():
        # Entire segment is a parenthetical note-name
        rest = nm.group(2).strip()

    if not rest:
        return None

    stop: dict = {"name": rest}
    if time:
        stop["time"] = time
    if note:
        stop["note"] = note
    return stop


def format_stations_text(stops: list[dict]) -> str:
    lines: list[str] = []
    for stop in stops:
        place = f"{stop['name']}（{stop['note']}）" if stop.get("note") else stop["name"]
        if stop.get("time"):
            lines.append(f"{stop['time']} {place}")
        else:
            lines.append(place)
    return "\n".join(lines)


def parse_shuttle_pdf(pdf_path: Path) -> dict:
    doc = fitz.open(pdf_path)
    try:
        raw = "\n".join(page.get_text("text") for page in doc)
    finally:
        doc.close()

    text = normalize_text(raw)
    notice = extract_notice(text)
    matches = list(ROUTE_HEAD_RE.finditer(text))
    if not matches:
        raise ValueError(f"No shuttle routes found in {pdf_path}")

    routes: list[dict] = []
    for index, match in enumerate(matches):
        route_id = match.group(1)
        route_name = match.group(2).strip().rstrip("：:")
        start = match.end()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        body = text[start:end].strip()
        stops = [stop for seg in split_stop_segments(body) if (stop := parse_stop(seg))]
        if not stops:
            raise ValueError(f"Route {route_id} has no stops")
        routes.append(
            {
                "id": route_id,
                "name": route_name,
                "stops": stops,
                "stationsText": format_stations_text(stops),
            }
        )

    return {"notice": notice, "routes": routes}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf", type=Path)
    args = parser.parse_args()
    if not args.pdf.is_file():
        print(f"PDF not found: {args.pdf}", file=sys.stderr)
        return 1
    data = parse_shuttle_pdf(args.pdf)
    json.dump(data, sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
