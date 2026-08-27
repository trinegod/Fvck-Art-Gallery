import assert from "node:assert/strict";
import test from "node:test";
import {
  analyzeRgbaPixels,
  createVisualPrompt,
} from "../lib/visual-dna";

function solidPixels(width: number, height: number, rgba: [number, number, number, number]) {
  return new Uint8ClampedArray(
    Array.from({ length: width * height }, () => rgba).flat()
  );
}

test("measures a solid warm image deterministically", () => {
  const profile = analyzeRgbaPixels(
    solidPixels(4, 4, [220, 90, 30, 255]),
    4,
    4
  );

  assert.equal(profile.sampleCount, 16);
  assert.equal(profile.aspectRatio, 1);
  assert.equal(profile.palette[0].hex, "#DC5A1E");
  assert.equal(profile.palette[0].share, 1);
  assert.equal(
    profile.palette.reduce((sum, swatch) => sum + swatch.share, 0),
    1
  );
  assert.equal(profile.color.temperatureLabel, "warm");
  assert.equal(profile.texture.label, "minimal");
  assert.equal(profile.composition.horizontalLabel, "centered");
});

test("detects contrast, shadows, highlights, and normalized coarse edges", () => {
  const pixels = new Uint8ClampedArray([
    0, 0, 0, 255,
    255, 255, 255, 255,
    255, 255, 255, 255,
    0, 0, 0, 255,
  ]);
  const profile = analyzeRgbaPixels(pixels, 2, 2);

  assert.equal(profile.lighting.contrastLabel, "dramatic");
  assert.equal(profile.lighting.shadowShare, 0.5);
  assert.equal(profile.lighting.highlightShare, 0.5);
  assert.equal(profile.texture.label, "minimal");
});

test("does not alias alternating color stripes in larger images", () => {
  const width = 192;
  const height = 192;
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const offset = pixel * 4;
    const red = pixel % width % 2 === 0;
    pixels[offset] = red ? 255 : 0;
    pixels[offset + 1] = 0;
    pixels[offset + 2] = red ? 0 : 255;
    pixels[offset + 3] = 255;
  }

  const profile = analyzeRgbaPixels(pixels, width, height);
  const redShare = profile.palette.find((swatch) => swatch.hex === "#FF0000")?.share;
  const blueShare = profile.palette.find((swatch) => swatch.hex === "#0000FF")?.share;

  assert.ok(redShare && redShare > 0.4 && redShare < 0.6);
  assert.ok(blueShare && blueShare > 0.4 && blueShare < 0.6);
  assert.ok(profile.texture.edgeDensity > 0.15);
});

test("normalizes the same large-scale texture across source resolutions", () => {
  function scaledChecker(size: number) {
    const pixels = new Uint8ClampedArray(size * size * 4);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const offset = (y * size + x) * 4;
        const light = (x < size / 2) === (y < size / 2);
        const channel = light ? 255 : 0;
        pixels[offset] = channel;
        pixels[offset + 1] = channel;
        pixels[offset + 2] = channel;
        pixels[offset + 3] = 255;
      }
    }
    return pixels;
  }

  const densities = [2, 4, 16, 64].map(
    (size) => analyzeRgbaPixels(scaledChecker(size), size, size).texture.edgeDensity
  );
  assert.ok(Math.max(...densities) - Math.min(...densities) < 0.01);
});

test("ignores transparent pixels", () => {
  const profile = analyzeRgbaPixels(
    new Uint8ClampedArray([
      10, 20, 30, 0,
      20, 40, 220, 255,
    ]),
    2,
    1
  );

  assert.equal(profile.sampleCount, 1);
  assert.equal(profile.palette[0].hex, "#1428DC");
  assert.equal(profile.color.temperatureLabel, "cool");
});

test("rejects invalid dimensions and empty visible images", () => {
  assert.throws(
    () => analyzeRgbaPixels(new Uint8ClampedArray(), 0, 2),
    /positive integer/i
  );
  assert.throws(
    () => analyzeRgbaPixels(solidPixels(1, 1, [0, 0, 0, 0]), 1, 1),
    /opaque pixels/i
  );
});

test("builds an explainable portable prompt from measured values", () => {
  const profile = analyzeRgbaPixels(
    solidPixels(2, 4, [18, 42, 86, 255]),
    2,
    4
  );
  const prompt = createVisualPrompt(
    {
      worldTitle: "Cyber X",
      artworkTitle: "Cyber X 01",
      request: "Create an original courier.",
      mood: "Rain-soaked analog future",
      tags: ["cyberpunk", "rain"],
    },
    profile
  );

  assert.match(prompt, /AUTHORIZED WORLD REFERENCE/);
  assert.match(prompt, /World: Cyber X/);
  assert.match(prompt, /#122A56/);
  assert.match(prompt, /Create an original courier/);
  assert.match(prompt, /without copying the source subject/i);
});
