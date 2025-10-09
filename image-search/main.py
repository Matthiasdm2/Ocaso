from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import JSONResponse
from PIL import Image
from io import BytesIO
import numpy as np
import os
import hashlib
from qdrant_client import QdrantClient
from qdrant_client.http import models as qm
from sentence_transformers import SentenceTransformer

QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
COLLECTION = "ocaso_images"
MODEL_ID = os.getenv("MODEL_ID", "clip-ViT-B-32")

app = FastAPI(title="Ocaso Image Search Service")

# Warm: load once at startup
model = SentenceTransformer(MODEL_ID)

# Robustly resolve embedding dimension (handles models where the helper returns None)
def _resolve_dim() -> int:
    try:
        get_dim = getattr(model, "get_sentence_embedding_dimension", None)
        if callable(get_dim):
            val = get_dim()
            if isinstance(val, int) and val > 0:
                return val
        # Fallback: do a tiny text encode to inspect the vector size
        vec = model.encode(["probe"], normalize_embeddings=True, convert_to_numpy=True)
        if hasattr(vec, "shape") and len(vec.shape) == 2 and vec.shape[1] > 0:
            return int(vec.shape[1])
    except Exception:
        pass
    # Safe default for CLIP ViT-B/32 and many sbert models
    return 512

dim = _resolve_dim()
client = QdrantClient(url=QDRANT_URL)

def ensure_collection():
    try:
        client.get_collection(COLLECTION)
    except Exception:
        client.recreate_collection(
            collection_name=COLLECTION,
            vectors_config=qm.VectorParams(
                size=dim,
                distance=qm.Distance.COSINE
            ),
            hnsw_config=qm.HnswConfigDiff(m=32, ef_construct=128)
        )
ensure_collection()

def img_to_embedding(img_bytes: bytes) -> np.ndarray:
    img = Image.open(BytesIO(img_bytes)).convert("RGB")
    emb = model.encode([img], batch_size=1, normalize_embeddings=True, convert_to_numpy=True)
    return emb[0].astype(np.float32)

def make_point_id(listing_id: str, image_url: str) -> int:
    # Deterministic 64-bit integer ID derived from listing_id + image_url
    h = hashlib.sha1((listing_id + '|' + image_url).encode('utf-8')).digest()
    return int.from_bytes(h[:8], byteorder='big', signed=False)

@app.post("/index")
async def index_image(
    listing_id: str = Form(...),
    image_url: str = Form(...),
    file: UploadFile = File(...)
):
    try:
        content = await file.read()
        vec = img_to_embedding(content)
        payload = {"listing_id": listing_id, "image_url": image_url}
        client.upsert(
            collection_name=COLLECTION,
            points=[qm.PointStruct(id=make_point_id(listing_id, image_url), vector=vec.tolist(), payload=payload)]
        )
        return {"ok": True}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/search")
async def search_image(
    file: UploadFile = File(...),
    limit: int = Form(24),
):
    try:
        qbytes = await file.read()
        qvec = img_to_embedding(qbytes)

        hits = client.search(
            collection_name=COLLECTION,
            query_vector=qvec.tolist(),
            limit=limit,
            search_params=qm.SearchParams(hnsw_ef=64)
        )

        results = [
            {
                "score": float(h.score),
                "listing_id": h.payload.get("listing_id"),
                "image_url": h.payload.get("image_url")
            } for h in hits
        ]
        # Filter to high-confidence matches only
        results = [r for r in results if r["score"] > 0.5]
        return {"ok": True, "results": results}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/search-text")
async def search_text(
    q: str = Form(...),
    limit: int = Form(24),
):
    try:
        qvec = model.encode([q], normalize_embeddings=True, convert_to_numpy=True)[0].astype(np.float32)
        hits = client.search(
            collection_name=COLLECTION,
            query_vector=qvec.tolist(),
            limit=limit,
            search_params=qm.SearchParams(hnsw_ef=64)
        )
        results = [
            {
                "score": float(h.score),
                "listing_id": h.payload.get("listing_id"),
                "image_url": h.payload.get("image_url")
            } for h in hits
        ]
        return {"ok": True, "results": results}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
