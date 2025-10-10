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

def img_to_embedding_from_pil(img: Image.Image) -> np.ndarray:
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

@app.post("/classify")
async def classify_image(
    file: UploadFile = File(...)
):
    try:
        # Lees de afbeelding als bytes
        content = await file.read()

        # Sla tijdelijk op als bestand voor PIL
        import tempfile
        import os

        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp_file:
            temp_file.write(content)
            temp_file_path = temp_file.name

        try:
            # Laad de afbeelding met PIL
            img = Image.open(temp_file_path).convert("RGB")
            img_vec = img_to_embedding_from_pil(img)
        finally:
            # Ruim tijdelijk bestand op
            os.unlink(temp_file_path)

        # Categorie labels voor classificatie (dezelfde als in categoryDetection.ts)
        category_labels = [
            # Voertuigen
            "auto", "wagen", "personenwagen", "sedan", "hatchback", "stationwagen",
            "bestelwagen", "busje", "van", "transporter",
            "oldtimer", "klassieker", "vintage auto", "historische auto",
            "motorfiets", "motor", "motors", "motorrijwiel",
            "auto-onderdelen", "auto onderdelen", "autodelen", "wagenonderdelen", "car parts",

            # Fietsen
            "fiets", "rijwiel", "twee wieler", "tweewieler",
            "racefiets", "koersfiets", "road bike", "wegfiets",
            "mountainbike", "mtb", "bergfiets", "all mountain", "cross country",
            "ebike", "elektrische fiets", "e-bike",
            "brommer", "brommers", "scooter", "bromfiets",
            "fiets-onderdelen", "fiets accessoires", "bike parts",

            # Huis & Inrichting
            "meubel", "meubels", "meubilair", "tafel", "stoel", "kast", "bed", "bank",
            "verlichting", "lamp", "lampen", "licht", "spots", "led", "hanglamp",
            "decoratie", "decoraties", "sieraden", "ornamenten", "decoratief", "vaas", "kussen",
            "keuken", "kookgerei", "pannen", "servies", "bestek", "oven", "kookplaat",
            "huishoudtoestellen", "wasmachine", "droger", "koelkast", "magnetron", "stofzuiger",

            # Tuin & Terras
            "tuinmeubelen", "tuin meubels", "buitenmeubels", "terrassen", "tuinstoelen", "tuintafel",
            "tuingereedschap", "grasmaaier", "heggenschaar", "tuinapparatuur", "schop", "hark",
            "bbq", "barbecue", "grill", "buitenkeuken",
            "zwembad", "zwembaden", "pool", "jacuzzi", "spa", "wellness",

            # Elektronica
            "televisie", "tv", "beeldscherm", "smart tv", "led tv", "oled",
            "audio", "hifi", "hi-fi", "muziek", "geluid", "speakers", "boxen", "versterker",
            "koptelefoon", "koptelefoons", "headphones", "headset", "oortjes", "earbuds",
            "camera", "camera's", "fotocamera", "videocamera", "digitale camera", "dslr",

            # Computers
            "laptop", "laptops", "notebook", "draagbare computer",
            "desktop", "desktops", "pc", "computer", "computer's", "toren", "tower",
            "randapparatuur", "printer", "scanner", "muis", "toetsenbord", "monitor", "webcam",
            "componenten", "moederbord", "processor", "ram", "harddisk", "ssd", "videokaart",

            # Kleding
            "kleding", "clothes", "clothing", "shirt", "broek", "pants", "jas", "coat",
            "schoenen", "shoes",

            # Sport & Hobby
            "sport", "sports", "fitness", "gymnastiek", "instrument", "gitaar", "guitar", "piano",

            # Boeken & Media
            "boek", "book", "cd", "dvd", "vinyl",

            # Speelgoed & Baby
            "speelgoed", "toy", "baby", "kinderwagen", "stroller"
        ]

        # Maak embeddings van alle categorie labels
        label_vecs = model.encode(category_labels, normalize_embeddings=True, convert_to_numpy=True)

        # Bereken similarity tussen afbeelding en alle categorie labels
        similarities = np.dot(label_vecs, img_vec) / (np.linalg.norm(label_vecs, axis=1) * np.linalg.norm(img_vec))

        # Vind de beste match
        best_idx = np.argmax(similarities)
        best_score = float(similarities[best_idx])
        best_label = category_labels[best_idx]

        # Map naar categorie index (zelfde mapping als in categoryDetection.ts)
        category_mapping = {
            # Voertuigen (0)
            "auto": 0, "wagen": 0, "personenwagen": 0, "sedan": 0, "hatchback": 0, "stationwagen": 0,
            "bestelwagen": 0, "busje": 0, "van": 0, "transporter": 0,
            "oldtimer": 0, "klassieker": 0, "vintage auto": 0, "historische auto": 0,
            "motorfiets": 0, "motor": 0, "motors": 0, "motorrijwiel": 0,
            "auto-onderdelen": 0, "auto onderdelen": 0, "autodelen": 0, "wagenonderdelen": 0, "car parts": 0,

            # Fietsen (1)
            "fiets": 1, "rijwiel": 1, "twee wieler": 1, "tweewieler": 1,
            "racefiets": 1, "koersfiets": 1, "road bike": 1, "wegfiets": 1,
            "mountainbike": 1, "mtb": 1, "bergfiets": 1, "all mountain": 1, "cross country": 1,
            "ebike": 1, "elektrische fiets": 1, "e-bike": 1,
            "brommer": 1, "brommers": 1, "scooter": 1, "bromfiets": 1,
            "fiets-onderdelen": 1, "fiets accessoires": 1, "bike parts": 1,

            # Huis & Inrichting (2)
            "meubel": 2, "meubels": 2, "meubilair": 2, "tafel": 2, "stoel": 2, "kast": 2, "bed": 2, "bank": 2,
            "verlichting": 2, "lamp": 2, "lampen": 2, "licht": 2, "spots": 2, "led": 2, "hanglamp": 2,
            "decoratie": 2, "decoraties": 2, "sieraden": 2, "ornamenten": 2, "decoratief": 2, "vaas": 2, "kussen": 2,
            "keuken": 2, "kookgerei": 2, "pannen": 2, "servies": 2, "bestek": 2, "oven": 2, "kookplaat": 2,
            "huishoudtoestellen": 2, "wasmachine": 2, "droger": 2, "koelkast": 2, "magnetron": 2, "stofzuiger": 2,

            # Tuin & Terras (3)
            "tuinmeubelen": 3, "tuin meubels": 3, "buitenmeubels": 3, "terrassen": 3, "tuinstoelen": 3, "tuintafel": 3,
            "tuingereedschap": 3, "grasmaaier": 3, "heggenschaar": 3, "tuinapparatuur": 3, "schop": 3, "hark": 3,
            "bbq": 3, "barbecue": 3, "grill": 3, "buitenkeuken": 3,
            "zwembad": 3, "zwembaden": 3, "pool": 3, "jacuzzi": 3, "spa": 3, "wellness": 3,

            # Elektronica (4)
            "televisie": 4, "tv": 4, "beeldscherm": 4, "smart tv": 4, "led tv": 4, "oled": 4,
            "audio": 4, "hifi": 4, "hi-fi": 4, "muziek": 4, "geluid": 4, "speakers": 4, "boxen": 4, "versterker": 4,
            "koptelefoon": 4, "koptelefoons": 4, "headphones": 4, "headset": 4, "oortjes": 4, "earbuds": 4,
            "camera": 4, "camera's": 4, "fotocamera": 4, "videocamera": 4, "digitale camera": 4, "dslr": 4,

            # Computers (5)
            "laptop": 5, "laptops": 5, "notebook": 5, "draagbare computer": 5,
            "desktop": 5, "desktops": 5, "pc": 5, "computer": 5, "computer's": 5, "toren": 5, "tower": 5,
            "randapparatuur": 5, "printer": 5, "scanner": 5, "muis": 5, "toetsenbord": 5, "monitor": 5, "webcam": 5,
            "componenten": 5, "moederbord": 5, "processor": 5, "ram": 5, "harddisk": 5, "ssd": 5, "videokaart": 5,

            # Kleding (6)
            "kleding": 6, "clothes": 6, "clothing": 6, "shirt": 6, "broek": 6, "pants": 6, "jas": 6, "coat": 6,
            "schoenen": 6, "shoes": 6,

            # Sport & Hobby (7)
            "sport": 7, "sports": 7, "fitness": 7, "gymnastiek": 7, "instrument": 7, "gitaar": 7, "guitar": 7, "piano": 7,

            # Boeken & Media (8)
            "boek": 8, "book": 8, "cd": 8, "dvd": 8, "vinyl": 8,

            # Speelgoed & Baby (9)
            "speelgoed": 9, "toy": 9, "baby": 9, "kinderwagen": 9, "stroller": 9
        };

        category_index = category_mapping.get(best_label, 0);

        # Subcategorie mapping (vereenvoudigd)
        subcategory_mapping = {
            # Fietsen subcategorieën
            "fiets": "stadsfietsen", "rijwiel": "stadsfietsen", "twee wieler": "stadsfietsen", "tweewieler": "stadsfietsen",
            "racefiets": "racefietsen", "koersfiets": "racefietsen", "road bike": "racefietsen", "wegfiets": "racefietsen",
            "mountainbike": "mountainbikes", "mtb": "mountainbikes", "bergfiets": "mountainbikes", "all mountain": "mountainbikes", "cross country": "mountainbikes",
            "ebike": "e-bikes", "elektrische fiets": "e-bikes", "e-bike": "e-bikes",
            "brommer": "brommers", "brommers": "brommers", "scooter": "brommers", "bromfiets": "brommers",

            # Auto subcategorieën
            "auto": "personenwagens", "wagen": "personenwagens", "personenwagen": "personenwagens", "sedan": "personenwagens", "hatchback": "personenwagens", "stationwagen": "personenwagens",
            "bestelwagen": "bestelwagens", "busje": "bestelwagens", "van": "bestelwagens", "transporter": "bestelwagens",
            "oldtimer": "oldtimers", "klassieker": "oldtimers", "vintage auto": "oldtimers", "historische auto": "oldtimers",
            "motorfiets": "motorfietsen", "motor": "motorfietsen", "motors": "motorfietsen", "motorrijwiel": "motorfietsen",

            # Huis subcategorieën
            "meubel": "meubels", "meubels": "meubels", "meubilair": "meubels", "tafel": "meubels", "stoel": "meubels", "kast": "meubels", "bed": "meubels", "bank": "meubels",
            "verlichting": "verlichting", "lamp": "verlichting", "lampen": "verlichting", "licht": "verlichting", "spots": "verlichting", "led": "verlichting", "hanglamp": "verlichting",
            "decoratie": "decoratie", "decoraties": "decoratie", "sieraden": "decoratie", "ornamenten": "decoratie", "decoratief": "decoratie", "vaas": "decoratie", "kussen": "decoratie",
            "keuken": "wonen-keuken", "kookgerei": "wonen-keuken", "pannen": "wonen-keuken", "servies": "wonen-keuken", "bestek": "wonen-keuken", "oven": "wonen-keuken", "kookplaat": "wonen-keuken",
            "huishoudtoestellen": "huishoudtoestellen", "wasmachine": "huishoudtoestellen", "droger": "huishoudtoestellen", "koelkast": "huishoudtoestellen", "magnetron": "huishoudtoestellen", "stofzuiger": "huishoudtoestellen",

            # Tuin subcategorieën
            "tuinmeubelen": "tuinmeubelen", "tuin meubels": "tuinmeubelen", "buitenmeubels": "tuinmeubelen", "terrassen": "tuinmeubelen", "tuinstoelen": "tuinmeubelen", "tuintafel": "tuinmeubelen",
            "tuingereedschap": "tuingereedschap", "grasmaaier": "tuingereedschap", "heggenschaar": "tuingereedschap", "tuinapparatuur": "tuingereedschap", "schop": "tuingereedschap", "hark": "tuingereedschap",
            "bbq": "bbq", "barbecue": "bbq", "grill": "bbq", "buitenkeuken": "bbq",
            "zwembad": "zwembad", "zwembaden": "zwembad", "pool": "zwembad", "jacuzzi": "zwembad", "spa": "zwembad", "wellness": "zwembad",

            # Elektronica subcategorieën
            "televisie": "tv", "tv": "tv", "beeldscherm": "tv", "smart tv": "tv", "led tv": "tv", "oled": "tv",
            "audio": "audio-hifi", "hifi": "audio-hifi", "hi-fi": "audio-hifi", "muziek": "audio-hifi", "geluid": "audio-hifi", "speakers": "audio-hifi", "boxen": "audio-hifi", "versterker": "audio-hifi",
            "koptelefoon": "headphones", "koptelefoons": "headphones", "headphones": "headphones", "headset": "headphones", "oortjes": "headphones", "earbuds": "headphones",
            "camera": "cameras", "camera's": "cameras", "fotocamera": "cameras", "videocamera": "cameras", "digitale camera": "cameras", "dslr": "cameras",

            # Computer subcategorieën
            "laptop": "laptops", "laptops": "laptops", "notebook": "laptops", "draagbare computer": "laptops",
            "desktop": "desktops", "desktops": "desktops", "pc": "desktops", "computer": "desktops", "computer's": "desktops", "toren": "desktops", "tower": "desktops",
            "randapparatuur": "randapparatuur", "printer": "randapparatuur", "scanner": "randapparatuur", "muis": "randapparatuur", "toetsenbord": "randapparatuur", "monitor": "randapparatuur", "webcam": "randapparatuur",
            "componenten": "componenten", "moederbord": "componenten", "processor": "componenten", "ram": "componenten", "harddisk": "componenten", "ssd": "componenten", "videokaart": "componenten",

            # Kleding subcategorieën
            "kleding": "kleding", "clothes": "kleding", "clothing": "kleding", "shirt": "kleding", "broek": "kleding", "pants": "kleding", "jas": "kleding", "coat": "kleding",
            "schoenen": "schoenen", "shoes": "schoenen",

            # Sport subcategorieën
            "sport": "sport", "sports": "sport", "fitness": "fitness", "gymnastiek": "fitness", "instrument": "muziek", "gitaar": "muziek", "guitar": "muziek", "piano": "muziek",

            # Media subcategorieën
            "boek": "boeken", "book": "boeken", "cd": "cd-dvd", "dvd": "cd-dvd", "vinyl": "cd-dvd",

            # Baby subcategorieën
            "speelgoed": "speelgoed", "toy": "speelgoed", "baby": "baby-artikelen", "kinderwagen": "baby-artikelen", "stroller": "baby-artikelen"
        };

        subcategory_slug = subcategory_mapping.get(best_label);

        return {
            "ok": True,
            "category_index": category_index,
            "subcategory_slug": subcategory_slug,
            "confidence": best_score,
            "detected_label": best_label
        }

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
