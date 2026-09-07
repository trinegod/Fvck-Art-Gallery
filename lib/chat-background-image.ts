export const MAX_BACKGROUND_FILE_BYTES = 8 * 1024 * 1024;
export const MAX_BACKGROUND_DATA_LENGTH = 350_000;
export const BACKGROUND_FILE_TYPES = "image/jpeg,image/png,image/webp";

export function validateBackgroundFile(file: { type: string; size: number }) {
  if (!BACKGROUND_FILE_TYPES.split(",").includes(file.type)) {
    throw new Error("Choose a JPEG, PNG, or WebP image.");
  }
  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > MAX_BACKGROUND_FILE_BYTES) {
    throw new Error("Choose an image smaller than 8 MB.");
  }
}

/** Only bounded, locally re-encoded JPEG pixels are accepted, never external URLs or SVG. */
export function parseBackgroundData(value: unknown): string | null {
  return typeof value === "string" && value.length <= MAX_BACKGROUND_DATA_LENGTH &&
    /^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]*={0,2}$/.test(value)
    ? value : null;
}

export function backgroundDimensions(width: number, height: number, maxEdge = 1280) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0 ||
    width * height > 40_000_000 || width > 20_000 || height > 20_000) {
    throw new Error("This image is too large to process. Choose an image under 40 megapixels.");
  }
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** Runs only after a file-picker action. No upload, fetch, message insert, or original-file persistence. */
export async function prepareChatBackground(file: File, signal: AbortSignal): Promise<string> {
  validateBackgroundFile(file);
  if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
  const source = URL.createObjectURL(file);
  const photo = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        photo.onload = null;
        photo.onerror = null;
        signal.removeEventListener("abort", abort);
      };
      const abort = () => {
        cleanup();
        photo.src = "";
        reject(new DOMException("Cancelled", "AbortError"));
      };
      photo.onload = () => { cleanup(); resolve(); };
      photo.onerror = () => { cleanup(); reject(new Error("This image could not be opened. Try a different JPEG, PNG, or WebP.")); };
      signal.addEventListener("abort", abort, { once: true });
      photo.src = source;
    });
    if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image processing is unavailable in this browser.");
    for (const edge of [1280, 960]) {
      const size = backgroundDimensions(photo.naturalWidth, photo.naturalHeight, edge);
      canvas.width = size.width;
      canvas.height = size.height;
      context.fillStyle = "#090b0f";
      context.fillRect(0, 0, size.width, size.height);
      context.drawImage(photo, 0, 0, size.width, size.height);
      for (const quality of [0.82, 0.65, 0.5]) {
        const data = parseBackgroundData(canvas.toDataURL("image/jpeg", quality));
        if (data) return data;
      }
    }
    throw new Error("This image needs more space than a background allows. Try a smaller image.");
  } finally {
    photo.src = "";
    URL.revokeObjectURL(source);
  }
}
