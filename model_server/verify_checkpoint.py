import torch, timm

CKPT = "swinv2_weights_only.pth"
MODEL_NAME = "swinv2_base_window12to24_192to384.ms_in22k_ft_in1k"

sd = torch.load(CKPT, map_location="cpu", weights_only=False)
print("Has module. prefix:", any(k.startswith("module.") for k in sd))
sd = {k.replace("module.", "", 1): v for k, v in sd.items()}

model = timm.create_model(MODEL_NAME, pretrained=False, num_classes=8)
print(model.load_state_dict(sd, strict=True))
print("Params:", sum(p.numel() for p in model.parameters()))