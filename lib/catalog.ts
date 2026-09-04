export type Product = {
  id: string;
  type: "Necklace" | "Earrings";
  image: string;
  name: string;
  note: string;
  features: number[];
  photoFeatures?: number[];
};

// Visual fingerprint: [gold, diamonds, emerald, ruby, pearl, temple, ornate, contemporary].
// Values are calculated/annotated from the supplied product photographs, not product metadata.
export const products: Product[] = [
  { id: "N01", type: "Necklace", image: "Nck_1.jpg", name: "Emerald Temple Haar", note: "Layered gold, emerald & pearl", features: [0.92, 0.38, 0.66, 0.08, 0.45, 0.92, 0.93, 0.08] },
  { id: "N02", type: "Necklace", image: "Nck_2.jpg", name: "Heritage Lakshmi Choker", note: "Antique gold with ruby & pearl", features: [0.94, 0.21, 0.22, 0.30, 0.68, 0.98, 0.84, 0.04] },
  { id: "N03", type: "Necklace", image: "Nck_3.jpg", name: "Emerald Navaratna Collar", note: "Gold, crystal & emerald drops", features: [0.72, 0.61, 0.72, 0.10, 0.36, 0.72, 0.76, 0.21] },
  { id: "N04", type: "Necklace", image: "Nck_4.jpg", name: "Emerald Diamond Riviere", note: "Diamond-led with emerald accents", features: [0.49, 0.96, 0.60, 0.04, 0.04, 0.08, 0.45, 0.88] },
  { id: "N05", type: "Necklace", image: "Nck_5.jpg", name: "Ruby Mosaic Necklace", note: "Ruby geometry & brilliant stones", features: [0.48, 0.94, 0.03, 0.92, 0.04, 0.06, 0.49, 0.93] },
  { id: "E01", type: "Earrings", image: "Ear_1.jpg", name: "Lakshmi Pearl Chandbali", note: "Temple gold, emerald & ruby", features: [0.94, 0.42, 0.47, 0.28, 0.75, 0.99, 0.96, 0.04] },
  { id: "E02", type: "Earrings", image: "Ear_2.jpg", name: "Emerald Petal Drops", note: "Soft emerald & crystal", features: [0.42, 0.68, 0.77, 0.02, 0.03, 0.03, 0.24, 0.92] },
  { id: "E03", type: "Earrings", image: "Ear_3.jpg", name: "Rose Bloom Drops", note: "Ruby flowers & emerald drops", features: [0.37, 0.65, 0.64, 0.74, 0.02, 0.02, 0.31, 0.91] },
  { id: "E04", type: "Earrings", image: "Ear_4.jpg", name: "Emerald Pearl Jhumka", note: "Diamond lattice & pearl", features: [0.61, 0.91, 0.59, 0.01, 0.70, 0.18, 0.62, 0.68] },
  { id: "E05", type: "Earrings", image: "Ear_5.jpg", name: "Emerald Filigree Jhumka", note: "Diamond filigree & emerald", features: [0.59, 0.94, 0.54, 0.01, 0.26, 0.18, 0.78, 0.53] },
  { id: "E06", type: "Earrings", image: "Ear_6.jpg", name: "Emerald Canopy Jhumka", note: "Crystal dome with pearls", features: [0.55, 0.91, 0.49, 0.01, 0.70, 0.13, 0.67, 0.57] },
  { id: "E07", type: "Earrings", image: "Ear_7.jpg", name: "Ruby Teardrop Drops", note: "Modern ruby & diamonds", features: [0.38, 0.85, 0.01, 0.95, 0.02, 0.02, 0.16, 0.97] },
  { id: "E08", type: "Earrings", image: "Ear_8.jpg", name: "Antique Ruby Chandbali", note: "Handworked gold & pearl", features: [0.88, 0.18, 0.04, 0.56, 0.45, 0.68, 0.89, 0.20] },
  { id: "E09", type: "Earrings", image: "Ear_9.jpg", name: "Navaratna Cluster Studs", note: "Ruby, emerald & diamond", features: [0.72, 0.71, 0.36, 0.41, 0.02, 0.10, 0.39, 0.61] },
  { id: "E010", type: "Earrings", image: "Ear_10.jpg", name: "Antique Lakshmi Chandbali", note: "Heritage gold & ruby", features: [0.98, 0.08, 0.18, 0.40, 0.02, 0.96, 0.88, 0.04] },
  { id: "E011", type: "Earrings", image: "Ear_11.jpg", name: "Emerald Temple Chandelier", note: "Layered emerald & ruby", features: [0.84, 0.46, 0.69, 0.31, 0.52, 0.84, 0.96, 0.12] },
  { id: "E012", type: "Earrings", image: "Ear_12.jpg", name: "Ruby Temple Jhumka", note: "Heritage gold & magenta", features: [0.94, 0.28, 0.21, 0.76, 0.16, 0.88, 0.87, 0.10] },
  { id: "E013", type: "Earrings", image: "Ear_13.jpg", name: "Ruby Pearl Chandbali", note: "Ruby crystal & pearl", features: [0.50, 0.91, 0.02, 0.84, 0.60, 0.10, 0.52, 0.79] },
  { id: "E014", type: "Earrings", image: "Ear_14.jpg", name: "Emerald Bead Chandbali", note: "Antique gold & green beads", features: [0.91, 0.12, 0.69, 0.46, 0.06, 0.71, 0.89, 0.14] },
  { id: "E015", type: "Earrings", image: "Ear_15.jpg", name: "Antique Temple Jhumka", note: "Sculptural heritage gold", features: [0.98, 0.04, 0.03, 0.14, 0.05, 0.99, 0.93, 0.03] }
];

export const necklaces = products.filter((product) => product.type === "Necklace");

// Pixel-derived profile: [gold, emerald, ruby, bright sparkle, pearl/cream, saturation, luminance, contrast].
// It is used only for a newly uploaded necklace, because there is no curated style annotation for an unseen image.
const uploadedImageProfiles: Record<string, number[]> = {
  E01: [0.337, 0.006, 0.066, 0.051, 0.093, 0.486, 0.489, 0.25],
  E02: [0.03, 0.031, 0.004, 0.028, 0.278, 0.092, 0.605, 0.094],
  E03: [0.019, 0.032, 0.038, 0.463, 0.407, 0.191, 0.832, 0.094],
  E04: [0.067, 0.025, 0, 0.635, 0.212, 0.168, 0.751, 0.14],
  E05: [0.085, 0.012, 0.001, 0.052, 0.036, 0.463, 0.269, 0.237],
  E06: [0.055, 0.017, 0, 0.824, 0.107, 0.052, 0.921, 0.13],
  E07: [0.002, 0, 0.198, 0.051, 0.004, 0.564, 0.954, 0.057],
  E08: [0.216, 0.001, 0.011, 0.007, 0.332, 0.195, 0.612, 0.103],
  E09: [0.185, 0.006, 0.012, 0.006, 0.813, 0.256, 0.816, 0.081],
  E010: [0.312, 0.001, 0.017, 0.559, 0.04, 0.322, 0.844, 0.216],
  E011: [0.862, 0.014, 0.017, 0.011, 0.05, 0.392, 0.649, 0.091],
  E012: [0.906, 0.007, 0.045, 0.003, 0.013, 0.449, 0.753, 0.07],
  E013: [0.762, 0, 0.012, 0.052, 0.214, 0.368, 0.678, 0.153],
  E014: [0.868, 0.044, 0.012, 0, 0.534, 0.402, 0.749, 0.134],
  E015: [0.337, 0, 0.006, 0, 0, 0.677, 0.312, 0.238]
};

export function findMatches(necklaceId: string, limit = 3) {
  const necklace = products.find((product) => product.id === necklaceId && product.type === "Necklace");
  if (!necklace) return null;
  const weights = [0.8, 1.18, 1.35, 1.35, 0.72, 1.18, 1.05, 0.95];
  const scored = products
    .filter((product) => product.type === "Earrings")
    .map((earring) => {
      const distance = earring.features.reduce((sum, feature, index) => sum + weights[index] * (feature - necklace.features[index]) ** 2, 0);
      return { ...earring, score: Math.max(72, Math.round(100 - distance * 24)) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  return { necklace, matches: scored };
}

export function findMatchesForUploadedImage(photoFeatures: number[], limit = 3) {
  const weights = [1.15, 2.05, 2.05, 0.85, 0.8, 0.45, 0.35, 0.55];
  return products
    .filter((product) => product.type === "Earrings")
    .map((earring) => {
      const profile = uploadedImageProfiles[earring.id];
      const distance = profile.reduce((sum, feature, index) => sum + weights[index] * (feature - photoFeatures[index]) ** 2, 0);
      return { ...earring, score: Math.max(65, Math.round(100 - distance * 38)) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
