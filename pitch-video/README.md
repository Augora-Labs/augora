# Stellar Trade Project Video

This directory contains the source files for a new project overview video. The old branded video and captions were removed because their product claims no longer match the code. Generate a new video from the current source before sharing.

The renderer uses Microsoft Edge, FFmpeg, FFprobe, Python, and `edge-tts`. It captures the current static site, generates narration and captions, and writes `Stellar-Trade-Overview.mp4`.

```powershell
powershell -ExecutionPolicy Bypass -File pitch-video/render.ps1
```

Install the narration dependency with `python -m pip install edge-tts`. Review the generated video, spoken claims, duration, and file size before sharing.
