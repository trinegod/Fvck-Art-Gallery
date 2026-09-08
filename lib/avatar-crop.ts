import { validateBackgroundFile } from "./chat-background-image";

export const AVATAR_OUTPUT_EDGE = 512;
export const MAX_AVATAR_OUTPUT_BYTES = 2 * 1024 * 1024;
export const MAX_AVATAR_PIXELS = 24_000_000;
export const MAX_AVATAR_EDGE = 8192;
export type AvatarCrop = { x: number; y: number; zoom: number };
export const DEFAULT_AVATAR_CROP: Readonly<AvatarCrop> = Object.freeze({ x: 50, y: 50, zoom: 1 });
const clamp = (value: number, min: number, max: number, fallback: number) => Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
const normalize = (crop: AvatarCrop): AvatarCrop => ({ x: clamp(crop.x, 0, 100, 50), y: clamp(crop.y, 0, 100, 50), zoom: clamp(crop.zoom, 1, 3, 1) });

function dimensions(width: number, height: number) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0 || width > MAX_AVATAR_EDGE || height > MAX_AVATAR_EDGE || width * height > MAX_AVATAR_PIXELS) {
    throw new Error("Choose an image up to 24 megapixels and 8192 pixels per side.");
  }
  return { width, height };
}

/** Positions describe the selected area, from the image's left/top to right/bottom. */
export function avatarCropRect(width: number, height: number, crop: AvatarCrop) {
  dimensions(width, height);
  const { x, y, zoom } = normalize(crop);
  const size = Math.min(width, height) / zoom;
  return { x: (width - size) * x / 100, y: (height - size) * y / 100, size };
}

/** Drag the photo under the fixed circle; pixels never move beyond the source. */
export function moveAvatarCrop(width: number, height: number, crop: AvatarCrop, dx: number, dy: number, previewEdge: number): AvatarCrop {
  const current = normalize(crop);
  if (!Number.isFinite(previewEdge) || previewEdge <= 0) return current;
  const rect = avatarCropRect(width, height, current);
  return normalize({
    x: width === rect.size ? current.x : current.x - dx * rect.size / previewEdge / (width - rect.size) * 100,
    y: height === rect.size ? current.y : current.y - dy * rect.size / previewEdge / (height - rect.size) * 100,
    zoom: current.zoom,
  });
}

const invalidImage = () => new Error("This file could not be opened. Choose a still JPEG, PNG, or WebP image.");

/** Header preflight bounds pixel dimensions before handing bytes to a native decoder.
 * This is not a full codec validator; the browser must still decode successfully. */
export function readAvatarImageDimensions(bytes: Uint8Array, type: string) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const textAt = (offset: number, length: number) => String.fromCharCode(...bytes.subarray(offset, offset + length));
  if (type === "image/png" && bytes.length >= 33 && bytes.subarray(0, 8).every((value, index) => value === [137, 80, 78, 71, 13, 10, 26, 10][index]) && textAt(12, 4) === "IHDR" && view.getUint32(8) === 13) {
    const size = dimensions(view.getUint32(16), view.getUint32(20));
    for (let offset = 8; offset + 12 <= bytes.length;) {
      const length = view.getUint32(offset);
      if (length > bytes.length - offset - 12) throw invalidImage();
      const chunk = textAt(offset + 4, 4);
      if (chunk === "acTL") throw invalidImage();
      if (chunk === "IEND") return size;
      offset += length + 12;
    }
  } else if (type === "image/jpeg" && bytes[0] === 255 && bytes[1] === 216) {
    for (let offset = 2; offset + 3 < bytes.length;) {
      if (bytes[offset++] !== 255) throw invalidImage();
      while (bytes[offset] === 255) offset++;
      const marker = bytes[offset++];
      if (marker === 217 || marker === 218) break;
      if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
      if (offset + 2 > bytes.length) throw invalidImage();
      const length = view.getUint16(offset);
      if (length < 2 || offset + length > bytes.length) throw invalidImage();
      if ([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)) {
        if (length < 8) throw invalidImage();
        return dimensions(view.getUint16(offset + 5), view.getUint16(offset + 3));
      }
      offset += length;
    }
  } else if (type === "image/webp" && bytes.length >= 20 && textAt(0, 4) === "RIFF" && textAt(8, 4) === "WEBP" && view.getUint32(4, true) + 8 === bytes.length) {
    let canvas: { width: number; height: number } | undefined;
    let image: { width: number; height: number } | undefined;
    const uint24 = (offset: number) => bytes[offset] + bytes[offset + 1] * 256 + bytes[offset + 2] * 65536;
    // Container and VP8L field layouts: developers.google.com/speed/webp/docs/riff_container
    for (let offset = 12; offset + 8 <= bytes.length;) {
      const chunk = textAt(offset, 4);
      const length = view.getUint32(offset + 4, true);
      const data = offset + 8;
      if (length > bytes.length - data) throw invalidImage();
      if (chunk === "ANIM" || chunk === "ANMF") throw invalidImage();
      if (chunk === "VP8X") {
        if (length !== 10 || canvas || bytes[data] & 2) throw invalidImage();
        canvas = dimensions(uint24(data + 4) + 1, uint24(data + 7) + 1);
      } else if (chunk === "VP8 ") {
        if (length < 10 || image || bytes[data] & 1 || textAt(data + 3, 3) !== "\u009d\u0001*") throw invalidImage();
        image = dimensions(view.getUint16(data + 6, true) & 0x3fff, view.getUint16(data + 8, true) & 0x3fff);
      } else if (chunk === "VP8L") {
        if (length < 5 || image || bytes[data] !== 47 || bytes[data + 4] & 0xe0) throw invalidImage();
        const bits = view.getUint32(data + 1, true);
        image = dimensions((bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1);
      }
      offset = data + length + length % 2;
    }
    if (image && (!canvas || (canvas.width === image.width && canvas.height === image.height))) return image;
  }
  throw invalidImage();
}

const abortError = () => new DOMException("Cancelled", "AbortError");
const checkAbort = (signal: AbortSignal) => { if (signal.aborted) throw abortError(); };

/** Local only. The caller must dispose the returned image; no source metadata is exported. */
export async function prepareAvatarImage(file: File, signal: AbortSignal) {
  checkAbort(signal);
  validateBackgroundFile(file);
  readAvatarImageDimensions(new Uint8Array(await file.arrayBuffer()), file.type);
  checkAbort(signal);
  const photo = new Image();
  const source = URL.createObjectURL(file);
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    photo.onload = null; photo.onerror = null; photo.src = "";
    URL.revokeObjectURL(source);
  };
  try {
    await new Promise<void>((resolve, reject) => {
      const finish = (error?: Error) => {
        clearTimeout(timeout);
        signal.removeEventListener("abort", abort);
        photo.onload = null; photo.onerror = null;
        if (error) reject(error); else resolve();
      };
      const abort = () => finish(abortError());
      const timeout = setTimeout(() => finish(new Error("Opening this image timed out. Try a smaller image.")), 15_000);
      photo.onload = () => finish();
      photo.onerror = () => finish(invalidImage());
      signal.addEventListener("abort", abort, { once:true });
      photo.src = source;
    });
    checkAbort(signal);
    const size = dimensions(photo.naturalWidth, photo.naturalHeight);
    const draw = (canvas: HTMLCanvasElement, crop: AvatarCrop) => {
      if (disposed) throw abortError();
      const rect = avatarCropRect(size.width, size.height, crop);
      canvas.width = AVATAR_OUTPUT_EDGE; canvas.height = AVATAR_OUTPUT_EDGE;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Image processing is unavailable in this browser.");
      context.fillStyle = "#090b0f";
      context.fillRect(0, 0, AVATAR_OUTPUT_EDGE, AVATAR_OUTPUT_EDGE);
      context.drawImage(photo, rect.x, rect.y, rect.size, rect.size, 0, 0, AVATAR_OUTPUT_EDGE, AVATAR_OUTPUT_EDGE);
    };
    return {
      ...size, draw, dispose,
      exportFile: async (crop: AvatarCrop, exportSignal: AbortSignal): Promise<File> => {
        checkAbort(exportSignal);
        const canvas = document.createElement("canvas");
        try {
          draw(canvas, crop);
          for (const quality of [0.9, 0.75, 0.55]) {
            const blob = await new Promise<Blob | null>((resolve, reject) => {
              let settled = false;
              const finish = (blob: Blob | null, error?: Error) => {
                if (settled) return;
                settled = true;
                clearTimeout(timeout);
                exportSignal.removeEventListener("abort", abort);
                if (error) reject(error); else resolve(blob);
              };
              const abort = () => finish(null, abortError());
              const timeout = setTimeout(() => finish(null, new Error("Preparing the avatar timed out. Your crop is kept; try again.")), 10_000);
              exportSignal.addEventListener("abort", abort, { once:true });
              try { canvas.toBlob(blob => finish(blob), "image/jpeg", quality); }
              catch { finish(null, new Error("The avatar could not be prepared. Your crop is kept; try again.")); }
            });
            checkAbort(exportSignal);
            if (disposed) throw abortError();
            if (blob?.type === "image/jpeg" && blob.size > 0 && blob.size <= MAX_AVATAR_OUTPUT_BYTES) return new File([blob], "avatar.jpg", { type:"image/jpeg" });
          }
          throw new Error("The avatar could not be prepared within 2 MiB. Your crop is kept; try again.");
        } finally { canvas.width = 0; canvas.height = 0; }
      },
    };
  } catch (error) { dispose(); throw error; }
}

export type AvatarCropState = {
  phase: "loading" | "ready" | "encoding" | "confirmed" | "error";
  crop: AvatarCrop;
  size: { width:number; height:number } | null;
  error: string | null;
};

/** Owns local preparation/confirmation. Constructing or subscribing does not decode;
 * start is reversible for effect replay. Late loads/encodes never confirm a stale file. */
export function createAvatarCropSession(file: File) {
  let state: AvatarCropState = { phase:"loading", crop:{ ...DEFAULT_AVATAR_CROP }, size:null, error:null };
  let generation = 0;
  let request: AbortController | null = null;
  let prepared: Awaited<ReturnType<typeof prepareAvatarImage>> | null = null;
  const listeners = new Set<() => void>();
  const update = (patch: Partial<AvatarCropState>) => { state = { ...state, ...patch }; listeners.forEach(listener => listener()); };
  const dispose = () => {
    generation++;
    request?.abort(); request = null;
    prepared?.dispose(); prepared = null;
  };
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    start: async () => {
      dispose();
      const current = generation;
      const controller = new AbortController(); request = controller;
      update({ phase:"loading", size:null, error:null });
      try {
        const image = await prepareAvatarImage(file, controller.signal);
        if (generation !== current) { image.dispose(); return; }
        prepared = image;
        update({ phase:"ready", size:{ width:image.width, height:image.height } });
      } catch (error) {
        if (generation === current && !controller.signal.aborted) update({ phase:"error", error:error instanceof Error ? error.message : "This image could not be opened. Choose another image." });
      }
    },
    setCrop: (crop: AvatarCrop) => { if (state.phase === "ready" && prepared) update({ crop:normalize(crop), error:null }); },
    draw: (canvas: HTMLCanvasElement) => {
      if (!prepared) return;
      try { prepared.draw(canvas, state.crop); }
      catch (error) { update({ phase:"error", error:error instanceof Error ? error.message : "The preview could not be drawn." }); }
    },
    confirm: async (onConfirm: (file: File) => void) => {
      if (state.phase !== "ready" || !prepared || !request) return;
      const current = generation;
      const image = prepared, controller = request, crop = state.crop;
      update({ phase:"encoding", error:null });
      let output: File;
      try { output = await image.exportFile(crop, controller.signal); }
      catch (error) {
        if (generation === current && !controller.signal.aborted) update({ phase:"ready", error:error instanceof Error ? error.message : "The avatar could not be prepared. Your crop is kept; try again." });
        return;
      }
      if (generation !== current || controller.signal.aborted) return;
      update({ phase:"confirmed", error:null });
      if (generation !== current || controller.signal.aborted) return;
      try { onConfirm(output); }
      catch {
        if (generation === current && !controller.signal.aborted) update({ phase:"ready", error:"The cropped preview could not be prepared. Your crop is kept; try again." });
      }
    },
    dispose,
  };
}
