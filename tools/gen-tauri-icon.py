#!/usr/bin/env python3
"""Minimal PNG icon for Tauri packaging (stdlib only, fixed 512x512)."""
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src-tauri" / "icons" / "icon.png"
W = H = 512


def chunk(tag: bytes, data: bytes) -> bytes:
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xffffffff)


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    raw = bytearray()
    for y in range(H):
        raw.append(0)
        for x in range(W):
            cx, cy = x - W // 2, y - H // 2
            inside = abs(cx) + abs(cy) * 0.6 < 170 and cy > -120
            if inside:
                raw.extend((214, 180, 60, 255))
            else:
                raw.extend((18, 18, 18, 255))
    compressed = zlib.compress(bytes(raw), 9)
    ihdr = struct.pack(">IIBBBBB", W, H, 8, 6, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", compressed) + chunk(b"IEND", b"")
    OUT.write_bytes(png)
    print(OUT)


if __name__ == "__main__":
    main()
