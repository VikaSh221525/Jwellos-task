"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { necklaces, products, type Product } from "@/lib/catalog";

type Match = Product & { score: number };
type UploadedNecklace = { name: string; preview: string; features: number[] };

const imagePath = (image: string) => `/inventory/${image}`;

function rgbToHsv(red: number, green: number, blue: number) {
  const r = red / 255; const g = green / 255; const b = blue / 255;
  const max = Math.max(r, g, b); const min = Math.min(r, g, b); const delta = max - min;
  let hue = 0;
  if (delta) hue = max === r ? ((g - b) / delta + 6) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return [hue / 6, max ? delta / max : 0, max] as const;
}

async function analyseUploadedImage(file: File): Promise<UploadedNecklace> {
  const preview = URL.createObjectURL(file);
  const image = new Image();
  image.src = preview;
  await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("This image could not be read.")); });
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 160;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Image analysis is not available in this browser.");
  const square = Math.min(image.naturalWidth, image.naturalHeight) * 0.6;
  context.drawImage(image, (image.naturalWidth - square) / 2, (image.naturalHeight - square) / 2, square, square, 0, 0, 160, 160);
  const pixels = context.getImageData(0, 0, 160, 160).data;
  const counts = [0, 0, 0, 0, 0]; let saturation = 0; let luminance = 0; const values: number[] = [];
  for (let index = 0; index < pixels.length; index += 4) {
    const [hue, sat, value] = rgbToHsv(pixels[index], pixels[index + 1], pixels[index + 2]);
    saturation += sat; luminance += value; values.push(value);
    if (hue >= 0.07 && hue <= 0.17 && sat > 0.25 && value > 0.22 && value < 0.94) counts[0]++;
    if (hue >= 0.26 && hue <= 0.48 && sat > 0.24 && value > 0.18) counts[1]++;
    if ((hue >= 0.91 || hue <= 0.03) && sat > 0.32 && value > 0.2) counts[2]++;
    if (sat < 0.12 && value > 0.73) counts[3]++;
    if (hue >= 0.07 && hue <= 0.17 && sat >= 0.06 && sat < 0.32 && value > 0.55 && value < 0.96) counts[4]++;
  }
  const total = values.length; const mean = luminance / total;
  const contrast = Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / total);
  return { name: file.name.replace(/\.[^.]+$/, "") || "Uploaded Necklace", preview, features: [...counts.map((count) => count / total), saturation / total, mean, contrast] };
}

/** Enrich visual-match results with full product metadata from catalog */
function enrichMatches(rawMatches: { id: string; score: number; name: string; image: string }[]): Match[] {
  return rawMatches.map((m) => {
    const product = products.find((p) => p.id === m.id);
    if (product) return { ...product, score: Math.round(m.score) };
    return { id: m.id, type: "Earrings" as const, image: m.image, name: m.name, note: "", features: [], score: Math.round(m.score) };
  });
}

export default function Home() {
  const [selected, setSelected] = useState(necklaces[0]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState<string[]>([]);
  const [uploaded, setUploaded] = useState<UploadedNecklace | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [source, setSource] = useState<"catalog" | "upload">("catalog");
  const [uploadError, setUploadError] = useState("");
  const [matchError, setMatchError] = useState("");
  const [matchStatus, setMatchStatus] = useState("");

  const uploadInputRef = useRef<HTMLInputElement>(null);

  // ── Catalog necklace — heuristic matching ─────────────────────────────────
  useEffect(() => {
    if (source !== "catalog") return;
    let active = true;
    setLoading(true);
    setMatchError("");
    setMatchStatus("");
    fetch(`/api/recommend?necklaceId=${selected.id}`)
      .then((r) => r.json())
      .then((data) => active && setMatches(data.matches ?? []))
      .catch(() => active && setMatches([]))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [selected, source]);

  // ── Uploaded necklace — visual matching ───────────────────────────────────
  useEffect(() => {
    if (source !== "upload" || !uploadedFile) return;
    let active = true;
    setLoading(true);
    setMatchError("");

    async function runMatching() {
      try {
        setMatchStatus("Analysing image details…");
        const { getClipEmbedding } = await import("@/lib/clip-client");
        const vector = await getClipEmbedding(uploadedFile!, (percent) => {
          if (active && percent > 0 && percent < 100) {
            setMatchStatus(`Studying piece details (${percent}%)…`);
          }
        });

        if (!active) return;
        setMatchStatus("Finding closest matches in collection…");

        const res = await fetch("/api/clip-recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vector, top_k: 3 }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Matching failed" }));
          throw new Error(err.error ?? "Could not reach the matching service.");
        }

        const data = await res.json();
        if (active) {
          setMatches(enrichMatches(data.matches ?? []));
        }
      } catch (err: any) {
        console.error("Matching error:", err);
        if (active) {
          setMatchError(err?.message || "Could not complete the match right now.");
          setMatches([]);
        }
      } finally {
        if (active) {
          setLoading(false);
          setMatchStatus("");
        }
      }
    }

    runMatching();

    return () => { active = false; };
  }, [uploadedFile, source]);

  const selectedIndex = useMemo(() => necklaces.findIndex((item) => item.id === selected.id) + 1, [selected]);
  const toggleSaved = (id: string) => setSaved((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);

  const chooseCatalogNecklace = (necklace: Product) => {
    setSource("catalog");
    setSelected(necklace);
    setUploadError("");
    setMatchError("");
  };

  const uploadNecklace = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setUploadError("Please choose a JPG, PNG, or WebP image."); return; }
    try {
      setLoading(true);
      setUploadError("");
      setMatchError("");
      const analysed = await analyseUploadedImage(file);
      setUploaded(analysed);
      setUploadedFile(file);
      setSource("upload");
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "We could not analyse this image.");
      setLoading(false);
    } finally {
      event.target.value = "";
    }
  };

  const activeName = source === "upload" && uploaded ? uploaded.name : selected.name;
  const activeImage = source === "upload" && uploaded ? uploaded.preview : imagePath(selected.image);
  const activeNote = source === "upload"
    ? "Your image is being studied for colour, material and form. The closest earrings from our collection will appear below."
    : `${selected.note}. Selected from the Jewellos occasion collection.`;

  const statusText = matchStatus || (loading ? "Reading visual details…" : "Visual profile ready");

  return (
    <main>
      <header className="site-header container">
        <a className="wordmark" href="#top">Jewellos<span>.</span></a>
        <nav aria-label="Main navigation">
          <a href="#studio">Match studio</a>
          <a href="#method">Our method</a>
        </nav>
        <button className="saved-button" aria-label="Saved pairings" onClick={() => document.getElementById("results")?.scrollIntoView({ behavior: "smooth" })}>
          Saved <em>{String(saved.length).padStart(2, "00")}</em>
        </button>
      </header>

      <section className="hero container" id="top">
        <p className="eyebrow">Jewellos match studio <span>•</span> Curated by vision</p>
        <div className="hero-copy">
          <h1>Adornment,<br /><i>in perfect harmony.</i></h1>
          <p>Discover earrings chosen to echo the colours, craftsmanship and character of your selected necklace.</p>
        </div>
        <div className="hero-foot">
          <span>05 necklaces · 15 earrings</span>
          <span>Scroll to begin <b>↓</b></span>
        </div>
      </section>

      <section className="studio" id="studio">
        <div className="container">
          <div className="section-heading">
            <div><p className="eyebrow">01 — Select a piece</p><h2>The necklace</h2></div>
            <p>Choose a necklace from the collection, or upload your own — our matcher will find its closest earring companions.</p>
          </div>

          <div className="upload-option">
            <div>
              <p className="eyebrow">Have another necklace?</p>
              <p>Upload any necklace image and we&apos;ll find its matching earrings from the collection.</p>
            </div>
            <label className="upload-button">
              Upload your necklace <span>↑</span>
              <input ref={uploadInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadNecklace} />
            </label>
          </div>

          {uploadError && <p className="upload-error" role="alert">{uploadError}</p>}
          {matchError && (
            <p className="upload-error" role="alert">
              We could not complete the match right now. Please try again in a moment.
            </p>
          )}

          <div className="selector">
            {necklaces.map((necklace, index) => (
              <button key={necklace.id} className={`selector-card ${source === "catalog" && selected.id === necklace.id ? "active" : ""}`} onClick={() => chooseCatalogNecklace(necklace)} aria-pressed={source === "catalog" && selected.id === necklace.id}>
                <img src={imagePath(necklace.image)} alt={necklace.name} />
                <span>{String(index + 1).padStart(2, "0")}</span>
              </button>
            ))}
          </div>

          <div className="selection-detail">
            <div className="featured-piece"><img src={activeImage} alt={activeName} /></div>
            <div className="selection-copy">
              <p className="eyebrow">
                {source === "upload" ? "Uploaded piece · visual scan" : `Selected piece · ${String(selectedIndex).padStart(2, "0")}`}
              </p>
              <h3>{activeName}</h3>
              <p>{activeNote}</p>
              <button className="text-link" onClick={() => document.getElementById("results")?.scrollIntoView({ behavior: "smooth" })}>Reveal matching earrings <span>↘</span></button>
            </div>
            <div className="match-status">
              <span className={loading ? "pulse" : ""} />
              {statusText}
            </div>
          </div>
        </div>
      </section>

      <section className="results container" id="results">
        <div className="section-heading result-heading">
          <div>
            <p className="eyebrow">02 — Your pairings</p>
            <h2>Made to belong together.</h2>
          </div>
          <p>Ranked from the available inventory — no outside products, only considered companions.</p>
        </div>
        <div className="match-grid" aria-live="polite">
          {loading ? [1, 2, 3].map((item) => <div className="match-card skeleton" key={item} />) : matches.map((earring, index) => (
            <article className={`match-card card-${index + 1}`} key={earring.id}>
              <div className="match-image">
                <img src={imagePath(earring.image)} alt={earring.name} />
                <span className="match-number">0{index + 1}</span>
                <button onClick={() => toggleSaved(earring.id)} aria-label={`Save ${earring.name}`} className={saved.includes(earring.id) ? "is-saved" : ""}>{saved.includes(earring.id) ? "♥" : "♡"}</button>
              </div>
              <div className="match-meta">
                <div><p>{earring.note}</p><h3>{earring.name}</h3></div>
                <strong>{earring.score}<small>%</small></strong>
              </div>
              <div className="meter"><span style={{ width: `${earring.score}%` }} /></div>
              <p className="match-reason">
                {index === 0 ? "Closest visual affinity" : index === 1 ? "Complementary colour story" : "A considered alternative"}
              </p>
            </article>
          ))}
        </div>
        <p className="inventory-note">All recommendations are selected from the supplied Jewellos inventory.</p>
      </section>

      <section className="method" id="method">
        <div className="container method-inner">
          <p className="eyebrow">The approach</p>
          <h2>A subtle study of<br /><i>colour &amp; craft.</i></h2>
          <div>
            <p>Each image is studied for its visible character — the warmth of gold, the depth of gemstone colour, the weight of ornamentation and the spirit of the silhouette.</p>
            <p>When you upload your own necklace, the same visual study is applied to your piece, then compared against every earring in the collection to surface the strongest affinities.</p>
            <span>Built as an interpretable, inventory-only recommendation prototype.</span>
          </div>
        </div>
      </section>

      <footer className="container"><a className="wordmark" href="#top">Jewellos<span>.</span></a><p>Curated pairings for jewellery with a point of view.</p><a href="#top">Back to top ↑</a></footer>
    </main>
  );
}
