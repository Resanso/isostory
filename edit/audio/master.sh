#!/bin/bash
# master.sh in.wav out.wav "<chain>" TARGET_I LIMIT_dB : chain -> static gain to target -> true-peak-safe limiter (2 passes)
in=$1; out=$2; chain=$3; T=${4:--14}; L=${5:--2}
I=$(ffmpeg -hide_banner -nostats -i "$in" -af "$chain,ebur128" -f null - 2>&1 | awk '/^ +I:/{print $2}' | tail -1)
g=$(python3 -c "print(round($T-($I),2))")
I2=$(ffmpeg -hide_banner -nostats -i "$in" -af "$chain,volume=${g}dB,alimiter=limit=${L}dB:attack=2:release=50:level=disabled,ebur128" -f null - 2>&1 | awk '/^ +I:/{print $2}' | tail -1)
g2=$(python3 -c "print(round($g+$T-($I2),2))")
echo "chain I=$I gain1=$g -> I=$I2, gain2=$g2"
ffmpeg -y -hide_banner -loglevel error -i "$in" -af "$chain,volume=${g2}dB,alimiter=limit=${L}dB:attack=2:release=50:level=disabled" -ar 48000 -c:a pcm_s24le "$out"
