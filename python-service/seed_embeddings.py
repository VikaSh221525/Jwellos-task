"""
seed_embeddings.py
==================
Standalone script – run once to populate Pinecone with CLIP embeddings for
all 15 earring inventory images.

Usage (from python-service/ with venv activated):
    python seed_embeddings.py

The script tries the running FastAPI service first, then falls back to
running the embedding pipeline locally.
"""

import os
import sys
from pathlib import Path

_HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(_HERE))

from dotenv import load_dotenv
load_dotenv(_HERE / ".env")

import requests  # noqa: E402

SERVICE_URL = os.environ.get("CLIP_SERVICE_URL", "http://localhost:8000")

# ── Try the running service first ─────────────────────────────────────────────
try:
    resp = requests.post(f"{SERVICE_URL}/seed-embeddings", timeout=300)
    resp.raise_for_status()
    data = resp.json()
    print(f"✅  Seeded {data['seeded']} earring embeddings into Pinecone.")
    print("   IDs:", ", ".join(data["ids"]))
    sys.exit(0)
except Exception as exc:
    print(f"⚠️   Could not reach running service ({exc}).")
    print("    Starting local embedding pipeline instead…\n")

# ── Local fallback ─────────────────────────────────────────────────────────────
import torch
from PIL import Image
from pinecone import Pinecone, ServerlessSpec
# Use CLIPVisionModelWithProjection — always returns .image_embeds as a plain tensor
from transformers import CLIPVisionModelWithProjection, CLIPImageProcessor

CLIP_MODEL_ID = "openai/clip-vit-base-patch32"
PINECONE_API_KEY = os.environ["PINECONE_API_KEY"]
PINECONE_INDEX_NAME = os.environ.get("PINECONE_INDEX_NAME", "jwellos")
INVENTORY_DIR = Path(os.environ.get("INVENTORY_DIR", str(_HERE.parent / "public" / "inventory")))
EMBED_DIM = 512

EARRING_INVENTORY = [
    {"id": "E01",  "image": "Ear_1.jpg",  "name": "Lakshmi Pearl Chandbali"},
    {"id": "E02",  "image": "Ear_2.jpg",  "name": "Emerald Petal Drops"},
    {"id": "E03",  "image": "Ear_3.jpg",  "name": "Rose Bloom Drops"},
    {"id": "E04",  "image": "Ear_4.jpg",  "name": "Emerald Pearl Jhumka"},
    {"id": "E05",  "image": "Ear_5.jpg",  "name": "Emerald Filigree Jhumka"},
    {"id": "E06",  "image": "Ear_6.jpg",  "name": "Emerald Canopy Jhumka"},
    {"id": "E07",  "image": "Ear_7.jpg",  "name": "Ruby Teardrop Drops"},
    {"id": "E08",  "image": "Ear_8.jpg",  "name": "Antique Ruby Chandbali"},
    {"id": "E09",  "image": "Ear_9.jpg",  "name": "Navaratna Cluster Studs"},
    {"id": "E010", "image": "Ear_10.jpg", "name": "Antique Lakshmi Chandbali"},
    {"id": "E011", "image": "Ear_11.jpg", "name": "Emerald Temple Chandelier"},
    {"id": "E012", "image": "Ear_12.jpg", "name": "Ruby Temple Jhumka"},
    {"id": "E013", "image": "Ear_13.jpg", "name": "Ruby Pearl Chandbali"},
    {"id": "E014", "image": "Ear_14.jpg", "name": "Emerald Bead Chandbali"},
    {"id": "E015", "image": "Ear_15.jpg", "name": "Antique Temple Jhumka"},
]

print("Loading CLIP model…")
processor = CLIPImageProcessor.from_pretrained(CLIP_MODEL_ID)
model = CLIPVisionModelWithProjection.from_pretrained(CLIP_MODEL_ID)
model.eval()
print("Model ready.\n")

pc = Pinecone(api_key=PINECONE_API_KEY)
existing_names = [idx.name for idx in pc.list_indexes().indexes]
if PINECONE_INDEX_NAME not in existing_names:
    print(f"Creating Pinecone index '{PINECONE_INDEX_NAME}'…")
    pc.create_index(
        name=PINECONE_INDEX_NAME,
        dimension=EMBED_DIM,
        metric="cosine",
        spec=ServerlessSpec(cloud="aws", region="us-east-1"),
    )
index = pc.Index(PINECONE_INDEX_NAME)

vectors = []
for item in EARRING_INVENTORY:
    img_path = INVENTORY_DIR / item["image"]
    if not img_path.exists():
        print(f"  ❌  Missing: {img_path}")
        continue
    image = Image.open(img_path).convert("RGB")
    inputs = processor(images=image, return_tensors="pt")
    with torch.no_grad():
        # CLIPVisionModelWithProjection returns .image_embeds — always a plain tensor
        outputs = model(**inputs)
        features = outputs.image_embeds  # shape: (1, 512)
    features = features / features.norm(dim=-1, keepdim=True)
    embedding = features[0].cpu().numpy().tolist()
    vectors.append({
        "id": item["id"],
        "values": embedding,
        "metadata": {"name": item["name"], "image": item["image"]},
    })
    print(f"  ✅  {item['id']:5s}  {item['name']}")

index.upsert(vectors=vectors)
print(f"\n🎉  Seeded {len(vectors)} earring embeddings into Pinecone index '{PINECONE_INDEX_NAME}'.")
