#!/usr/bin/env python3
"""Render a PDF into page-*.png sheets for the in-app flipbook reader."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf", type=Path)
    parser.add_argument("out_dir", type=Path)
    parser.add_argument("--zoom", type=float, default=2.0)
    args = parser.parse_args()

    try:
        import fitz  # PyMuPDF
    except ImportError:
        print("PyMuPDF (fitz) is required: pip install pymupdf", file=sys.stderr)
        return 2

    if not args.pdf.is_file():
        print(f"PDF not found: {args.pdf}", file=sys.stderr)
        return 1

    args.out_dir.mkdir(parents=True, exist_ok=True)
    for stale in args.out_dir.glob("page-*.png"):
        stale.unlink()

    doc = fitz.open(args.pdf)
    try:
        matrix = fitz.Matrix(args.zoom, args.zoom)
        for index, page in enumerate(doc):
            pix = page.get_pixmap(matrix=matrix, alpha=False)
            pix.save(args.out_dir / f"page-{index + 1:02d}.png")
        print(doc.page_count)
    finally:
        doc.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
