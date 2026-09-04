"""
Jewellos – CLIP + Pinecone recommendation service
===================================================
FastAPI micro-service that:
  1. Loads openai/clip-vit-base-patch32 once at startup (512-dim image embeddings)
  2. Exposes POST /seed-embeddings  – upsert all 15 earring vectors into Pinecone
  3. Exposes POST /embed-and-match  – embed an uploaded necklace image, query Pinecone,
                                      return top-k matching earring IDs with scores
  4. Exposes GET  /health           – liveness probe for Render / Railway

Run locally:
  uvicorn main:app --reload --port 8000
"""

from __future__ import annotations

import base64
import io
import os
from pathlib import Path
from typing import Any

import torch
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from pinecone import Pinecone, ServerlessSpec
# Use CLIPVisionModelWithProjection — always returns .image_embeds as a plain tensor
# regardless of transformers version (4.x or 5.x)
from transformers import CLIPVisionModelWithProjection, CLIPImageProcessor

load_dotenv()

# ── constants ─────────────────────────────────────────────────────────────────
CLIP_MODEL_ID = "openai/clip-vit-base-patch32"
PINECONE_API_KEY = os.environ["PINECONE_API_KEY"]
PINECONE_INDEX_NAME = os.environ.get("PINECONE_INDEX_NAME", "jwellos")
EMBED_DIM = 512

# Earring inventory — IDs and filenames must match the Next.js catalog
EARRING_INVENTORY: list[dict[str, str]] = [
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

# Resolve the public/inventory directory relative to this file or via env override
_BASE_DIR = Path(__file__).resolve().parent.parent  # repo root
INVENTORY_DIR = Path(os.environ.get("INVENTORY_DIR", str(_BASE_DIR / "public" / "inventory")))

# ── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI(title="Jewellos CLIP Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten in production: allow only your Vercel domain
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── lazy-loaded singletons ────────────────────────────────────────────────────
_clip_model: CLIPVisionModelWithProjection | None = None
_clip_processor: CLIPImageProcessor | None = None
_pinecone_index: Any = None


def get_clip() -> tuple[CLIPVisionModelWithProjection, CLIPImageProcessor]:
    global _clip_model, _clip_processor
    if _clip_model is None:
        print("Loading CLIP model…")
        _clip_processor = CLIPImageProcessor.from_pretrained(CLIP_MODEL_ID)
        _clip_model = CLIPVisionModelWithProjection.from_pretrained(CLIP_MODEL_ID)
        _clip_model.eval()
        print("CLIP model ready.")
    return _clip_model, _clip_processor  # type: ignore[return-value]


def get_pinecone_index():
    global _pinecone_index
    if _pinecone_index is None:
        pc = Pinecone(api_key=PINECONE_API_KEY)
        # pinecone v10: list_indexes() returns an IndexList object with .indexes
        existing_names = [idx.name for idx in pc.list_indexes().indexes]
        if PINECONE_INDEX_NAME not in existing_names:
            pc.create_index(
                name=PINECONE_INDEX_NAME,
                dimension=EMBED_DIM,
                metric="cosine",
                spec=ServerlessSpec(cloud="aws", region="us-east-1"),
            )
        _pinecone_index = pc.Index(PINECONE_INDEX_NAME)
    return _pinecone_index


# ── helpers ───────────────────────────────────────────────────────────────────

def embed_image(image: Image.Image) -> list[float]:
    """Return a normalised 512-dim CLIP embedding for a PIL image."""
    model, processor = get_clip()
    inputs = processor(images=image, return_tensors="pt")
    with torch.no_grad():
        # CLIPVisionModelWithProjection always returns image_embeds as a plain tensor
        outputs = model(**inputs)
        features = outputs.image_embeds  # shape: (1, 512)
    # L2-normalise so cosine similarity == dot product
    features = features / features.norm(dim=-1, keepdim=True)
    return features[0].cpu().numpy().tolist()


def load_image_from_bytes(data: bytes) -> Image.Image:
    return Image.open(io.BytesIO(data)).convert("RGB")


# ── startup: pre-warm CLIP ────────────────────────────────────────────────────

@app.on_event("startup")
async def _startup():
    get_clip()
    get_pinecone_index()


# ── routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "model": CLIP_MODEL_ID, "index": PINECONE_INDEX_NAME}


@app.post("/seed-embeddings")
def seed_embeddings():
    """
    Precompute CLIP embeddings for all 15 earring images and upsert into Pinecone.
    Call this ONCE before using /embed-and-match. Safe to call multiple times (idempotent).
    """
    index = get_pinecone_index()
    vectors: list[dict] = []

    for item in EARRING_INVENTORY:
        img_path = INVENTORY_DIR / item["image"]
        if not img_path.exists():
            raise HTTPException(
                status_code=500,
                detail=f"Inventory image not found: {img_path}. "
                       f"Set INVENTORY_DIR env var or copy images to public/inventory/.",
            )
        image = Image.open(img_path).convert("RGB")
        embedding = embed_image(image)
        vectors.append({
            "id": item["id"],
            "values": embedding,
            "metadata": {"name": item["name"], "image": item["image"]},
        })
        print(f"  Embedded {item['id']} – {item['name']}")

    index.upsert(vectors=vectors)
    return {"seeded": len(vectors), "ids": [v["id"] for v in vectors]}


@app.post("/embed-and-match")
async def embed_and_match(
    file: UploadFile = File(None),
    image_base64: str = Form(None),
    top_k: int = Form(3),
):
    """
    Accept a necklace image (multipart file OR base64 string) and return the
    top-k matching earrings from the Pinecone index.
    """
    if file is None and not image_base64:
        raise HTTPException(status_code=400, detail="Provide 'file' (multipart) or 'image_base64'.")

    if top_k < 1 or top_k > 15:
        top_k = 3

    # Decode image
    try:
        if file is not None:
            raw = await file.read()
        else:
            raw = base64.b64decode(image_base64)
        image = load_image_from_bytes(raw)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not decode image: {exc}") from exc

    # Generate CLIP embedding
    query_vector = embed_image(image)

    # Query Pinecone
    index = get_pinecone_index()
    result = index.query(
        vector=query_vector,
        top_k=top_k,
        include_metadata=True,
    )

    # pinecone v10: result is an object with .matches (list of ScoredVector objects)
    matches = [
        {
            "id": match.id,
            "score": round(float(match.score) * 100, 1),  # cosine → 0-100
            "name": (match.metadata or {}).get("name", ""),
            "image": (match.metadata or {}).get("image", ""),
        }
        for match in result.matches
    ]

    return {"matches": matches, "model": CLIP_MODEL_ID}
