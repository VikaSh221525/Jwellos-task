# Jewellos Match Studio

A premium, single-page prototype that recommends matching earrings from the Jewellos inventory when a shopper selects or uploads a necklace image.

## Live demo

- Select any of the 5 provided necklaces → instantly see the 3 best-matching earrings
- Upload **any** necklace image (including unseen images not in the dataset) → the system visually analyses it and returns the closest earring matches from the inventory

## Run locally

```bash
# Terminal 1 — Python matching service
cd python-service
python -m venv venv && source venv/Scripts/activate   # Git Bash / Mac
pip install -r requirements.txt
# Copy .env.example to .env and add your PINECONE_API_KEY
uvicorn main:app --reload --port 8000

# Terminal 2 — Seed Pinecone (one time only)
python seed_embeddings.py

# Terminal 3 — Next.js frontend
cd ..
node node_modules/next/dist/bin/next dev   # http://localhost:3000
```

## Recommendation approaches

### Colour matching (default for catalog necklaces)

`GET /api/recommend?necklaceId=N01` — returns three ranked earring candidates.

Each of the 20 supplied images is represented by an interpretable **eight-value visual fingerprint**: gold presence, diamond brilliance, emerald, ruby, pearl, temple motif, ornamentation level, and contemporary silhouette. Weighted squared distance between necklace and earring profiles produces the match score. This is fast, explainable, and requires no external services.

### CLIP AI matching (for uploaded images)

`POST /api/clip-recommend` — forwards the uploaded image to the Python service, which returns Pinecone-ranked earrings.

**Flow:**
```
15 earring images
    → CLIP vit-base-patch32 (512-dim embeddings)
    → stored in Pinecone (cosine metric, us-east-1)

User uploads necklace image
    → Next.js proxy → FastAPI service
    → CLIP embedding generated
    → Pinecone cosine similarity query
    → Top 3 earrings returned
```

OpenAI's CLIP model encodes visual semantics — material texture, style, colour harmony — at a much deeper level than colour histograms. Because earring embeddings are precomputed and stored in Pinecone, the production query path is just one CLIP inference + one vector query.

### Why two methods?

| | Colour matching | CLIP AI |
|---|---|---|
| Speed | Instant (no external call) | ~1–3 s (CLIP inference) |
| Accuracy | Good for hand-annotated inventory | Better for unseen/uploaded images |
| Dependencies | None | Python service + Pinecone |
| Best for | Catalog necklaces | Uploaded / new images |

## Architecture

```
Vercel (Next.js)
├── /                       → page.tsx (UI with mode toggle)
├── /api/recommend          → heuristic matching (GET/POST)
└── /api/clip-recommend     → proxy to Python CLIP service (POST)

Render (Python FastAPI)
└── /embed-and-match        → CLIP embedding + Pinecone query

Pinecone (us-east-1)
└── jwellos index           → 15 earring vectors (512-dim, cosine)
```

## Tech stack

- **Frontend**: Next.js 15 + React 19 + TypeScript
- **Styling**: Vanilla CSS (editorial, responsive, dark method section)
- **AI model**: `openai/clip-vit-base-patch32` via HuggingFace Transformers
- **Vector DB**: Pinecone (serverless, us-east-1)
- **API layer**: FastAPI + Uvicorn (Python 3)
- **Deployment**: Vercel (Next.js) + Render (Python service)

## Project structure

```
jwellos/
├── app/
│   ├── api/
│   │   ├── recommend/route.ts        ← heuristic API (existing)
│   │   └── clip-recommend/route.ts   ← CLIP proxy API (new)
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                      ← main UI with mode toggle
├── lib/catalog.ts                    ← product data + heuristic matcher
├── public/inventory/                 ← 5 necklace + 15 earring images
└── python-service/
    ├── main.py                       ← FastAPI + CLIP + Pinecone
    ├── seed_embeddings.py            ← one-time seeding script
    ├── requirements.txt
    └── README.md                     ← Render deployment guide
```
