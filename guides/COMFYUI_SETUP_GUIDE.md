# ComfyUI + Flux Setup Guide (Windows)

**Purpose:** Unlimited free AI image generation for music video visuals, thumbnails, and B-roll
**Cost:** $0 (runs on your own hardware)
**Requirements:** NVIDIA GPU with 8GB+ VRAM (12GB+ recommended)

---

## QUICK INSTALL (Portable Version — Easiest)

```powershell
# 1. Download the portable build
# Go to: https://github.com/comfyanonymous/ComfyUI/releases
# Download: ComfyUI_windows_portable_nvidia.7z
# Extract to: D:\AI\ComfyUI\ (or any drive with 50GB+ free space)

# 2. Download Flux Schnell models (see below)

# 3. Run
cd D:\AI\ComfyUI
run_nvidia_gpu.bat
# Opens at http://127.0.0.1:8188
```

---

## MANUAL INSTALL (More Control)

### Step 1: Clone ComfyUI
```powershell
cd D:\AI
git clone https://github.com/comfyanonymous/ComfyUI.git
cd ComfyUI
```

### Step 2: Python Environment
```powershell
# Ensure Python 3.10 or 3.11 is installed
python --version

# Create virtual environment
python -m venv venv
.\venv\Scripts\activate

# Install PyTorch with CUDA
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124

# Install ComfyUI dependencies
pip install -r requirements.txt
```

### Step 3: Install ComfyUI Manager (Essential)
```powershell
cd custom_nodes
git clone https://github.com/ltdrdata/ComfyUI-Manager.git
cd ..
```
This lets you install additional nodes from the UI itself.

### Step 4: Download Flux Schnell Models

Download these files from HuggingFace:

| File | Size | Path | URL |
|------|------|------|-----|
| **Flux Schnell (FP8)** | ~12GB | `models/unet/flux1-schnell-fp8.safetensors` | [Download](https://huggingface.co/Comfy-Org/flux1-schnell/tree/main) |
| **VAE** | ~335MB | `models/vae/ae.safetensors` | [Download](https://huggingface.co/black-forest-labs/FLUX.1-schnell/tree/main) |
| **T5 Text Encoder (FP16)** | ~9.8GB | `models/clip/t5xxl_fp16.safetensors` | [Download](https://huggingface.co/comfyanonymous/flux_text_encoders/tree/main) |
| **CLIP-L** | ~235MB | `models/clip/clip_l.safetensors` | [Download](https://huggingface.co/comfyanonymous/flux_text_encoders/tree/main) |

**Low VRAM?** Use the GGUF quantized versions instead:
- Search "flux schnell GGUF" on HuggingFace
- Use `UnetLoaderGGUF` node in ComfyUI
- Q4_K_M fits in 8GB VRAM (slower but works)

### Step 5: Launch
```powershell
cd D:\AI\ComfyUI
python main.py
# Opens at http://127.0.0.1:8188
```

---

## VRAM REQUIREMENTS

| GPU | VRAM | Flux Performance |
|-----|------|-----------------|
| RTX 3060 | 12GB | Works with FP8 (~15-20s per image) |
| RTX 3070/3080 | 8-10GB | Works with GGUF quantized (~20-30s) |
| RTX 4070 Ti | 12GB | Fast FP8 (~8-12s per image) |
| RTX 4080/4090 | 16-24GB | Full FP16, fastest (~5-8s) |

**No NVIDIA GPU?** Use free cloud tools instead:
- Google Colab (free GPU): Search "ComfyUI Colab"
- Hugging Face Spaces: Search "Flux" on huggingface.co/spaces

---

## WORKFLOW: Music Video Visuals

### Generating Consistent Album Art
1. Open ComfyUI at http://127.0.0.1:8188
2. Load the Flux Schnell workflow (drag a workflow JSON onto the canvas)
3. Set prompt: `"hip hop album cover, dark moody lighting, urban cityscape, cinematic, 4k"`
4. Set steps: 4 (Schnell only needs 4 steps!)
5. Set resolution: 1024x1024 or 1024x576 (widescreen)
6. Click "Queue Prompt"

### Generating Music Video B-Roll
1. Use Consistent Style LoRAs from Civitai (free)
2. Prompt example: `"cinematic music video scene, dark warehouse, neon lights, rapper performing, dramatic lighting, film grain"`
3. Generate 20-30 frames with slight prompt variations
4. Import to DaVinci Resolve as image sequence
5. Add Ken Burns effect (slow zoom/pan) for motion

### Generating YouTube Thumbnails
1. Set resolution: 1280x720
2. Prompt: `"dramatic thumbnail background, [your theme], bold colors, eye-catching, 4k"`
3. Generate, then open in Photopea to add text overlay

---

## ESSENTIAL CUSTOM NODES (Install via ComfyUI Manager)

| Node | Purpose |
|------|---------|
| ComfyUI Manager | Auto-install other nodes |
| ControlNet | Precise pose/composition control |
| IP-Adapter | Style transfer from reference images |
| AnimateDiff | Generate video from still images |
| Ultimate SD Upscale | Upscale images to 4K+ |

---

## TROUBLESHOOTING

| Problem | Solution |
|---------|----------|
| Out of memory | Use GGUF quantized model or reduce resolution to 512x512 |
| Black images | Check VAE is loaded correctly (ae.safetensors) |
| Slow generation | Ensure CUDA is enabled: `nvidia-smi` should show GPU |
| Missing nodes | Install ComfyUI Manager, then search for the node |
| Model not found | Check file is in correct `models/` subfolder |

---

## QUICK REFERENCE COMMANDS

```powershell
# Start ComfyUI
python main.py

# Start with specific port
python main.py --port 8189

# Start with low VRAM mode
python main.py --lowvram

# Start and open browser automatically
python main.py --auto-launch
```

---

*Created: June 2026*
