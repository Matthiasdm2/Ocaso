FROM python:3.11-slim

# System deps for onnxruntime/pillow
RUN apt-get update && apt-get install -y \
    libgl1 libglib2.0-0 curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Model cache dir (Transformers v5+ friendly)
ENV HF_HOME=/models
RUN mkdir -p /models

# Pre-download lightweight CLIP model to avoid cold starts
RUN python - <<'PY'
from sentence_transformers import SentenceTransformer
SentenceTransformer("clip-ViT-B-32")
PY

COPY main.py .

EXPOSE 9000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "9000"]
