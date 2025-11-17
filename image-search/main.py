from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import base64
import io
from PIL import Image
import torch
from transformers import CLIPProcessor, CLIPModel
import numpy as np

app = FastAPI()

# Load CLIP model
model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")

# Define categories (example)
categories = [
    "Elektronica",
    "Kleding",
    "Boeken",
    "Huis & Tuin",
    "Auto's",
    "Sport",
    "Muziek",
    "Speelgoed",
    "Overig"
]

class ClassifyRequest(BaseModel):
    text: str
    image: str  # base64

@app.post("/classify")
async def classify(request: ClassifyRequest):
    try:
        # Decode image
        image_data = base64.b64decode(request.image.split(',')[1] if ',' in request.image else request.image)
        image = Image.open(io.BytesIO(image_data)).convert("RGB")

        # Prepare inputs
        inputs = processor(text=categories, images=image, return_tensors="pt", padding=True)

        # Get predictions
        with torch.no_grad():
            outputs = model(**inputs)
            logits_per_image = outputs.logits_per_image
            probs = logits_per_image.softmax(dim=1)

        # Get top category
        confidence, category_index = torch.max(probs, dim=1)
        category_index = category_index.item()
        confidence = confidence.item()

        return {
            "category_index": category_index,
            "confidence": confidence,
            "category": categories[category_index]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
