"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  LoaderCircle,
  LockKeyhole,
  Network,
  Play,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import MobileAppNavigation from "@/app/components/mobile-app-navigation";
import { isVideoArtwork } from "@/app/components/artwork-media";
import PolishedImage from "@/app/components/polished-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase-browser";
import {
  createWorldThread,
  getComposerArtwork,
  getWorldThreadBySlug,
  updateWorldThread,
  validateWorldThreadDraft,
  WORLD_THREAD_MAX_ITEMS,
  WORLD_THREAD_MIN_ITEMS,
  WORLD_THREAD_RELATIONS,
  worldThreadRelationLabel,
  type ThreadArtwork,
  type WorldThread,
  type WorldThreadDraft,
  type WorldThreadDraftItem,
  type WorldThreadRelation,
} from "@/lib/world-threads";
import ThreadHeader from "./thread-header";

type ComposerMode = "create" | "edit";
type ComposerState =
  | "loading"
  | "ready"
  | "signed-out"
  | "not-found"
  | "unavailable";

type ThreadComposerProps = {
  mode: ComposerMode;
  seedArtworkId?: string | null;
  slug?: string;
};

const emptyDraft: WorldThreadDraft = {
  title: "",
  summary: "",
  visibility: "draft",
  allowForks: true,
  items: [],
};

function artworkSearchText(artwork: ThreadArtwork) {
  return [
    artwork.title,
    artwork.mood,
    artwork.collection?.title,
    artwork.collection?.worldCode,
    artwork.collection?.creator?.displayName,
    artwork.collection?.creator?.username,
    ...artwork.tags,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function artworkPreviewSrc(artwork: ThreadArtwork) {
  return artwork.thumbSrc || (
    isVideoArtwork(artwork.mediaType, artwork.src)
      ? "/video-placeholder.svg"
      : artwork.src
  );
}

function draftFromThread(thread: WorldThread): WorldThreadDraft {
  return {
    title: thread.title,
    summary: thread.summary ?? "",
    visibility: thread.visibility,
    allowForks: thread.allowForks,
    items: thread.items.map((item, index) => ({
      artworkId: item.artwork.id,
      relationType: index === 0 ? "origin" : item.relationType,
      note: item.note ?? "",
    })),
  };
}

function threadArtworkById(artworks: ThreadArtwork[]) {
  return new Map(artworks.map((artwork) => [artwork.id, artwork]));
}

export default function ThreadComposer({
  mode,
  seedArtworkId,
  slug,
}: ThreadComposerProps) {
  const router = useRouter();
  const [loadState, setLoadState] = useState<ComposerState>(
    supabase ? "loading" : "unavailable"
  );
  const [artworks, setArtworks] = useState<ThreadArtwork[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [draft, setDraft] = useState<WorldThreadDraft>(emptyDraft);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const database = client;
    let cancelled = false;
    let requestNumber = 0;

    async function load(userId: string | null) {
      const request = ++requestNumber;
      if (!userId) {
        if (!cancelled) setLoadState("signed-out");
        return;
      }

      setLoadState("loading");
      setError(null);

      try {
        let existingThread: WorldThread | null = null;
        const includedIds: string[] = [];

        if (mode === "edit") {
          if (!slug) {
            setLoadState("not-found");
            return;
          }
          existingThread = await getWorldThreadBySlug(database, slug);
          if (!existingThread || existingThread.ownerId !== userId) {
            if (!cancelled && request === requestNumber) {
              setLoadState("not-found");
            }
            return;
          }
          includedIds.push(
            ...existingThread.items.map((item) => item.artwork.id)
          );
        } else if (seedArtworkId) {
          includedIds.push(seedArtworkId);
        }

        const availableArtwork = await getComposerArtwork(
          database,
          userId,
          includedIds
        );
        if (cancelled || request !== requestNumber) return;

        setArtworks(availableArtwork);
        if (existingThread) {
          setThreadId(existingThread.id);
          setDraft(draftFromThread(existingThread));
        } else {
          const hasSeed =
            !!seedArtworkId &&
            availableArtwork.some((artwork) => artwork.id === seedArtworkId);
          setDraft({
            ...emptyDraft,
            items: hasSeed
              ? [
                  {
                    artworkId: seedArtworkId,
                    relationType: "origin",
                    note: "",
                  },
                ]
              : [],
          });
        }
        setLoadState("ready");
      } catch (loadError) {
        if (cancelled || request !== requestNumber) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "World Threads could not be loaded."
        );
        setLoadState("unavailable");
      }
    }

    database.auth.getUser().then(({ data }) => load(data.user?.id ?? null));

    return () => {
      cancelled = true;
    };
  }, [mode, seedArtworkId, slug]);

  const selectedIds = useMemo(
    () => new Set(draft.items.map((item) => item.artworkId)),
    [draft.items]
  );
  const artworkById = useMemo(() => threadArtworkById(artworks), [artworks]);
  const availableArtwork = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return artworks.filter(
      (artwork) =>
        !selectedIds.has(artwork.id) &&
        (!normalizedQuery ||
          artworkSearchText(artwork).includes(normalizedQuery))
    );
  }, [artworks, query, selectedIds]);

  function addArtwork(artworkId: string) {
    setDraft((current) => {
      if (
        current.items.length >= WORLD_THREAD_MAX_ITEMS ||
        current.items.some((item) => item.artworkId === artworkId)
      ) {
        return current;
      }
      return {
        ...current,
        items: [
          ...current.items,
          {
            artworkId,
            relationType: current.items.length === 0 ? "origin" : "mood",
            note: "",
          },
        ],
      };
    });
  }

  function removeArtwork(index: number) {
    setDraft((current) => {
      const items = current.items.filter((_, itemIndex) => itemIndex !== index);
      return {
        ...current,
        items: items.map((item, itemIndex) => ({
          ...item,
          relationType: itemIndex === 0 ? "origin" : item.relationType === "origin" ? "mood" : item.relationType,
        })),
      };
    });
  }

  function moveArtwork(index: number, direction: -1 | 1) {
    setDraft((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.items.length) return current;
      const items = [...current.items];
      [items[index], items[nextIndex]] = [items[nextIndex], items[index]];
      return {
        ...current,
        items: items.map((item, itemIndex) => ({
          ...item,
          relationType: itemIndex === 0 ? "origin" : item.relationType === "origin" ? "mood" : item.relationType,
        })),
      };
    });
  }

  function updateItem(index: number, patch: Partial<WorldThreadDraftItem>) {
    setDraft((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      ),
    }));
  }

  async function submitThread(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const database = supabase;
    if (!database || saving) return;

    const validation = validateWorldThreadDraft(draft);
    if (validation.error || !validation.value) {
      setError(validation.error || "The thread is incomplete.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const result =
        mode === "edit" && threadId
          ? await updateWorldThread(database, threadId, validation.value)
          : await createWorldThread(database, validation.value);
      router.push(`/threads/${result.threadSlug}`);
      router.refresh();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "The thread could not be saved."
      );
      setSaving(false);
    }
  }

  if (loadState === "loading") {
    return <ComposerStatus title="Loading your stash" detail="Gathering saved references and their permanent credits." loading />;
  }

  if (loadState === "signed-out") {
    return (
      <ComposerStatus
        title="Sign in to draw a path"
        detail="World Threads live with your NODEINE profile so your authorship, drafts, and forks stay connected."
        actionHref="/admin"
        actionLabel="Sign in"
      />
    );
  }

  if (loadState === "not-found") {
    return (
      <ComposerStatus
        title="This draft is out of reach"
        detail="It may not exist, or it belongs to another maker. Only the owner can edit a World Thread."
        actionHref="/threads"
        actionLabel="Browse threads"
      />
    );
  }

  if (loadState === "unavailable") {
    return (
      <ComposerStatus
        title="The composer could not open"
        detail={error || "Check the database connection and try again."}
        actionHref="/threads"
        actionLabel="Back to threads"
      />
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 pb-[calc(7rem+env(safe-area-inset-bottom))] text-zinc-100 lg:pb-0">
      <ThreadHeader />
      <form onSubmit={submitThread} className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
        <div className="flex flex-col gap-5 border-b border-white/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href={mode === "edit" && slug ? `/threads/${slug}` : "/threads"}
              className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-zinc-500 hover:text-white"
            >
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              {mode === "edit" ? "Back to thread" : "All threads"}
            </Link>
            <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-300">
              {mode === "edit" ? "Refine the lineage" : "Draw a new lineage"}
            </p>
            <h1 className="mt-2 text-3xl font-light tracking-[-0.03em] text-white sm:text-5xl">
              {mode === "edit" ? "Edit World Thread" : "Create World Thread"}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
              Order {WORLD_THREAD_MIN_ITEMS}–{WORLD_THREAD_MAX_ITEMS} pieces and name why each one follows the last. The path is human-authored; NODEINE keeps the original maker and world attached.
            </p>
          </div>
          <Button
            type="submit"
            disabled={saving || draft.items.length < WORLD_THREAD_MIN_ITEMS || !draft.title.trim()}
            className="h-11 rounded-full px-5 font-semibold"
          >
            {saving ? (
              <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : (
              <Check className="size-4" aria-hidden="true" />
            )}
            {saving ? "Saving path" : mode === "edit" ? "Save changes" : "Create thread"}
          </Button>
        </div>

        {error && (
          <div role="alert" className="mt-6 rounded-2xl border border-rose-400/25 bg-rose-400/8 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,.65fr)]">
          <div className="space-y-8">
            <section aria-labelledby="thread-details-heading" className="rounded-[1.75rem] border border-white/10 bg-white/[0.025] p-5 sm:p-7">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-cyan-300/10 text-cyan-200">
                  <Sparkles className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">01 / Identity</p>
                  <h2 id="thread-details-heading" className="text-lg font-medium text-white">Name the path</h2>
                </div>
              </div>

              <div className="mt-6 grid gap-5">
                <label className="grid gap-2 text-xs font-medium uppercase tracking-[0.14em] text-zinc-400">
                  Thread title
                  <Input
                    value={draft.title}
                    onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                    placeholder="Moonlit armor, inherited fire"
                    maxLength={80}
                    required
                    className="h-11 rounded-xl normal-case tracking-normal text-white"
                  />
                </label>
                <label className="grid gap-2 text-xs font-medium uppercase tracking-[0.14em] text-zinc-400">
                  Curator note <span className="normal-case tracking-normal text-zinc-600">Optional</span>
                  <Textarea
                    value={draft.summary}
                    onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value }))}
                    placeholder="What idea does this sequence reveal?"
                    maxLength={320}
                    className="min-h-24 rounded-xl normal-case tracking-normal text-white"
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <fieldset className="grid gap-2">
                    <legend className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-400">Visibility</legend>
                    <div className="grid grid-cols-2 gap-2">
                      {(["draft", "public"] as const).map((visibility) => (
                        <button
                          key={visibility}
                          type="button"
                          onClick={() => setDraft((current) => ({ ...current, visibility }))}
                          aria-pressed={draft.visibility === visibility}
                          className={`nodeine-action min-h-10 rounded-xl border px-3 text-sm capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
                            draft.visibility === visibility
                              ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-100"
                              : "border-white/10 bg-black/20 text-zinc-500 hover:text-white"
                          }`}
                        >
                          {visibility}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <label className="flex min-h-16 items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-4 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      checked={draft.allowForks}
                      onChange={(event) => setDraft((current) => ({ ...current, allowForks: event.target.checked }))}
                      className="size-4 accent-cyan-300"
                    />
                    <span>
                      Allow credited forks
                      <span className="mt-0.5 block text-xs text-zinc-600">Your original stays linked.</span>
                    </span>
                  </label>
                </div>
              </div>
            </section>

            <section aria-labelledby="thread-sequence-heading" className="rounded-[1.75rem] border border-white/10 bg-white/[0.025] p-5 sm:p-7">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-xl bg-violet-300/10 text-violet-200">
                    <Network className="size-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">02 / Sequence</p>
                    <h2 id="thread-sequence-heading" className="text-lg font-medium text-white">Explain the connections</h2>
                  </div>
                </div>
                <span className="font-mono text-xs text-zinc-500">{draft.items.length}/{WORLD_THREAD_MAX_ITEMS}</span>
              </div>

              <div className="mt-6 space-y-4">
                {draft.items.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-white/12 px-5 py-10 text-center text-sm text-zinc-500">
                    Select a piece from your stash to establish the origin.
                  </div>
                )}
                {draft.items.map((item, index) => {
                  const artwork = artworkById.get(item.artworkId);
                  if (!artwork) return null;
                  return (
                    <article key={item.artworkId} className="grid gap-4 rounded-2xl border border-white/10 bg-black/25 p-3 sm:grid-cols-[112px_minmax(0,1fr)] sm:p-4">
                      <div className="relative">
                        <PolishedImage
                          src={artworkPreviewSrc(artwork)}
                          alt={artwork.title}
                          wrapperClassName="aspect-square rounded-xl"
                          className="size-full object-cover"
                        />
                        {isVideoArtwork(artwork.mediaType, artwork.src) && (
                          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/80 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.14em] text-white">
                            <Play className="size-2.5 fill-current" aria-hidden="true" />
                            Video
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-300">Step {String(index + 1).padStart(2, "0")}</p>
                            <h3 className="mt-1 truncate font-medium text-white">{artwork.title}</h3>
                            <p className="mt-1 truncate text-xs text-zinc-500">{artwork.collection?.worldCode || "Visual world"} · {artwork.collection?.title || "NODEINE"}</p>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <Button type="button" variant="ghost" size="icon-sm" onClick={() => moveArtwork(index, -1)} disabled={index === 0} aria-label={`Move ${artwork.title} earlier`}>
                              <ArrowUp className="size-3.5" aria-hidden="true" />
                            </Button>
                            <Button type="button" variant="ghost" size="icon-sm" onClick={() => moveArtwork(index, 1)} disabled={index === draft.items.length - 1} aria-label={`Move ${artwork.title} later`}>
                              <ArrowDown className="size-3.5" aria-hidden="true" />
                            </Button>
                            <Button type="button" variant="destructive" size="icon-sm" onClick={() => removeArtwork(index)} aria-label={`Remove ${artwork.title}`}>
                              <Trash2 className="size-3.5" aria-hidden="true" />
                            </Button>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)]">
                          <label className="grid gap-1.5 text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                            Relationship
                            {index === 0 ? (
                              <div className="flex h-9 items-center rounded-lg border border-cyan-300/20 bg-cyan-300/8 px-3 text-xs normal-case tracking-normal text-cyan-200">Origin</div>
                            ) : (
                              <NativeSelect
                                value={item.relationType}
                                onChange={(event) => updateItem(index, { relationType: event.target.value as WorldThreadRelation })}
                                aria-label={`Relationship for ${artwork.title}`}
                                className="w-full"
                              >
                                {WORLD_THREAD_RELATIONS.filter((relation) => relation !== "origin").map((relation) => (
                                  <NativeSelectOption key={relation} value={relation}>{worldThreadRelationLabel(relation)}</NativeSelectOption>
                                ))}
                              </NativeSelect>
                            )}
                          </label>
                          <label className="grid gap-1.5 text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                            Why it connects <span className="normal-case tracking-normal text-zinc-700">Optional</span>
                            <Input
                              value={item.note}
                              onChange={(event) => updateItem(index, { note: event.target.value })}
                              maxLength={280}
                              placeholder={index === 0 ? "What begins here?" : "What carries forward?"}
                              className="h-9 normal-case tracking-normal text-white"
                            />
                          </label>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>

          <aside className="xl:sticky xl:top-6 xl:self-start">
            <section aria-labelledby="stash-heading" className="rounded-[1.75rem] border border-white/10 bg-zinc-900/60 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">03 / Source</p>
                  <h2 id="stash-heading" className="mt-1 text-lg font-medium text-white">Your stash</h2>
                </div>
                <span className="text-xs text-zinc-500">{availableArtwork.length} available</span>
              </div>
              <label className="relative mt-5 block">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-600" aria-hidden="true" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search saved art, worlds, moods"
                  aria-label="Search your saved artwork"
                  className="h-10 rounded-xl pl-10"
                />
              </label>

              <div className="mt-5 grid max-h-[62svh] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3 xl:grid-cols-2">
                {availableArtwork.map((artwork) => (
                  <button
                    key={artwork.id}
                    type="button"
                    onClick={() => addArtwork(artwork.id)}
                    disabled={draft.items.length >= WORLD_THREAD_MAX_ITEMS}
                    className="group relative overflow-hidden rounded-xl border border-white/10 bg-black text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:opacity-40"
                  >
                    <PolishedImage
                      src={artworkPreviewSrc(artwork)}
                      alt=""
                      wrapperClassName="aspect-[4/5]"
                      className="size-full object-cover transition duration-300 group-hover:scale-[1.03]"
                    />
                    {isVideoArtwork(artwork.mediaType, artwork.src) && (
                      <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/80 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.14em] text-white">
                        <Play className="size-2.5 fill-current" aria-hidden="true" />
                        Video
                      </span>
                    )}
                    <span className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-cyan-300 text-zinc-950 shadow-lg">
                      <Plus className="size-3.5" aria-hidden="true" />
                    </span>
                    <span className="block p-3">
                      <span className="line-clamp-1 text-xs font-medium text-white">{artwork.title}</span>
                      <span className="mt-1 line-clamp-1 block text-[10px] text-zinc-500">{artwork.collection?.title || "NODEINE"}</span>
                    </span>
                  </button>
                ))}
              </div>

              {availableArtwork.length === 0 && (
                <div className="mt-5 rounded-2xl border border-dashed border-white/12 px-4 py-8 text-center">
                  <LockKeyhole className="mx-auto size-5 text-zinc-600" aria-hidden="true" />
                  <p className="mt-3 text-sm text-zinc-400">{query ? "No saved work matches that search." : "Everything in your stash is already on this path."}</p>
                  <Link href="/discover" className="mt-3 inline-flex text-xs text-cyan-300 hover:text-cyan-200">Discover more artwork</Link>
                </div>
              )}
            </section>
          </aside>
        </div>
      </form>
      <MobileAppNavigation />
    </main>
  );
}

function ComposerStatus({
  title,
  detail,
  loading = false,
  actionHref,
  actionLabel,
}: {
  title: string;
  detail: string;
  loading?: boolean;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <ThreadHeader />
      <div className="grid min-h-[calc(100svh-73px)] place-items-center px-5 py-16">
        <div className="max-w-md text-center">
          {loading ? (
            <LoaderCircle className="mx-auto size-8 animate-spin text-cyan-300 motion-reduce:animate-none" aria-hidden="true" />
          ) : (
            <Network className="mx-auto size-8 text-cyan-300" aria-hidden="true" />
          )}
          <h1 className="mt-5 text-2xl font-medium text-white">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">{detail}</p>
          {actionHref && actionLabel && (
            <Link href={actionHref} className="mt-6 inline-flex min-h-10 items-center rounded-full bg-cyan-300 px-5 text-sm font-semibold text-zinc-950 hover:bg-cyan-200">
              {actionLabel}
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
