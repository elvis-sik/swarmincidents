#!/bin/sh
# Regenerate the icons and the link-preview image in docs/ from brand/.
# Needs rsvg-convert (brew install librsvg) and Google Chrome. Run from anywhere.
set -e
cd "$(dirname "$0")"
D=../docs
T=$(mktemp -d)
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

cp icon.svg "$D/favicon.svg"
sed 's/rx="14" //' icon.svg > "$T/square.svg"   # iOS rounds the corners itself
rsvg-convert -w 180 -h 180 "$T/square.svg" -o "$D/apple-touch-icon.png"
rsvg-convert -w 192 -h 192 icon.svg -o "$D/icon-192.png"
rsvg-convert -w 512 -h 512 icon.svg -o "$D/icon-512.png"
rsvg-convert -w 16 -h 16 icon-small.svg -o "$T/16.png"
rsvg-convert -w 32 -h 32 icon.svg -o "$T/32.png"
rsvg-convert -w 48 -h 48 icon.svg -o "$T/48.png"
python3 - "$T" "$D/favicon.ico" <<'PY'
import struct, sys
from pathlib import Path
t, out = Path(sys.argv[1]), sys.argv[2]
imgs = [(s, (t / f"{s}.png").read_bytes()) for s in (16, 32, 48)]
head = struct.pack("<HHH", 0, 1, len(imgs))
off, dirs = 6 + 16 * len(imgs), b""
for s, b in imgs:
    dirs += struct.pack("<BBBBHHII", s, s, 0, 0, 1, 32, len(b), off)
    off += len(b)
Path(out).write_bytes(head + dirs + b"".join(b for _, b in imgs))
PY

"$CHROME" --headless=new --hide-scrollbars --force-device-scale-factor=1 --window-size=1200,630 \
  --virtual-time-budget=6000 --allow-file-access-from-files \
  --screenshot="$D/og.png" "file://$PWD/og.html" 2>/dev/null
rm -rf "$T"
echo "assets written to docs/"
