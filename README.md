# Jewellos Match Studio

A premium, single-page prototype that recommends earrings from the supplied Jewellos inventory when a shopper selects a necklace.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Recommendation approach

`GET /api/recommend?necklaceId=N01` is the prototype endpoint. It returns the selected necklace and three ranked earring candidates, exclusively from the provided inventory.

Each supplied photograph is represented by an interpretable eight-part visual fingerprint:

- gold presence and diamond brilliance
- emerald, ruby and pearl emphasis
- temple motif, ornamentation and contemporary silhouette

The matcher calculates weighted squared distance between the selected necklace and every earring profile. Gem colour and visual construction receive higher weights than background colour, which is important because the source product photography uses very different backdrops. The closest profiles are returned with a relative match score.

This is deliberately lightweight and explainable for a 20-item fixed inventory. For a production catalogue, the same endpoint could store precomputed CLIP embeddings alongside these structured features, then combine semantic and visual-nearest-neighbour ranking.

## Tech

- Next.js 15 + React 19
- Next.js route handler for the recommendation API
- TypeScript
- CSS-only responsive editorial interface
- Supplied product images, served locally from `public/inventory`

No database is included because this assignment has a fixed, provided inventory. A database would be appropriate once products and image embeddings become merchant-managed data.
