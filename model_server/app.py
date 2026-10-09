import gradio as gr
from model_server import app as fastapi_app

# Gradio Web UI preview
with gr.Blocks(title="DermShield AI Model Service") as demo:
    gr.Markdown("# 🛡️ DermShield AI — Swin Transformer V2 Model Service")
    gr.Markdown("FastAPI endpoint active at `/predict?heatmap=true` for DermShield AI Web App.")
    gr.Markdown("Status: **Online (24/7)**")

# Mount FastAPI app so all API endpoints (/predict, /health) are active on the root URL
app = gr.mount_gradio_app(fastapi_app, demo, path="/")
