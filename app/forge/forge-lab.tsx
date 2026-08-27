"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Braces,
  Check,
  Copy,
  Dna,
  FlaskConical,
  ImageIcon,
  LoaderCircle,
  LockKeyhole,
  Palette,
  ScanLine,
  Sparkles,
  SunMedium,
  Waypoints,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import MobileAppNavigation from "@/app/components/mobile-app-navigation";
import PolishedImage from "@/app/components/polished-image";
import { supabase } from "@/lib/supabase-browser";
import {
  analyzeRgbaPixels,
  createVisualPrompt,
  type VisualDnaProfile,
} from "@/lib/visual-dna";

type ForgeWorld = {
  id: string;
  title: string;
  world_code: string | null;
  sort_order: number | null;
};

type ForgeArtwork = {
  id: string;
  collection_id: string;
  title: string;
  src: string;
  thumb_src: string | null;
  media_type: string | null;
  mood: string | null;
  tags: string[] | null;
  sort_order: number | null;
};

const ANALYSIS_MAX_EDGE = 192;

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function sourceThumbnail(artwork: ForgeArtwork) {
  return artwork.thumb_src || artwork.src;
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The selected image could not be read."));
    image.src = source;
  });
}

async function analyzeImage(source: string) {
  const image = await loadImage(source);
  const scale = Math.min(
    1,
    ANALYSIS_MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight)
  );
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("This browser could not start pixel analysis.");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, width, height);

  try {
    const pixels = context.getImageData(0, 0, width, height);
    return analyzeRgbaPixels(pixels.data, width, height);
  } catch {
    throw new Error(
      "This image host did not permit local pixel analysis. Try an uploaded NODEINE image."
    );
  }
}

function MetricCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/25 p-4">
      <div className="flex items-center gap-2 text-cyan-300">
        {icon}
        <span className="font-mono text-[10px] uppercase tracking-[0.2em]">
          {label}
        </span>
      </div>
      <p className="mt-3 text-lg font-medium capitalize text-white">{value}</p>
      <p className="mt-1 text-xs leading-5 text-zinc-500">{detail}</p>
    </div>
  );
}

export default function ForgeLab() {
  const [authReady, setAuthReady] = useState(!supabase);
  const [userId, setUserId] = useState<string | null>(null);
  const [worlds, setWorlds] = useState<ForgeWorld[]>([]);
  const [artworks, setArtworks] = useState<ForgeArtwork[]>([]);
  const [worldId, setWorldId] = useState("");
  const [artworkId, setArtworkId] = useState("");
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(
    supabase ? null : "Supabase environment variables are missing."
  );
  const [profile, setProfile] = useState<VisualDnaProfile | null>(null);
  const [request, setRequest] = useState(
    "Create a new original character who belongs naturally to this World."
  );
  const [copied, setCopied] = useState(false);
  const [promptOverride, setPromptOverride] = useState<{
    artworkId: string;
    value: string;
  } | null>(null);
  const analysisVersion = useRef(0);
  const activeUserId = useRef<string | null>(null);

  useEffect(() => {
    const client = supabase;
    if (!client) return;

    function syncUser(nextUserId: string | null) {
      if (activeUserId.current !== nextUserId) {
        activeUserId.current = nextUserId;
        analysisVersion.current += 1;
        setAnalyzing(false);
        setWorlds([]);
        setArtworks([]);
        setWorldId("");
        setArtworkId("");
        setProfile(null);
        setPromptOverride(null);
      }
      setUserId(nextUserId);
      setAuthReady(true);
    }

    client.auth.getUser().then(({ data }) => {
      syncUser(data.user?.id ?? null);
    });

    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      syncUser(session?.user.id ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client || !userId) return;
    const database = client;
    let cancelled = false;

    async function loadCreatorLibrary() {
      // Keep the synchronization asynchronous so the effect does not cascade
      // state updates during the render cycle that started it.
      await Promise.resolve();
      if (cancelled) return;
      setLoadingLibrary(true);
      setLoadError(null);

      const worldResult = await database
        .from("collections")
        .select("id, title, world_code, sort_order")
        .eq("owner_id", userId)
        .order("sort_order");

      if (worldResult.error) throw worldResult.error;
      const nextWorlds = (worldResult.data ?? []) as ForgeWorld[];
      const worldIds = nextWorlds.map((world) => world.id);
      const artworkResult = worldIds.length
        ? await database
            .from("artworks")
            .select(
              "id, collection_id, title, src, thumb_src, media_type, mood, tags, sort_order"
            )
            .in("collection_id", worldIds)
            .order("sort_order")
        : { data: [], error: null };

      if (artworkResult.error) throw artworkResult.error;
      const nextArtworks = ((artworkResult.data ?? []) as ForgeArtwork[]).filter(
        (artwork) => !artwork.media_type || artwork.media_type === "image"
      );

      if (cancelled) return;
      const firstWorld = nextWorlds.find((world) =>
        nextArtworks.some((artwork) => artwork.collection_id === world.id)
      );
      const firstArtwork = firstWorld
        ? nextArtworks.find((artwork) => artwork.collection_id === firstWorld.id)
        : null;
      setWorlds(nextWorlds);
      setArtworks(nextArtworks);
      setWorldId(firstWorld?.id ?? nextWorlds[0]?.id ?? "");
      setArtworkId(firstArtwork?.id ?? "");
    }

    loadCreatorLibrary()
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : "Could not load your Worlds."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingLibrary(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const activeWorld = worlds.find((world) => world.id === worldId) ?? null;
  const worldArtworks = useMemo(
    () => artworks.filter((artwork) => artwork.collection_id === worldId),
    [artworks, worldId]
  );
  const activeArtwork =
    worldArtworks.find((artwork) => artwork.id === artworkId) ?? null;
  const prompt =
    profile && activeWorld && activeArtwork
      ? createVisualPrompt(
          {
            worldTitle: activeWorld.title,
            artworkTitle: activeArtwork.title,
            request,
            mood: activeArtwork.mood,
            tags: activeArtwork.tags,
          },
          profile
        )
      : "";
  const promptDraft =
    promptOverride?.artworkId === artworkId ? promptOverride.value : prompt;

  function selectWorld(nextWorldId: string) {
    analysisVersion.current += 1;
    setAnalyzing(false);
    const firstArtwork = artworks.find(
      (artwork) => artwork.collection_id === nextWorldId
    );
    setWorldId(nextWorldId);
    setArtworkId(firstArtwork?.id ?? "");
    setProfile(null);
    setPromptOverride(null);
    setCopied(false);
  }

  function selectArtwork(nextArtworkId: string) {
    analysisVersion.current += 1;
    setAnalyzing(false);
    setArtworkId(nextArtworkId);
    setProfile(null);
    setPromptOverride(null);
    setCopied(false);
  }

  async function runAnalysis() {
    if (!activeArtwork) return;
    const runVersion = ++analysisVersion.current;
    setAnalyzing(true);
    setLoadError(null);
    setProfile(null);
    setPromptOverride(null);
    try {
      const nextProfile = await analyzeImage(sourceThumbnail(activeArtwork));
      if (runVersion !== analysisVersion.current) return;
      setProfile(nextProfile);
      toast.success("Visual DNA measured locally. No credits used.");
    } catch (error) {
      if (runVersion !== analysisVersion.current) return;
      const message =
        error instanceof Error ? error.message : "Visual DNA analysis failed.";
      setLoadError(message);
      toast.error(message);
    } finally {
      if (runVersion === analysisVersion.current) setAnalyzing(false);
    }
  }

  async function copyPrompt() {
    if (!promptDraft) return;
    try {
      await navigator.clipboard.writeText(promptDraft);
      setCopied(true);
      toast.success("Portable prompt copied.");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("The prompt could not be copied in this browser.");
    }
  }

  const signedOut = authReady && !userId;

  return (
    <main className="min-h-screen bg-zinc-950 pb-[calc(7rem+env(safe-area-inset-bottom))] text-zinc-100 lg:pb-16">
      <header className="border-b border-white/10 bg-zinc-950/90 px-5 py-4 backdrop-blur-xl sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link
            href="/"
            className="text-lg font-light tracking-[0.24em] text-white transition-colors hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            NODEINE
          </Link>
          <div className="flex items-center gap-2">
            <Button
              render={<Link href="/threads" />}
              nativeButton={false}
              variant="ghost"
              className="hidden text-zinc-400 sm:inline-flex"
            >
              <Waypoints data-icon="inline-start" />
              Threads
            </Button>
            <Button
              render={<Link href="/admin" />}
              nativeButton={false}
              variant="outline"
              className="h-10 border-white/12 bg-black/30 px-3 text-zinc-200"
            >
              <ArrowLeft data-icon="inline-start" />
              Creator Studio
            </Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-white/10 px-5 py-14 sm:px-8 sm:py-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(103,232,249,.14),transparent_34%),radial-gradient(circle_at_88%_12%,rgba(168,85,247,.12),transparent_30%)]" />
        <div className="relative mx-auto max-w-7xl">
          <Badge className="border border-cyan-300/20 bg-cyan-300/8 text-cyan-200">
            <FlaskConical data-icon="inline-start" />
            Foundation release · zero credits
          </Badge>
          <h1 className="mt-6 max-w-4xl text-4xl font-light tracking-[-0.04em] text-white sm:text-6xl lg:text-7xl">
            Measure the visual language already inside your World.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-zinc-400 sm:text-lg sm:leading-8">
            Visual DNA reads real pixels locally, then Prompt Foundry translates
            those measurements into a portable creation recipe. Nothing is
            generated, published, or charged in this release.
          </p>
          <div className="mt-7 flex flex-wrap gap-3 text-xs text-zinc-500">
            {[
              "Creator-owned sources",
              "Browser-local analysis",
              "Explainable measurements",
              "Provider-neutral prompt",
            ].map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-2"
              >
                <Check className="size-3.5 text-cyan-300" aria-hidden="true" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
        {!authReady ? (
          <div className="grid min-h-64 place-items-center rounded-3xl border border-white/10 bg-white/[0.025]">
            <LoaderCircle className="size-7 animate-spin text-cyan-300 motion-reduce:animate-none" />
          </div>
        ) : signedOut ? (
          <Card className="mx-auto max-w-xl border-white/10 bg-white/[0.025] py-8 text-center ring-0">
            <CardHeader>
              <LockKeyhole className="mx-auto mb-3 size-8 text-cyan-300" />
              <CardTitle className="text-2xl text-white">Creator access required</CardTitle>
              <CardDescription className="mx-auto max-w-md leading-6 text-zinc-500">
                Forge Lab only loads Worlds owned by the signed-in creator. Public
                artwork is never converted into a private prompt recipe by default.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                render={<Link href="/admin" />}
                nativeButton={false}
                className="h-10 bg-cyan-300 px-5 text-zinc-950 hover:bg-cyan-200"
              >
                Open creator access
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
            <div className="space-y-6">
              <Card className="border-white/10 bg-zinc-950/80 ring-0">
                <CardHeader className="border-b border-white/8">
                  <CardDescription className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-300">
                    Source control
                  </CardDescription>
                  <CardTitle className="text-xl text-white">Choose your signal</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <label className="block text-xs font-medium text-zinc-400">
                    World
                    <NativeSelect
                      value={worldId}
                      onChange={(event) => selectWorld(event.target.value)}
                      disabled={loadingLibrary || !worlds.length}
                      className="mt-2 w-full"
                    >
                      {worlds.map((world) => (
                        <NativeSelectOption key={world.id} value={world.id}>
                          {world.world_code ? `${world.world_code} — ` : ""}
                          {world.title}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </label>

                  <label className="block text-xs font-medium text-zinc-400">
                    Source artwork
                    <NativeSelect
                      value={artworkId}
                      onChange={(event) => selectArtwork(event.target.value)}
                      disabled={loadingLibrary || !worldArtworks.length}
                      className="mt-2 w-full"
                    >
                      {worldArtworks.map((artwork) => (
                        <NativeSelectOption key={artwork.id} value={artwork.id}>
                          {artwork.title}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </label>

                  {!!worldArtworks.length && (
                    <div>
                      <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600">
                        World images · {worldArtworks.length}
                      </p>
                      <div className="grid max-h-72 grid-cols-4 gap-2 overflow-y-auto pr-1">
                        {worldArtworks.map((artwork) => {
                          const selected = artwork.id === artworkId;
                          return (
                            <button
                              key={artwork.id}
                              type="button"
                              onClick={() => selectArtwork(artwork.id)}
                              aria-label={`Use ${artwork.title}`}
                              aria-pressed={selected}
                              className={`nodeine-action relative aspect-[3/4] overflow-hidden rounded-lg border bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
                                selected
                                  ? "border-cyan-300 ring-1 ring-cyan-300/40"
                                  : "border-white/8 hover:border-white/25"
                              }`}
                            >
                              <PolishedImage
                                src={sourceThumbnail(artwork)}
                                alt=""
                                wrapperClassName="size-full"
                                className="size-full object-cover"
                                loading="lazy"
                              />
                              {selected && (
                                <span className="absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-cyan-300 text-zinc-950">
                                  <Check className="size-3" aria-hidden="true" />
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {!loadingLibrary && !worlds.length && (
                    <p className="rounded-xl border border-dashed border-white/12 p-4 text-xs leading-5 text-zinc-500">
                      Publish an image into a World before starting Visual DNA.
                    </p>
                  )}

                  <Button
                    type="button"
                    onClick={runAnalysis}
                    disabled={!activeArtwork || analyzing}
                    className="h-11 w-full bg-cyan-300 text-zinc-950 hover:bg-cyan-200"
                  >
                    {analyzing ? (
                      <LoaderCircle
                        data-icon="inline-start"
                        className="animate-spin motion-reduce:animate-none"
                      />
                    ) : (
                      <ScanLine data-icon="inline-start" />
                    )}
                    {analyzing ? "Reading pixels…" : "Measure Visual DNA"}
                  </Button>
                  <p className="flex items-start gap-2 text-[11px] leading-5 text-zinc-600">
                    <LockKeyhole className="mt-0.5 size-3.5 shrink-0" />
                    Pixel calculations happen in this browser. This foundation
                    release makes no AI provider request and spends no credits.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-violet-300/12 bg-violet-300/[0.035] ring-0">
                <CardHeader>
                  <CardDescription className="font-mono text-[10px] uppercase tracking-[0.2em] text-violet-300">
                    Deliberately gated
                  </CardDescription>
                  <CardTitle className="text-lg text-white">Character Forge</CardTitle>
                </CardHeader>
                <CardContent className="text-xs leading-5 text-zinc-500">
                  Generation, precision editing, identity lock, and upscaling stay
                  disabled until the multi-World quality and cost benchmark passes.
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="overflow-hidden border-white/10 bg-zinc-950/80 ring-0">
                <CardHeader className="border-b border-white/8 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardDescription className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-300">
                      Active reference
                    </CardDescription>
                    <CardTitle className="mt-1 text-xl text-white">
                      {activeArtwork?.title ?? "Select an artwork"}
                    </CardTitle>
                  </div>
                  {activeWorld && (
                    <Badge className="border border-white/10 bg-black/30 text-zinc-400">
                      {activeWorld.world_code ?? "World"} · {activeWorld.title}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="p-0">
                  {activeArtwork ? (
                    <div className="grid bg-black/40 xl:grid-cols-[minmax(0,1fr)_18rem]">
                      <div className="grid min-h-[28rem] place-items-center p-4 sm:p-7">
                        <PolishedImage
                          src={activeArtwork.src}
                          alt={activeArtwork.title}
                          wrapperClassName="max-h-[46rem] max-w-full rounded-2xl shadow-2xl shadow-black/60"
                          className="max-h-[46rem] w-auto max-w-full object-contain"
                        />
                      </div>
                      <div className="border-t border-white/8 p-5 xl:border-l xl:border-t-0">
                        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600">
                          Archive metadata
                        </p>
                        <dl className="mt-4 space-y-4 text-xs">
                          <div>
                            <dt className="text-zinc-600">Mood</dt>
                            <dd className="mt-1 leading-5 text-zinc-300">
                              {activeArtwork.mood || "Not described yet"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-zinc-600">Tags</dt>
                            <dd className="mt-2 flex flex-wrap gap-1.5">
                              {(activeArtwork.tags ?? []).length ? (
                                activeArtwork.tags?.map((tag) => (
                                  <span
                                    key={tag}
                                    className="rounded-full border border-white/8 bg-white/[0.035] px-2 py-1 text-[10px] text-zinc-400"
                                  >
                                    {tag}
                                  </span>
                                ))
                              ) : (
                                <span className="text-zinc-500">No tags yet</span>
                              )}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    </div>
                  ) : (
                    <div className="grid min-h-96 place-items-center text-center text-zinc-600">
                      <div>
                        <ImageIcon className="mx-auto size-8" />
                        <p className="mt-3 text-sm">No image source selected.</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {loadError && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-400/20 bg-rose-400/8 px-4 py-3 text-sm text-rose-200"
                >
                  {loadError}
                </div>
              )}

              {profile ? (
                <>
                  <Card className="border-cyan-300/15 bg-[linear-gradient(145deg,rgba(8,145,178,.08),rgba(9,9,11,.92)_48%)] ring-0">
                    <CardHeader className="border-b border-white/8 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <CardDescription className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-300">
                          Measured profile
                        </CardDescription>
                        <CardTitle className="mt-1 text-2xl font-light text-white">
                          Visual DNA
                        </CardTitle>
                      </div>
                      <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-zinc-600">
                        {profile.schemaVersion} · {profile.sampleCount.toLocaleString()} samples
                      </span>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div>
                        <div className="mb-3 flex items-center gap-2 text-cyan-300">
                          <Palette className="size-4" aria-hidden="true" />
                          <span className="font-mono text-[10px] uppercase tracking-[0.2em]">
                            Dominant palette
                          </span>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
                          {profile.palette.map((swatch) => (
                            <div
                              key={swatch.hex}
                              className="overflow-hidden rounded-xl border border-white/10 bg-black/25"
                            >
                              <div
                                className="h-14"
                                style={{ backgroundColor: swatch.hex }}
                              />
                              <div className="flex items-center justify-between gap-2 px-2.5 py-2 font-mono text-[9px] text-zinc-500">
                                <span>{swatch.hex}</span>
                                <span>{percent(swatch.share)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <MetricCard
                          icon={<SunMedium className="size-4" aria-hidden="true" />}
                          label="Lighting"
                          value={`${profile.lighting.keyLabel} · ${profile.lighting.contrastLabel}`}
                          detail={`${percent(profile.lighting.shadowShare)} shadows · ${percent(profile.lighting.highlightShare)} highlights`}
                        />
                        <MetricCard
                          icon={<Palette className="size-4" aria-hidden="true" />}
                          label="Color"
                          value={`${profile.color.temperatureLabel} · ${profile.color.saturationLabel}`}
                          detail={`${percent(profile.color.saturation)} average saturation`}
                        />
                        <MetricCard
                          icon={<Dna className="size-4" aria-hidden="true" />}
                          label="Texture"
                          value={profile.texture.label}
                          detail={`${percent(profile.texture.edgeDensity)} strong local edge density`}
                        />
                        <MetricCard
                          icon={<ScanLine className="size-4" aria-hidden="true" />}
                          label="Composition"
                          value={`${profile.composition.horizontalLabel} · ${profile.composition.verticalLabel}`}
                          detail={`Aspect ratio ${profile.aspectRatio}`}
                        />
                      </div>

                      <div>
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                            Attention signal
                          </span>
                          <span className="text-[10px] text-zinc-600">
                            Pixel-weighted, not semantic eye tracking
                          </span>
                        </div>
                        <div className="relative aspect-[16/5] overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(90deg,rgba(34,211,238,.05)_1px,transparent_1px),linear-gradient(rgba(34,211,238,.05)_1px,transparent_1px)] [background-size:33.333%_50%]">
                          <span
                            className="absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-cyan-300 shadow-[0_0_28px_rgba(103,232,249,.9)]"
                            style={{
                              left: `${profile.composition.focalX * 100}%`,
                              top: `${profile.composition.focalY * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-violet-300/15 bg-[linear-gradient(145deg,rgba(139,92,246,.09),rgba(9,9,11,.94)_45%)] ring-0">
                    <CardHeader className="border-b border-white/8 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <CardDescription className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-violet-300">
                          <Braces className="size-3.5" />
                          Prompt Foundry
                        </CardDescription>
                        <CardTitle className="mt-2 text-2xl font-light text-white">
                          Portable creation recipe
                        </CardTitle>
                        <CardDescription className="mt-2 max-w-2xl leading-6 text-zinc-500">
                          Edit the intent, then copy a provider-neutral prompt grounded
                          in measured pixels and existing World metadata.
                        </CardDescription>
                      </div>
                      <Badge className="mt-1 border border-emerald-300/15 bg-emerald-300/8 text-emerald-200">
                        Free · no provider call
                      </Badge>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <label className="block text-xs font-medium text-zinc-400">
                        Creation intent
                        <Textarea
                          value={request}
                          onChange={(event) => setRequest(event.target.value)}
                          className="mt-2 min-h-24 border-white/10 bg-black/30 leading-6 text-zinc-200"
                        />
                      </label>
                      <div>
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600">
                            Generated recipe
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={copyPrompt}
                            className="border-white/12 bg-black/30 text-zinc-200"
                          >
                            {copied ? (
                              <Check data-icon="inline-start" />
                            ) : (
                              <Copy data-icon="inline-start" />
                            )}
                            {copied ? "Copied" : "Copy prompt"}
                          </Button>
                        </div>
                        <Textarea
                          aria-label="Generated recipe"
                          value={promptDraft}
                          onChange={(event) =>
                            setPromptOverride({
                              artworkId,
                              value: event.target.value,
                            })
                          }
                          className="min-h-[28rem] resize-y border-white/10 bg-black/45 p-4 font-mono text-[11px] leading-6 text-zinc-400"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card className="border-dashed border-white/12 bg-white/[0.02] py-10 text-center ring-0">
                  <CardContent>
                    <Sparkles className="mx-auto size-7 text-zinc-600" />
                    <h2 className="mt-4 text-xl font-medium text-white">
                      Your first measurement is waiting.
                    </h2>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
                      Select one of your images and measure it. Silhouette masks and
                      semantic material analysis remain clearly gated for the next
                      model-backed release.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </section>

      <MobileAppNavigation />
    </main>
  );
}
