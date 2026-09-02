"use client";

import { useEffect, useMemo, useState } from "react";
import { necklaces, type Product } from "@/lib/catalog";

type Match = Product & { score: number };

const imagePath = (image: string) => `/inventory/${image}`;

export default function Home() {
  const [selected, setSelected] = useState(necklaces[0]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/recommend?necklaceId=${selected.id}`)
      .then((response) => response.json())
      .then((data) => active && setMatches(data.matches))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [selected]);

  const selectedIndex = useMemo(() => necklaces.findIndex((item) => item.id === selected.id) + 1, [selected]);
  const toggleSaved = (id: string) => setSaved((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);

  return (
    <main>
      <header className="site-header container">
        <a className="wordmark" href="#top">Jewellos<span>.</span></a>
        <nav aria-label="Main navigation">
          <a href="#studio">Match studio</a>
          <a href="#method">Our method</a>
        </nav>
        <button className="saved-button" aria-label="Saved pairings" onClick={() => document.getElementById("results")?.scrollIntoView({ behavior: "smooth" })}>
          Saved <em>{String(saved.length).padStart(2, "0")}</em>
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
            <p>Choose a necklace from the collection. Our visual matcher will find its closest companions.</p>
          </div>
          <div className="selector">
            {necklaces.map((necklace, index) => (
              <button key={necklace.id} className={`selector-card ${selected.id === necklace.id ? "active" : ""}`} onClick={() => setSelected(necklace)} aria-pressed={selected.id === necklace.id}>
                <img src={imagePath(necklace.image)} alt={necklace.name} />
                <span>{String(index + 1).padStart(2, "0")}</span>
              </button>
            ))}
          </div>

          <div className="selection-detail">
            <div className="featured-piece"><img src={imagePath(selected.image)} alt={selected.name} /></div>
            <div className="selection-copy">
              <p className="eyebrow">Selected piece · {String(selectedIndex).padStart(2, "0")}</p>
              <h3>{selected.name}</h3>
              <p>{selected.note}. Selected from the Jewellos occasion collection.</p>
              <button className="text-link" onClick={() => document.getElementById("results")?.scrollIntoView({ behavior: "smooth" })}>Reveal matching earrings <span>↘</span></button>
            </div>
            <div className="match-status"><span className={loading ? "pulse" : ""}></span>{loading ? "Reading visual details…" : "Visual profile ready"}</div>
          </div>
        </div>
      </section>

      <section className="results container" id="results">
        <div className="section-heading result-heading">
          <div><p className="eyebrow">02 — Your pairings</p><h2>Made to belong together.</h2></div>
          <p>Ranked from the available inventory — no outside products, only considered companions.</p>
        </div>
        <div className="match-grid" aria-live="polite">
          {loading ? [1, 2, 3].map((item) => <div className="match-card skeleton" key={item} />) : matches.map((earring, index) => (
            <article className={`match-card card-${index + 1}`} key={earring.id}>
              <div className="match-image"><img src={imagePath(earring.image)} alt={earring.name} /><span className="match-number">0{index + 1}</span><button onClick={() => toggleSaved(earring.id)} aria-label={`Save ${earring.name}`} className={saved.includes(earring.id) ? "is-saved" : ""}>{saved.includes(earring.id) ? "♥" : "♡"}</button></div>
              <div className="match-meta"><div><p>{earring.note}</p><h3>{earring.name}</h3></div><strong>{earring.score}<small>%</small></strong></div>
              <div className="meter"><span style={{ width: `${earring.score}%` }} /></div>
              <p className="match-reason">{index === 0 ? "Closest visual affinity" : index === 1 ? "Complementary colour story" : "A considered alternative"}</p>
            </article>
          ))}
        </div>
        <p className="inventory-note">All recommendations are selected from the supplied Jewellos inventory.</p>
      </section>

      <section className="method" id="method"><div className="container method-inner"><p className="eyebrow">The approach</p><h2>A subtle study of<br /><i>colour & craft.</i></h2><div><p>Each image is distilled into a visual profile: the proportion of gold, diamond brilliance, emerald, ruby, pearl, temple motifs, ornamentation and contemporary form.</p><p>We compare the selected necklace with each earring in the inventory, weight the most defining attributes, then surface the strongest visual affinities.</p><span>Built as an interpretable, inventory-only recommendation prototype.</span></div></div></section>

      <footer className="container"><a className="wordmark" href="#top">Jewellos<span>.</span></a><p>Curated pairings for jewellery with a point of view.</p><a href="#top">Back to top ↑</a></footer>
    </main>
  );
}
