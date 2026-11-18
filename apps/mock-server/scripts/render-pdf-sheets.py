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
    parser.add_argument("--max-pages", type=int, default=0)
    parser.add_argument("--max-pixels", type=int, default=0)
    parser.add_argument("--max-total-pixels", type=int, default=0)
    parser.add_argument("--max-output-bytes", type=int, default=0)
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
        if args.max_pages and doc.page_count > args.max_pages:
            raise ValueError("PDF page limit exceeded")
        total_pixels = 0
        output_bytes = 0
        matrix = fitz.Matrix(args.zoom, args.zoom)
        for index, page in enumerate(doc):
            pixels = int(page.rect.width * args.zoom + 1) * int(page.rect.height * args.zoom + 1)
            total_pixels += pixels
            if (args.max_pixels and pixels > args.max_pixels) or (args.max_total_pixels and total_pixels > args.max_total_pixels):
                raise ValueError("PDF pixel limit exceeded")
            pix = page.get_pixmap(matrix=matrix, alpha=False)
            target = args.out_dir / f"page-{index + 1:02d}.png"
            pix.save(target)
            output_bytes += target.stat().st_size
            if args.max_output_bytes and output_bytes > args.max_output_bytes:
                raise ValueError("PDF output size limit exceeded")
        print(doc.page_count)
    finally:
        doc.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
