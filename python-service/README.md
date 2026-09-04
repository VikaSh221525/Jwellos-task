# Jewellos Python CLIP Service

FastAPI micro-service that powers the **CLIP AI matching** feature of the Jewellos prototype.

## How it works

1. **At startup** — loads `openai/clip-vit-base-patch32` from HuggingFace (~600 MB download on first run, then cached).
2. **Seed once** — `POST /seed-embeddings` encodes all 15 earring images and stores 512-dim vectors in Pinecone.
3. **Per request** — `POST /embed-and-match` encodes the uploaded necklace image and queries Pinecone for cosine-nearest earrings.

## Local setup

```bash
cd python-service

# 1. Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env
# → Edit .env and paste your PINECONE_API_KEY

# 4. Start the service
uvicorn main:app --reload --port 8000

# 5. Seed Pinecone (run once)
python seed_embeddings.py
```

The service will be available at `http://localhost:8000`.
Check `http://localhost:8000/docs` for the interactive Swagger UI.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `PINECONE_API_KEY` | ✅ | Your Pinecone API key |
| `PINECONE_INDEX_NAME` | default: `jwellos` | Pinecone index name |
| `INVENTORY_DIR` | default: `../public/inventory` | Path to earring images |
| `PORT` | default: `8000` | Service port |

## Deploying to Render

1. Push the entire `jwellos` repo to GitHub.
2. On [render.com](https://render.com) → **New → Web Service**.
3. Connect your GitHub repo.
4. Settings:
   - **Root directory**: `python-service`
   - **Runtime**: Python 3
   - **Build command**: `pip install -r requirements.txt`
   - **Start command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables: `PINECONE_API_KEY`, `PINECONE_INDEX_NAME`.
6. For `INVENTORY_DIR` — the earring images need to be accessible. Options:
   - **Option A (recommended for demo)**: Seed Pinecone locally first, then the service only needs to query Pinecone (no images needed at runtime for matching).
   - **Option B**: Copy `public/inventory/` into `python-service/inventory/` and set `INVENTORY_DIR=inventory`.
7. After deploying, copy the Render URL (e.g. `https://jewellos-clip.onrender.com`).
8. Set `CLIP_SERVICE_URL=https://jewellos-clip.onrender.com` in your Vercel environment variables.

> **Note**: Render free tier sleeps after 15 minutes of inactivity. The first request after wake-up may take 30–60 seconds (CLIP model reload). This is expected for a demo.

## API Reference

### `GET /health`
Returns service status.

### `POST /seed-embeddings`
Generates and stores all 15 earring CLIP embeddings in Pinecone. Run once.

### `POST /embed-and-match`
Accepts a necklace image, returns top matching earrings.

**Form fields:**
- `file` — image file (multipart)
- `top_k` — number of results (default: 3)

**Response:**
```json
{
  "matches": [
    { "id": "E01", "score": 87.3, "name": "Lakshmi Pearl Chandbali", "image": "Ear_1.jpg" },
    ...
  ],
  "model": "openai/clip-vit-base-patch32"
}
```
