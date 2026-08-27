export const VISUAL_DNA_SCHEMA_VERSION = "visual-dna/browser-v1";

export type VisualDnaSwatch = {
  hex: string;
  rgb: [number, number, number];
  share: number;
};

export type VisualDnaProfile = {
  schemaVersion: string;
  sampleCount: number;
  aspectRatio: number;
  palette: VisualDnaSwatch[];
  color: {
    averageLuminance: number;
    contrast: number;
    saturation: number;
    warmth: number;
    temperatureLabel: "cool" | "neutral" | "warm";
    saturationLabel: "restrained" | "balanced" | "vivid";
  };
  lighting: {
    shadowShare: number;
    highlightShare: number;
    keyLabel: "low-key" | "balanced" | "high-key";
    contrastLabel: "soft" | "defined" | "dramatic";
  };
  composition: {
    focalX: number;
    focalY: number;
    horizontalLabel: "left-weighted" | "centered" | "right-weighted";
    verticalLabel: "top-weighted" | "balanced" | "bottom-weighted";
  };
  texture: {
    edgeDensity: number;
    label: "minimal" | "measured" | "intricate" | "dense";
  };
};

export type VisualPromptInput = {
  worldTitle: string;
  artworkTitle: string;
  request: string;
  mood?: string | null;
  tags?: string[] | null;
};

type PixelSample = {
  r: number;
  g: number;
  b: number;
  luminance: number;
  saturation: number;
  x: number;
  y: number;
};

type Cluster = {
  r: number;
  g: number;
  b: number;
  count: number;
};

const MAX_SAMPLES = 16_000;
const PALETTE_SIZE = 6;
const TEXTURE_GRIDS = [31, 37, 43];

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

function round(value: number, precision = 3) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function channelHex(value: number) {
  return Math.round(clamp(value, 0, 255)).toString(16).padStart(2, "0");
}

function rgbHex(r: number, g: number, b: number) {
  return `#${channelHex(r)}${channelHex(g)}${channelHex(b)}`.toUpperCase();
}

function luminance(r: number, g: number, b: number) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function saturation(r: number, g: number, b: number) {
  const maximum = Math.max(r, g, b) / 255;
  const minimum = Math.min(r, g, b) / 255;
  const lightness = (maximum + minimum) / 2;
  const delta = maximum - minimum;
  if (delta === 0) return 0;
  return delta / (1 - Math.abs(2 * lightness - 1));
}

function colorDistance(
  left: Pick<Cluster, "r" | "g" | "b">,
  right: Pick<Cluster, "r" | "g" | "b">
) {
  const red = left.r - right.r;
  const green = left.g - right.g;
  const blue = left.b - right.b;
  return red * red + green * green + blue * blue;
}

function paletteSeeds(samples: PixelSample[]) {
  const buckets = new Map<
    number,
    { r: number; g: number; b: number; count: number }
  >();

  for (const sample of samples) {
    const key =
      (Math.floor(sample.r / 32) << 6) |
      (Math.floor(sample.g / 32) << 3) |
      Math.floor(sample.b / 32);
    const bucket = buckets.get(key) ?? { r: 0, g: 0, b: 0, count: 0 };
    bucket.r += sample.r;
    bucket.g += sample.g;
    bucket.b += sample.b;
    bucket.count += 1;
    buckets.set(key, bucket);
  }

  const candidates = Array.from(buckets.values())
    .map((bucket) => ({
      r: bucket.r / bucket.count,
      g: bucket.g / bucket.count,
      b: bucket.b / bucket.count,
      count: bucket.count,
    }))
    .sort((left, right) => right.count - left.count);

  if (!candidates.length) return [];
  const seeds: Cluster[] = [{ ...candidates[0] }];

  while (seeds.length < Math.min(PALETTE_SIZE, candidates.length)) {
    let best: Cluster | null = null;
    let bestScore = -1;

    for (const candidate of candidates) {
      const nearestDistance = Math.min(
        ...seeds.map((seed) => colorDistance(candidate, seed))
      );
      const score = nearestDistance * Math.log2(candidate.count + 1);
      if (score > bestScore) {
        best = candidate;
        bestScore = score;
      }
    }

    if (!best || seeds.some((seed) => colorDistance(seed, best) < 1)) break;
    seeds.push({ ...best });
  }

  return seeds;
}

function dominantPalette(samples: PixelSample[]): VisualDnaSwatch[] {
  let clusters = paletteSeeds(samples);
  if (!clusters.length) return [];

  for (let iteration = 0; iteration < 7; iteration += 1) {
    const totals = clusters.map(() => ({ r: 0, g: 0, b: 0, count: 0 }));

    for (const sample of samples) {
      let nearestIndex = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;
      for (let index = 0; index < clusters.length; index += 1) {
        const distance = colorDistance(sample, clusters[index]);
        if (distance < nearestDistance) {
          nearestIndex = index;
          nearestDistance = distance;
        }
      }
      const total = totals[nearestIndex];
      total.r += sample.r;
      total.g += sample.g;
      total.b += sample.b;
      total.count += 1;
    }

    clusters = clusters.map((cluster, index) => {
      const total = totals[index];
      return total.count
        ? {
            r: total.r / total.count,
            g: total.g / total.count,
            b: total.b / total.count,
            count: total.count,
          }
        : { ...cluster, count: 0 };
    });
  }

  return clusters
    .filter((cluster) => cluster.count > 0)
    .sort((left, right) => right.count - left.count)
    .map((cluster) => ({
      hex: rgbHex(cluster.r, cluster.g, cluster.b),
      rgb: [
        Math.round(cluster.r),
        Math.round(cluster.g),
        Math.round(cluster.b),
      ],
      share: round(cluster.count / samples.length),
    }));
}

function horizontalLabel(value: number) {
  if (value < 0.43) return "left-weighted" as const;
  if (value > 0.57) return "right-weighted" as const;
  return "centered" as const;
}

function verticalLabel(value: number) {
  if (value < 0.4) return "top-weighted" as const;
  if (value > 0.62) return "bottom-weighted" as const;
  return "balanced" as const;
}

function normalizedEdgeDensity(
  rgba: ArrayLike<number>,
  width: number,
  height: number
) {
  let edgeComparisons = 0;
  let strongEdges = 0;

  for (const gridSize of TEXTURE_GRIDS) {
    const columns = width === 1 ? 1 : gridSize;
    const rows = height === 1 ? 1 : gridSize;

    function sourceOffset(column: number, row: number) {
      const x = Math.min(
        width - 1,
        Math.floor(((column + 0.5) * width) / columns)
      );
      const y = Math.min(
        height - 1,
        Math.floor(((row + 0.5) * height) / rows)
      );
      return (y * width + x) * 4;
    }

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const offset = sourceOffset(column, row);
        if ((rgba[offset + 3] ?? 0) < 32) continue;
        const current = luminance(
          rgba[offset] ?? 0,
          rgba[offset + 1] ?? 0,
          rgba[offset + 2] ?? 0
        );
        const neighbors: number[] = [];
        if (column + 1 < columns) neighbors.push(sourceOffset(column + 1, row));
        if (row + 1 < rows) neighbors.push(sourceOffset(column, row + 1));

        for (const neighborOffset of neighbors) {
          if ((rgba[neighborOffset + 3] ?? 0) < 32) continue;
          const neighbor = luminance(
            rgba[neighborOffset] ?? 0,
            rgba[neighborOffset + 1] ?? 0,
            rgba[neighborOffset + 2] ?? 0
          );
          edgeComparisons += 1;
          if (Math.abs(current - neighbor) > 0.1) strongEdges += 1;
        }
      }
    }
  }

  return edgeComparisons ? strongEdges / edgeComparisons : 0;
}

export function analyzeRgbaPixels(
  rgba: ArrayLike<number>,
  width: number,
  height: number
): VisualDnaProfile {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error("Visual DNA requires positive integer image dimensions.");
  }
  if (rgba.length < width * height * 4) {
    throw new Error("Visual DNA received incomplete RGBA pixel data.");
  }

  const samples: PixelSample[] = [];
  let luminanceSum = 0;
  let saturationSum = 0;
  let warmthSum = 0;
  let shadows = 0;
  let highlights = 0;

  const sampleRows = Math.min(
    height,
    Math.max(1, Math.floor(Math.sqrt((MAX_SAMPLES * height) / width)))
  );
  const sampleColumns = Math.min(
    width,
    Math.max(1, Math.floor(MAX_SAMPLES / sampleRows))
  );

  for (let sampleRow = 0; sampleRow < sampleRows; sampleRow += 1) {
    const y = Math.min(
      height - 1,
      Math.floor(((sampleRow + 0.5) * height) / sampleRows)
    );
    const rowPhase = sampleRow % 2 ? 0.25 : -0.25;

    for (let sampleColumn = 0; sampleColumn < sampleColumns; sampleColumn += 1) {
      const x = Math.min(
        width - 1,
        Math.max(
          0,
          Math.floor(
            ((sampleColumn + 0.5 + rowPhase) * width) / sampleColumns
          )
        )
      );
      const offset = (y * width + x) * 4;
      if ((rgba[offset + 3] ?? 0) < 32) continue;
      const r = rgba[offset] ?? 0;
      const g = rgba[offset + 1] ?? 0;
      const b = rgba[offset + 2] ?? 0;
      const pixelLuminance = luminance(r, g, b);
      const pixelSaturation = saturation(r, g, b);

      samples.push({
        r,
        g,
        b,
        luminance: pixelLuminance,
        saturation: pixelSaturation,
        x: width === 1 ? 0.5 : x / (width - 1),
        y: height === 1 ? 0.5 : y / (height - 1),
      });
      luminanceSum += pixelLuminance;
      saturationSum += pixelSaturation;
      warmthSum += (r - b) / 255;
      if (pixelLuminance < 0.2) shadows += 1;
      if (pixelLuminance > 0.8) highlights += 1;
    }
  }

  if (!samples.length) {
    throw new Error("Visual DNA could not find opaque pixels to analyze.");
  }

  const averageLuminance = luminanceSum / samples.length;
  const averageSaturation = saturationSum / samples.length;
  const averageWarmth = warmthSum / samples.length;
  const variance =
    samples.reduce(
      (sum, sample) => sum + (sample.luminance - averageLuminance) ** 2,
      0
    ) / samples.length;
  const contrast = Math.sqrt(variance);

  let focalWeight = 0;
  let focalX = 0;
  let focalY = 0;
  for (const sample of samples) {
    const weight =
      0.05 +
      Math.abs(sample.luminance - averageLuminance) * 1.5 +
      sample.saturation * 0.35;
    focalWeight += weight;
    focalX += sample.x * weight;
    focalY += sample.y * weight;
  }
  focalX /= focalWeight;
  focalY /= focalWeight;

  const edgeDensity = normalizedEdgeDensity(rgba, width, height);
  const textureLabel =
    edgeDensity < 0.12
      ? "minimal"
      : edgeDensity < 0.24
        ? "measured"
        : edgeDensity < 0.38
          ? "intricate"
          : "dense";

  return {
    schemaVersion: VISUAL_DNA_SCHEMA_VERSION,
    sampleCount: samples.length,
    aspectRatio: round(width / height),
    palette: dominantPalette(samples),
    color: {
      averageLuminance: round(averageLuminance),
      contrast: round(contrast),
      saturation: round(averageSaturation),
      warmth: round(averageWarmth),
      temperatureLabel:
        averageWarmth < -0.055
          ? "cool"
          : averageWarmth > 0.055
            ? "warm"
            : "neutral",
      saturationLabel:
        averageSaturation < 0.25
          ? "restrained"
          : averageSaturation > 0.55
            ? "vivid"
            : "balanced",
    },
    lighting: {
      shadowShare: round(shadows / samples.length),
      highlightShare: round(highlights / samples.length),
      keyLabel:
        averageLuminance < 0.34
          ? "low-key"
          : averageLuminance > 0.66
            ? "high-key"
            : "balanced",
      contrastLabel:
        contrast < 0.16 ? "soft" : contrast > 0.26 ? "dramatic" : "defined",
    },
    composition: {
      focalX: round(focalX),
      focalY: round(focalY),
      horizontalLabel: horizontalLabel(focalX),
      verticalLabel: verticalLabel(focalY),
    },
    texture: {
      edgeDensity: round(edgeDensity),
      label: textureLabel,
    },
  };
}

export function createVisualPrompt(
  input: VisualPromptInput,
  profile: VisualDnaProfile
) {
  const palette = profile.palette
    .slice(0, 6)
    .map((swatch) => `${swatch.hex} (${Math.round(swatch.share * 100)}%)`)
    .join(", ");
  const tags = (input.tags ?? []).slice(0, 8).join(", ");
  const metadata = [
    input.mood?.trim() ? `Mood: ${input.mood.trim()}` : null,
    tags ? `Existing tags: ${tags}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return [
    "AUTHORIZED WORLD REFERENCE",
    `World: ${input.worldTitle}`,
    `Source artwork: ${input.artworkTitle}`,
    metadata,
    "",
    "PRIMARY REQUEST",
    input.request.trim() || "Create a new original character for this visual world.",
    "",
    "MEASURED VISUAL DNA",
    `Palette: ${palette}`,
    `Color behavior: ${profile.color.temperatureLabel}, ${profile.color.saturationLabel} saturation`,
    `Lighting: ${profile.lighting.keyLabel}, ${profile.lighting.contrastLabel} contrast, ${Math.round(profile.lighting.shadowShare * 100)}% shadow field`,
    `Composition: ${profile.composition.horizontalLabel}, ${profile.composition.verticalLabel}, aspect ratio ${profile.aspectRatio}`,
    `Texture: ${profile.texture.label} edge detail`,
    "",
    "CONTINUITY RULES",
    "Preserve the measured palette relationships, lighting behavior, material density, and compositional weight without copying the source subject. Create a distinct identity that belongs naturally to the same World. Keep anatomy, equipment, materials, and perspective coherent.",
    "",
    "AVOID",
    "Do not reproduce the source character, signature composition, logos, text, watermarks, duplicate anatomy, or unrelated visual-world motifs.",
  ]
    .filter((line, index, lines) => line !== "" || lines[index - 1] !== "")
    .join("\n")
    .trim();
}
