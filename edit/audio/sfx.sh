#!/bin/bash
# sfx.sh <out_dir> : synthesise the edit-mode SFX starter kit with ffmpeg only (no samples, no licences).
# Loudness (EBU R128 integrated, padded) is printed so mixer.py gains can target about -22 LUFS momentary.
set -euo pipefail
O=${1:-sfx}; mkdir -p "$O"
f() { ffmpeg -y -hide_banner -loglevel error "$@"; }

# bubble pop (caption reveal, card land): rising 380->1150 Hz + 2 ms click + small room
f -f lavfi -i "aevalsrc='0.9*sin(2*PI*(380*t+770*(t-(1-exp(-t*30))/30)))*exp(-t*28)+0.35*sin(2*PI*2300*t)*exp(-t*900)':s=48000:d=0.35" \
  -af "afade=t=in:d=0.001,aecho=0.8:0.5:35|61:0.25|0.15,highpass=f=150,afade=t=out:st=0.25:d=0.1,aformat=channel_layouts=stereo" "$O/pop.wav"
# whoosh (insert slides in, transitions): two noise bands, pans L->R, reverb tail; peak at 0.38 s
f -f lavfi -i "anoisesrc=c=pink:r=48000:d=0.75:a=0.9:seed=3:nb_samples=256" -f lavfi -i "anoisesrc=c=white:r=48000:d=0.75:a=0.5:seed=9:nb_samples=256" -filter_complex "
[0:a]bandpass=f=700:width_type=h:w=900,volume='if(lt(t,0.38),sin(PI*t/0.76)^2,(1-(t-0.38)/0.37)^2)':eval=frame[lo];
[1:a]bandpass=f=4500:width_type=h:w=5000,volume='0.6*sin(PI*min(t,0.6)/0.6)^3':eval=frame[hi];
[lo][hi]amix=inputs=2:normalize=0,asplit=2[a][b];
[a]volume='1-min(t/0.6,1)*0.8':eval=frame[l];[b]volume='0.2+min(t/0.6,1)*0.8':eval=frame[r];
[l][r]join=inputs=2:channel_layout=stereo,aecho=0.8:0.4:60|110:0.3|0.2,afade=t=in:d=0.05,afade=t=out:st=0.6:d=0.15" "$O/whoosh.wav"
# UI ding (notification card) and a higher variant (number / keyword pops)
f -f lavfi -i "aevalsrc='(0.6*sin(2*PI*1318.5*t)+0.35*sin(2*PI*1975.5*t)+0.15*sin(2*PI*2637*t))*exp(-t*5)*min(1,t*400)':s=48000:d=1.0" \
  -af "aformat=channel_layouts=stereo,aecho=0.8:0.4:45|80:0.2|0.12,afade=t=out:st=0.8:d=0.2" "$O/ding.wav"
f -f lavfi -i "aevalsrc='(0.6*sin(2*PI*1760*t)+0.35*sin(2*PI*2637*t)+0.12*sin(2*PI*3520*t))*exp(-t*6)*min(1,t*400)':s=48000:d=0.8" \
  -af "aformat=channel_layouts=stereo,aecho=0.8:0.4:40|70:0.2|0.1,afade=t=out:st=0.6:d=0.2" "$O/ding-hi.wav"
# ticks under a count-up or typewriter: 12 clicks, 45 ms apart
f -f lavfi -i "aevalsrc='sin(2*PI*3200*t)*exp(-mod(t,0.045)*900)*lt(t,0.54)':s=48000:d=0.6" -af "aformat=channel_layouts=stereo,highpass=f=1500" "$O/ticks.wav"
# boom (the biggest reveal only): falling 60 Hz + low noise
f -f lavfi -i "aevalsrc='sin(2*PI*(60*t-12*t*t))*exp(-t*3.5)':s=48000:d=1.0" -f lavfi -i "anoisesrc=c=brown:r=48000:d=0.25:a=0.6:seed=2" \
  -filter_complex "[1:a]lowpass=f=400,afade=t=out:st=0.02:d=0.22[n];[0:a][n]amix=inputs=2:normalize=0,aformat=channel_layouts=stereo,afade=t=out:st=0.8:d=0.2" "$O/boom.wav"
# stamp thump (rubber stamp lands)
f -f lavfi -i "aevalsrc='0.9*sin(2*PI*(70*t+40*(1-exp(-t*30))/30))*exp(-t*14)':s=48000:d=0.4" -f lavfi -i "anoisesrc=c=pink:r=48000:d=0.08:a=0.7:seed=5" \
  -filter_complex "[1:a]lowpass=f=3000,afade=t=out:st=0.01:d=0.07[n];[0:a][n]amix=inputs=2:normalize=0,aformat=channel_layouts=stereo,afade=t=out:st=0.3:d=0.1" "$O/thump.wav"
# zip (strike-through)
f -f lavfi -i "anoisesrc=c=white:r=48000:d=0.16:a=0.6:seed=4" -af "highpass=f=2500,volume='sin(PI*t/0.16)':eval=frame,aformat=channel_layouts=stereo" "$O/zip.wav"
# mouse click (diagram card lands)
f -f lavfi -i "aevalsrc='(0.8*sin(2*PI*2400*t)+0.5*sin(2*PI*900*t))*exp(-t*600)':s=48000:d=0.05" -af "aformat=channel_layouts=stereo" "$O/click.wav"

for x in "$O"/*.wav; do
  I=$(ffmpeg -hide_banner -nostats -i "$x" -af "apad=pad_dur=1,ebur128" -f null - 2>&1 | awk '/^ +I:/{print $2}' | tail -1)
  echo "$(basename "$x") $I LUFS"
done
