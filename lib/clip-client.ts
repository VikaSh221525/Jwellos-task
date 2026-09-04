"use client";

// Singleton storage for processor and vision model instances
let processorInstance: any = null;
let modelInstance: any = null;
let loadPromise: Promise<{ processor: any; model: any }> | null = null;

/**
 * Loads the Xenova/clip-vit-base-patch32 model and processor in the browser.
 * Caches instances so the ~87MB ONNX model is only loaded once.
 */
export async function loadClipModel(onProgress?: (percent: number) => void) {
  if (processorInstance && modelInstance) {
    return { processor: processorInstance, model: modelInstance };
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = (async () => {
    // Dynamic import to prevent SSR bundling errors
    const { AutoProcessor, CLIPVisionModelWithProjection, env } = await import(
      "@xenova/transformers"
    );

    // Browser environment settings
    env.allowLocalModels = false;
    // Store in browser CacheStorage so subsequent visits don't re-download
    env.useBrowserCache = true;

    const modelId = "Xenova/clip-vit-base-patch32";

    const [processor, model] = await Promise.all([
      AutoProcessor.from_pretrained(modelId),
      CLIPVisionModelWithProjection.from_pretrained(modelId, {
        progress_callback: (info: any) => {
          if (info.status === "progress" && typeof info.progress === "number") {
            onProgress?.(Math.round(info.progress));
          }
        },
      }),
    ]);

    processorInstance = processor;
    modelInstance = model;
    return { processor, model };
  })();

  return loadPromise;
}

/**
 * Generates a normalized 512-dimension visual embedding vector for an uploaded image file.
 * Returns an array of 512 floating point numbers matching the Pinecone index dimension.
 */
export async function getClipEmbedding(
  file: File,
  onProgress?: (percent: number) => void
): Promise<number[]> {
  const { RawImage } = await import("@xenova/transformers");
  const { processor, model } = await loadClipModel(onProgress);

  // Read uploaded File or Blob
  const image = await RawImage.fromBlob(file);

  // Preprocess image
  const inputs = await processor(image);

  // Generate embedding
  const { image_embeds } = await model(inputs);

  // L2-normalize to unit length (cosine similarity)
  const raw = Array.from(image_embeds.data as Float32Array);
  const norm = Math.sqrt(raw.reduce((sum, val) => sum + val * val, 0));
  return raw.map((val) => val / (norm || 1));
}
