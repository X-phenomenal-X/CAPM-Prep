#!/usr/bin/env python3
"""Generate capm-ios.html (iOS standalone-PWA build) from capm-pro.html.

Never edit capm-ios.html by hand and never `cp` the pro build over it —
edit capm-pro.html, then rerun:  python3 make_ios.py

Transform (keeps the single-file, zero-dependency constraint):
  1. Inject iOS/PWA head tags after the viewport meta: standalone display,
     status-bar style, app title, theme color, a data-URI apple-touch-icon,
     and a data-URI web app manifest.
  2. Refine the cross-platform offline font aliases to iOS-native system
     fonts via @font-face local() sources.

Every replacement asserts its match count first, per the repo's editing
workflow, so an upstream change that moves an anchor fails loudly here
instead of silently producing a broken build.
"""
import base64
import json
import struct
import zlib

SRC = "capm-pro.html"
OUT = "capm-ios.html"

VOID = (0x07, 0x0A, 0x0D)      # --void
GLASS = (0x8F, 0xD8, 0xE7)     # --glass
GLASSDIM = (0x5A, 0xA6, 0xB7)  # --glassdim


def build_icon_png(size=180):
    """Solid-background tower glyph, written as a raw PNG (no imaging deps)."""
    tower_x0, tower_x1 = int(size * 0.30), int(size * 0.70)
    tower_y0, tower_y1 = int(size * 0.17), int(size * 0.88)
    rows = []
    for y in range(size):
        row = bytearray([0])  # filter type 0 (None)
        for x in range(size):
            if tower_x0 <= x < tower_x1 and tower_y0 <= y < tower_y1:
                t = (y - tower_y0) / (tower_y1 - tower_y0)
                r, g, b = (round(a + (d - a) * t) for a, d in zip(GLASS, GLASSDIM))
                # mullions: darken a 2px grid so it reads as curtain wall
                if (x - tower_x0) % 18 < 2 or (y - tower_y0) % 22 < 2:
                    r, g, b = r * 2 // 5, g * 2 // 5, b * 2 // 5
                row += bytes((r, g, b))
            else:
                row += bytes(VOID)
        rows.append(bytes(row))

    def chunk(tag, data):
        return (struct.pack(">I", len(data)) + tag + data
                + struct.pack(">I", zlib.crc32(tag + data)))

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)  # 8-bit RGB
    idat = zlib.compress(b"".join(rows), 9)
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr)
            + chunk(b"IDAT", idat) + chunk(b"IEND", b""))


def replace(html, old, new, n=1):
    count = html.count(old)
    assert count == n, f"expected {n} occurrence(s) of {old[:70]!r}, found {count}"
    return html.replace(old, new)


def main():
    h = open(SRC, encoding="utf-8").read()

    icon_uri = "data:image/png;base64," + base64.b64encode(build_icon_png()).decode()
    manifest = {
        "name": "CAPM Prep",
        "short_name": "CAPM Prep",
        "display": "standalone",
        "start_url": ".",
        "background_color": "#070a0d",
        "theme_color": "#070a0d",
        "icons": [{"src": icon_uri, "sizes": "180x180", "type": "image/png"}],
    }
    manifest_uri = ("data:application/manifest+json;base64,"
                    + base64.b64encode(json.dumps(manifest).encode()).decode())

    viewport = ('<meta name="viewport" content="width=device-width, '
                'initial-scale=1.0, viewport-fit=cover">')
    ios_head = viewport + f'''
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="CAPM Prep">
<meta name="theme-color" content="#070a0d">
<meta name="format-detection" content="telephone=no">
<link rel="apple-touch-icon" href="{icon_uri}">
<link rel="manifest" href="{manifest_uri}">'''
    h = replace(h, viewport, ios_head)

    # Refine the cross-platform aliases to iOS-first families so the 100+
    # bare font-family references bind to Apple's native typography offline.
    system_fonts = """/* Cross-platform system aliases keep every build crisp and fully offline. */
  @font-face{font-family:'Space Grotesk';src:local('Aptos Display'),local('Segoe UI Variable Display'),local('SF Pro Display'),local('Segoe UI'),local('Helvetica Neue');font-weight:400 700;}
  @font-face{font-family:'Hanken Grotesque';src:local('Aptos'),local('Segoe UI Variable Text'),local('SF Pro Text'),local('Segoe UI'),local('Helvetica Neue');font-weight:400 700;}
  @font-face{font-family:'JetBrains Mono';src:local('Cascadia Mono'),local('Cascadia Code'),local('SF Mono'),local('Menlo'),local('Consolas');font-weight:400 700;}"""
    local_fonts = """/* iOS build: web fonts aliased to system fonts (offline) */
  @font-face{font-family:'Space Grotesk';src:local('SF Pro Display'),local('Helvetica Neue');}
  @font-face{font-family:'Hanken Grotesque';src:local('SF Pro Text'),local('Helvetica Neue');}
  @font-face{font-family:'JetBrains Mono';src:local('SF Mono'),local('Menlo'),local('Courier New');}"""
    h = replace(h, system_fonts, local_fonts)

    open(OUT, "w", encoding="utf-8").write(h)
    print(f"wrote {OUT} ({len(h):,} bytes)")


if __name__ == "__main__":
    main()
