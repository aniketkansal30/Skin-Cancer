import base64, io, os, time

import cv2
import numpy as np
import timm
import torch
import torch.nn.functional as F
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from torchvision import transforms
from torchvision.transforms import InterpolationMode

MODEL_NAME = "swinv2_base_window12to24_192to384.ms_in22k_ft_in1k"
NUM_CLASSES = 8
IMG_SIZE = 384
CKPT_PATH = os.getenv(
    "CHECKPOINT_PATH",
    os.path.join(os.path.dirname(__file__), "swinv2_experiment_b_best.pth"),
)
CLASS_NAMES = ["MEL", "NV", "BCC", "AK", "BKL", "DF", "VASC", "SCC"]
CLASS_FULL = {
    "MEL": "Melanoma", "NV": "Melanocytic Nevus", "BCC": "Basal Cell Carcinoma",
    "AK": "Actinic Keratosis", "BKL": "Benign Keratosis", "DF": "Dermatofibroma",
    "VASC": "Vascular Lesion", "SCC": "Squamous Cell Carcinoma",
}
MAX_UPLOAD_MB = 15

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

eval_transform = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE), interpolation=InterpolationMode.BICUBIC),
    transforms.ToTensor(),
    transforms.Normalize((0.485, 0.456, 0.406), (0.229, 0.224, 0.225)),
])


def load_model():
    model = timm.create_model(MODEL_NAME, pretrained=False, num_classes=NUM_CLASSES)
    ckpt = torch.load(CKPT_PATH, map_location="cpu", weights_only=False)
    sd = ckpt["model_state_dict"] if isinstance(ckpt, dict) and "model_state_dict" in ckpt else ckpt
    sd = {(k[7:] if k.startswith("module.") else k): v for k, v in sd.items()}
    model.load_state_dict(sd, strict=True)
    return model.to(DEVICE).eval()


model = load_model()
# Grad-CAM target: last block of last stage (UNVALIDATED choice)
CAM_TARGET = model.layers[-1].blocks[-1]

app = FastAPI(title="DermShield Model Server")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


def gradcam(x: torch.Tensor, class_idx: int, orig_rgb: np.ndarray) -> str:
    store = {}

    def hook(_m, _i, out):
        out.retain_grad()
        store["a"] = out

    h = CAM_TARGET.register_forward_hook(hook)
    model.zero_grad(set_to_none=True)
    with torch.enable_grad():
        logits = model(x)
        logits[0, class_idx].backward()
    h.remove()

    a, g = store["a"], store["a"].grad          # expected (B, H, W, C)
    if a.shape[-1] != a.shape[1] and a.shape[1] > a.shape[-1]:  # (B, C, H, W) case
        a, g = a.permute(0, 2, 3, 1), g.permute(0, 2, 3, 1)
    w = g.mean(dim=(1, 2), keepdim=True)
    cam = F.relu((w * a).sum(-1))[0].detach().cpu().numpy()
    cam = (cam - cam.min()) / (cam.max() - cam.min() + 1e-8)

    H, W = orig_rgb.shape[:2]
    cam = cv2.resize(cam, (W, H), interpolation=cv2.INTER_CUBIC)
    heat = cv2.applyColorMap(np.uint8(255 * cam), cv2.COLORMAP_JET)
    heat = cv2.cvtColor(heat, cv2.COLOR_BGR2RGB)
    overlay = np.uint8(0.55 * orig_rgb + 0.45 * heat)

    buf = io.BytesIO()
    Image.fromarray(overlay).save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


@app.get("/health")
def health():
    return {"status": "ok", "device": str(DEVICE), "model": MODEL_NAME, "classes": CLASS_NAMES}


@app.post("/predict")
async def predict(file: UploadFile = File(...), heatmap: bool = True):
    raw = await file.read()
    if len(raw) > MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(413, "Image too large")
    try:
        img = Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception:
        raise HTTPException(400, "Invalid image file")

    t0 = time.time()
    x = eval_transform(img).unsqueeze(0).to(DEVICE)
    with torch.no_grad():
        probs = torch.softmax(model(x), dim=1)[0].cpu().numpy()

    idx = int(probs.argmax())
    result = {
        "predictedAcronym": CLASS_NAMES[idx],
        "predictedClass": CLASS_FULL[CLASS_NAMES[idx]],
        "confidence": round(float(probs[idx]) * 100, 2),
        "probabilities": {c: round(float(p) * 100, 2) for c, p in zip(CLASS_NAMES, probs)},
        "modelName": "DermShield-SwinV2-B-384",
    }
    if heatmap:
        try:
            orig = np.array(img.resize((IMG_SIZE, IMG_SIZE), Image.BICUBIC))
            result["heatmapImage"] = gradcam(x, idx, orig)
        except Exception as e:
            result["heatmapImage"] = None
            result["heatmapError"] = str(e)
    result["durationMs"] = int((time.time() - t0) * 1000)
    return result