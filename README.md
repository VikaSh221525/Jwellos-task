# Jewellos Match Studio

A premium, single-page prototype that recommends matching earrings from the Jewellos inventory when a shopper selects or uploads a necklace image.

## Features

- **Catalog Selection**: Select any of the 5 provided necklaces → instantly see the 3 best-matching earrings using visual profile matching.
- **Upload Any Piece**: Upload any necklace image → the system runs in-browser visual analysis (CLIP embeddings) and retrieves the closest earrings from the vector database.
- **Pure TypeScript Architecture**: 100% hosted on Vercel with zero external backend microservices or servers.

---

## Run Locally

```bash
# 1. Install dependencies
npm install

# 2. Add Pinecone credentials to .env.local
# PINECONE_API_KEY=your_key
# PINECONE_INDEX_NAME=jewellos

# 3. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Recommendation Approaches

### 1. Heuristic Matching (Catalog necklaces)
`GET /api/recommend?necklaceId=N01`
Each catalog piece has an interpretable visual profile (gold, diamonds, gemstones, style motifs). Weighted similarity produces instantaneous, explainable recommendations without external dependencies.

### 2. Deep Visual Matching (Uploaded pieces)
`POST /api/clip-recommend`
- When an image is uploaded, **Transformers.js** (`Xenova/clip-vit-base-patch32`) runs directly in the client browser using WebAssembly to generate a normalized 512-dimension embedding.
- The 512-dim vector is passed to the Next.js API route `/api/clip-recommend`.
- Next.js securely queries the **Pinecone** vector database (pre-seeded with all 15 earring embeddings) and returns the highest cosine similarity matches.

---

## Tech Stack

- **Framework**: Next.js 15 (App Router) + React 19 + TypeScript
- **Styling**: Vanilla CSS (Editorial, responsive luxury aesthetics)
- **Model / Inference**: `@xenova/transformers` (Client-side CLIP ViT-B/32 via WebAssembly)
- **Vector Database**: Pinecone Serverless (us-east-1) via `@pinecone-database/pinecone`
- **Deployment**: Vercel (100% serverless, single deployment)

---

## Project Structure

```
jwellos/
├── app/
│   ├── api/
│   │   ├── recommend/route.ts        ← heuristic matching API
│   │   └── clip-recommend/route.ts   ← Pinecone vector query API
│   ├── globals.css                   ← luxury styling
│   ├── layout.tsx
│   └── page.tsx                      ← main interactive studio
├── lib/
│   ├── catalog.ts                    ← product data & heuristic matcher
│   └── clip-client.ts                ← in-browser Transformers.js CLIP matcher
└── public/
    └── inventory/                    ← necklace & earring images
```
