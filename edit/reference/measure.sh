#!/usr/bin/env bash
# Measure reference edits before copying their style (edit.md §7, steps 1–2), in one go.
#   measure.sh <out_dir> <url-or-file> [<url-or-file> …]
# URLs (Instagram reels, TikTok, YouTube Shorts) are fetched with yt-dlp. For each clip it writes:
#   <id>.mp4, <id>.cuts (hard-cut times), <id>-sheet.png (1 fps contact sheet),
#   <id>-strip-<t>.png (24 fps strips around clusters of cuts, where the transitions are),
#   and prints duration, cuts/min and the caption text (platform description), if any.
# Copy behaviours from what you read here, never the clip's footage, fonts or music.
set -euo pipefail
out="$1"; shift
mkdir -p "$out"
for src in "$@"; do
  if [[ "$src" =~ ^https?:// ]]; then
    command -v yt-dlp >/dev/null || { echo "needs yt-dlp (brew install yt-dlp)"; exit 1; }
    id=$(yt-dlp --no-warnings --print id "$src" | head -1)
    [ -f "$out/$id.mp4" ] || yt-dlp -q --no-warnings -f "mp4/bv*+ba/b" --merge-output-format mp4 -o "$out/$id.%(ext)s" --write-info-json "$src"
  else
    id=$(basename "${src%.*}"); cp -n "$src" "$out/$id.mp4" || true
  fi
  f="$out/$id.mp4"
  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")
  ffmpeg -hide_banner -i "$f" -vf "select='gt(scene,0.25)',showinfo" -an -f null - 2>&1 | grep showinfo | sed -E 's/.*pts_time: *([0-9.]+).*/\1/' | grep -E '^[0-9.]+$' | awk '{printf "%.2f\n",$1}' > "$out/$id.cuts" || true
  n=$(wc -l < "$out/$id.cuts" | tr -d ' ')
  rows=$(python3 -I -c "import math;print(min(10,math.ceil(float('$dur')/8)))")
  ffmpeg -loglevel error -y -i "$f" -vf "fps=1,scale=180:320,tile=8x$rows" -frames:v 1 "$out/$id-sheet.png"
  # clusters: 3+ cuts within 0.5 s = a designed transition (flash, glitch, slice, whip) rather than an edit point
  python3 -I - "$out/$id.cuts" <<'PY' > "$out/$id.clusters"
import sys
ts=[float(x) for x in open(sys.argv[1]) if x.strip()]
out=[];i=0
while i<len(ts):
    j=i
    while j+1<len(ts) and ts[j+1]-ts[j]<0.2: j+=1
    if j-i>=2: out.append(ts[i])
    i=j+1
print(" ".join(f"{t:.2f}" for t in out))
PY
  for c in $(cat "$out/$id.clusters" | tr ' ' '\n' | head -6); do
    s=$(python3 -I -c "print(max(0,$c-0.25))")
    ffmpeg -loglevel error -y -ss "$s" -t 0.84 -i "$f" -vf "fps=24,scale=144:256,tile=10x2" -frames:v 1 "$out/$id-strip-$c.png"
  done
  desc=""
  [ -f "$out/$id.info.json" ] && desc=$(python3 -I -c "import json,sys;d=json.load(open(sys.argv[1]));print((d.get('uploader') or '')+': '+(d.get('description') or '').split(chr(10))[0][:140])" "$out/$id.info.json")
  printf '%s  %.1fs  %s cuts (%.0f/min)  transitions at: %s\n  %s\n' "$id" "$dur" "$n" "$(python3 -I -c "print($n/float('$dur')*60)")" "$(cat "$out/$id.clusters")" "$desc"
done
echo "Read every *-sheet.png and *-strip-*.png before writing the preset row."
