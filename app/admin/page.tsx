"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

type Collection = {
  id: string;
  title: string;
  world_code: string | null;
  sort_order: number | null;
};

type Artwork = {
  id: string;
  collection_id: string;
  title: string;
  src: string;
  mood: string | null;
  tags: string[] | null;
  sort_order: number | null;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export default function AdminPage() {
  const [mode, setMode] = useState<"artwork" | "collection" | "manage">(
    "artwork"
  );
  const [authReady, setAuthReady] = useState(!supabase);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionId, setCollectionId] = useState("");
  const [title, setTitle] = useState("");
  const [mood, setMood] = useState("");
  const [tags, setTags] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [newCollectionTitle, setNewCollectionTitle] = useState("");
  const [newCollectionSummary, setNewCollectionSummary] = useState("");
  const [newWorldNumber, setNewWorldNumber] = useState("");
  const [newSortOrder, setNewSortOrder] = useState("");
  const [manageCollectionId, setManageCollectionId] = useState("");
  const [managedArtworks, setManagedArtworks] = useState<Artwork[]>([]);
  const [selectedArtworkId, setSelectedArtworkId] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editMood, setEditMood] = useState("");
  const [editTags, setEditTags] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    supabase ? null : "Supabase environment variables are missing."
  );

  useEffect(() => {
    const client = supabase;

    if (!client) return;

    client.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
      setAuthReady(true);
    });

    const { data: authListener } = client.auth.onAuthStateChange(
      (_event, session) => {
        setUserEmail(session?.user.email ?? null);
        setAuthReady(true);
      }
    );

    return () => authListener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client || !userEmail) return;

    async function loadCollections(database: NonNullable<typeof supabase>) {
      const { data, error: collectionsError } = await database
        .from("collections")
        .select("id, title, world_code, sort_order")
        .order("sort_order");

      if (collectionsError) {
        setError(collectionsError.message);
        return;
      }

      const rows = (data ?? []) as Collection[];
      setCollections(rows);
      setCollectionId((current) => current || rows[0]?.id || "");
      setManageCollectionId((current) => current || rows[0]?.id || "");
    }

    loadCollections(client);
  }, [userEmail]);

  function slugify(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function selectArtwork(artwork: Artwork) {
    setSelectedArtworkId(artwork.id);
    setEditTitle(artwork.title);
    setEditMood(artwork.mood ?? "");
    setEditTags((artwork.tags ?? []).join(", "));
    setError(null);
    setMessage(null);
  }

  async function loadManagedArtworks(targetCollectionId: string) {
    const client = supabase;
    if (!client || !targetCollectionId) return;

    setBusy(true);
    setError(null);
    setMessage(null);

    const { data, error: artworksError } = await client
      .from("artworks")
      .select("id, collection_id, title, src, mood, tags, sort_order")
      .eq("collection_id", targetCollectionId)
      .order("sort_order");

    if (artworksError) {
      setError(artworksError.message);
      setManagedArtworks([]);
      setSelectedArtworkId("");
      setBusy(false);
      return;
    }

    const rows = (data ?? []) as Artwork[];
    setManagedArtworks(rows);

    if (rows.length) {
      selectArtwork(rows[0]);
    } else {
      setSelectedArtworkId("");
      setEditTitle("");
      setEditMood("");
      setEditTags("");
    }

    setBusy(false);
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;

    setBusy(true);
    setError(null);
    setMessage(null);

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (loginError) setError(loginError.message);
    setBusy(false);
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const client = supabase;

    if (!client || !file || !collectionId || !title.trim()) {
      setError("Choose a collection and image, then enter a title.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("The selected file must be an image.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("The image must be 10 MB or smaller.");
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);

    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const filePath = `${collectionId}/${crypto.randomUUID()}.${extension}`;

    try {
      const { error: uploadError } = await client.storage
        .from("artworks")
        .upload(filePath, file, {
          cacheControl: "31536000",
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = client.storage
        .from("artworks")
        .getPublicUrl(filePath);

      const { data: latestArtwork, error: orderError } = await client
        .from("artworks")
        .select("sort_order")
        .eq("collection_id", collectionId)
        .order("sort_order", { ascending: false })
        .limit(1);

      if (orderError) throw orderError;

      const nextSortOrder = (latestArtwork?.[0]?.sort_order ?? 0) + 1;
      const parsedTags = tags
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean);

      const { error: insertError } = await client.from("artworks").insert({
        collection_id: collectionId,
        title: title.trim(),
        src: publicUrlData.publicUrl,
        thumb_src: publicUrlData.publicUrl,
        media_type: "image",
        mood: mood.trim() || null,
        tags: parsedTags,
        sort_order: nextSortOrder,
      });

      if (insertError) throw insertError;

      setTitle("");
      setMood("");
      setTags("");
      setFile(null);
      form.reset();
      setMessage("Artwork published successfully.");
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "The artwork could not be published."
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateCollection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = supabase;
    const titleValue = newCollectionTitle.trim();
    const summaryValue = newCollectionSummary.trim();
    const worldNumber = Number(newWorldNumber);
    const sortOrder = Number(newSortOrder);

    if (
      !client ||
      !titleValue ||
      !summaryValue ||
      !Number.isInteger(worldNumber) ||
      worldNumber < 1 ||
      !Number.isInteger(sortOrder) ||
      sortOrder < 1
    ) {
      setError("Complete every collection field using positive whole numbers.");
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);

    const worldCode = `World ${String(worldNumber).padStart(3, "0")}`;

    const { data, error: createError } = await client
      .from("collections")
      .insert({
        title: titleValue,
        slug: slugify(titleValue),
        summary: summaryValue,
        world_code: worldCode,
        sort_order: sortOrder,
      })
      .select("id, title, world_code, sort_order")
      .single();

    if (createError) {
      setError(createError.message);
      setBusy(false);
      return;
    }

    const createdCollection = data as Collection;
    setCollections((current) =>
      [...current, createdCollection].sort(
        (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
      )
    );
    setCollectionId(createdCollection.id);
    setNewCollectionTitle("");
    setNewCollectionSummary("");
    setNewWorldNumber("");
    setNewSortOrder("");
    setMode("artwork");
    setMessage(
      `${createdCollection.title} was created and selected for your next upload.`
    );
    setBusy(false);
  }

  async function handleUpdateArtwork(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = supabase;

    if (!client || !selectedArtworkId || !editTitle.trim()) {
      setError("Select an artwork and enter a title.");
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);

    const parsedTags = editTags
      .split(",")
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean);

    const { data, error: updateError } = await client
      .from("artworks")
      .update({
        title: editTitle.trim(),
        mood: editMood.trim() || null,
        tags: parsedTags,
      })
      .eq("id", selectedArtworkId)
      .select("id, collection_id, title, src, mood, tags, sort_order")
      .single();

    if (updateError) {
      setError(updateError.message);
      setBusy(false);
      return;
    }

    const updatedArtwork = data as Artwork;
    setManagedArtworks((current) =>
      current.map((artwork) =>
        artwork.id === updatedArtwork.id ? updatedArtwork : artwork
      )
    );
    selectArtwork(updatedArtwork);
    setMessage(`${updatedArtwork.title} was updated.`);
    setBusy(false);
  }

  async function handleSignOut() {
    if (!supabase) return;
    await supabase.auth.signOut({ scope: "local" });
    setCollections([]);
    setManagedArtworks([]);
    setSelectedArtworkId("");
    setMessage(null);
  }

  if (!authReady) {
    return (
      <main className="grid min-h-screen place-items-center bg-zinc-950 text-zinc-400">
        Loading archive access...
      </main>
    );
  }

  if (!userEmail) {
    return (
      <main className="min-h-screen bg-zinc-950 px-5 py-16 text-zinc-100">
        <section className="mx-auto max-w-md">
          <Link
            href="/"
            className="text-xs uppercase tracking-[0.24em] text-cyan-300 hover:text-cyan-200"
          >
            Back to NODEINE
          </Link>
          <p className="mt-12 text-xs uppercase tracking-[0.3em] text-zinc-500">
            The TRINE Archive
          </p>
          <h1 className="mt-3 text-4xl font-light text-white">Archive access</h1>
          <p className="mt-3 leading-7 text-zinc-400">
            Sign in with the private curator account.
          </p>

          <form onSubmit={handleLogin} className="mt-10 space-y-5">
            <label className="block text-sm text-zinc-300">
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
                className="mt-2 w-full border border-white/15 bg-black px-4 py-3 text-white outline-none focus:border-cyan-300"
              />
            </label>
            <label className="block text-sm text-zinc-300">
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete="current-password"
                className="mt-2 w-full border border-white/15 bg-black px-4 py-3 text-white outline-none focus:border-cyan-300"
              />
            </label>

            {error && <p className="text-sm text-red-300">{error}</p>}

            <button
              type="submit"
              disabled={busy}
              className="w-full bg-cyan-300 px-5 py-3 font-medium text-zinc-950 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-5 py-10 text-zinc-100 sm:px-8">
      <section className="mx-auto max-w-3xl">
        <header className="flex flex-col gap-5 border-b border-white/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href="/"
              className="text-xs uppercase tracking-[0.24em] text-cyan-300 hover:text-cyan-200"
            >
              Back to NODEINE
            </Link>
            <h1 className="mt-4 text-4xl font-light text-white">
              Publish artwork
            </h1>
            <p className="mt-2 text-sm text-zinc-500">Signed in as {userEmail}</p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="w-fit border border-white/15 px-4 py-2 text-sm text-zinc-300 hover:border-white/30 hover:text-white"
          >
            Sign out
          </button>
        </header>

        <div className="mt-8 grid grid-cols-3 border border-white/15 p-1">
          <button
            type="button"
            onClick={() => {
              setMode("artwork");
              setError(null);
              setMessage(null);
            }}
            className={`px-4 py-3 text-sm transition ${
              mode === "artwork"
                ? "bg-cyan-300 font-medium text-zinc-950"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Publish artwork
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("collection");
              setError(null);
              setMessage(null);
              const nextNumber =
                Math.max(
                  0,
                  ...collections.map((collection) => collection.sort_order ?? 0)
                ) + 1;
              setNewWorldNumber((current) => current || String(nextNumber));
              setNewSortOrder((current) => current || String(nextNumber));
            }}
            className={`px-4 py-3 text-sm transition ${
              mode === "collection"
                ? "bg-cyan-300 font-medium text-zinc-950"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Create collection
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("manage");
              setError(null);
              setMessage(null);
              const targetCollectionId =
                manageCollectionId || collectionId || collections[0]?.id || "";
              setManageCollectionId(targetCollectionId);
              loadManagedArtworks(targetCollectionId);
            }}
            className={`px-4 py-3 text-sm transition ${
              mode === "manage"
                ? "bg-cyan-300 font-medium text-zinc-950"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Manage archive
          </button>
        </div>

        {mode === "artwork" ? (
        <form onSubmit={handleUpload} className="mt-10 grid gap-6 sm:grid-cols-2">
          <label className="block text-sm text-zinc-300 sm:col-span-2">
            Collection
            <select
              value={collectionId}
              onChange={(event) => setCollectionId(event.target.value)}
              required
              className="mt-2 w-full border border-white/15 bg-black px-4 py-3 text-white outline-none focus:border-cyan-300"
            >
              {collections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.world_code} - {collection.title}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm text-zinc-300 sm:col-span-2">
            Image
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              required
              className="mt-2 block w-full border border-dashed border-white/20 bg-black p-5 text-sm text-zinc-400 file:mr-4 file:border-0 file:bg-cyan-300 file:px-4 file:py-2 file:font-medium file:text-zinc-950"
            />
          </label>

          <label className="block text-sm text-zinc-300 sm:col-span-2">
            Artwork title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              className="mt-2 w-full border border-white/15 bg-black px-4 py-3 text-white outline-none focus:border-cyan-300"
            />
          </label>

          <label className="block text-sm text-zinc-300">
            Mood
            <input
              value={mood}
              onChange={(event) => setMood(event.target.value)}
              placeholder="Neon city solitude"
              className="mt-2 w-full border border-white/15 bg-black px-4 py-3 text-white outline-none focus:border-cyan-300"
            />
          </label>

          <label className="block text-sm text-zinc-300">
            Tags
            <input
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="cyberpunk, portrait, neon"
              className="mt-2 w-full border border-white/15 bg-black px-4 py-3 text-white outline-none focus:border-cyan-300"
            />
          </label>

          <div className="sm:col-span-2">
            {error && <p className="mb-4 text-sm text-red-300">{error}</p>}
            {message && (
              <p className="mb-4 text-sm text-emerald-300">{message}</p>
            )}
            <button
              type="submit"
              disabled={busy || !file || !collections.length}
              className="w-full bg-cyan-300 px-5 py-3 font-medium text-zinc-950 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Publishing..." : "Publish to archive"}
            </button>
          </div>
        </form>
        ) : mode === "collection" ? (
          <form
            onSubmit={handleCreateCollection}
            className="mt-10 grid gap-6 sm:grid-cols-2"
          >
            <label className="block text-sm text-zinc-300 sm:col-span-2">
              Collection name
              <input
                value={newCollectionTitle}
                onChange={(event) => setNewCollectionTitle(event.target.value)}
                required
                placeholder="New visual world"
                className="mt-2 w-full border border-white/15 bg-black px-4 py-3 text-white outline-none focus:border-cyan-300"
              />
            </label>

            <label className="block text-sm text-zinc-300">
              World number
              <input
                type="number"
                min="1"
                step="1"
                value={newWorldNumber}
                onChange={(event) => setNewWorldNumber(event.target.value)}
                required
                className="mt-2 w-full border border-white/15 bg-black px-4 py-3 text-white outline-none focus:border-cyan-300"
              />
            </label>

            <label className="block text-sm text-zinc-300">
              Display order
              <input
                type="number"
                min="1"
                step="1"
                value={newSortOrder}
                onChange={(event) => setNewSortOrder(event.target.value)}
                required
                className="mt-2 w-full border border-white/15 bg-black px-4 py-3 text-white outline-none focus:border-cyan-300"
              />
            </label>

            <label className="block text-sm text-zinc-300 sm:col-span-2">
              Collection summary
              <textarea
                value={newCollectionSummary}
                onChange={(event) => setNewCollectionSummary(event.target.value)}
                required
                rows={4}
                placeholder="Describe the visual world and its atmosphere."
                className="mt-2 w-full resize-y border border-white/15 bg-black px-4 py-3 text-white outline-none focus:border-cyan-300"
              />
            </label>

            <div className="sm:col-span-2">
              {error && <p className="mb-4 text-sm text-red-300">{error}</p>}
              <button
                type="submit"
                disabled={busy}
                className="w-full bg-cyan-300 px-5 py-3 font-medium text-zinc-950 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? "Creating..." : "Create collection"}
              </button>
            </div>
          </form>
        ) : (
          <section className="mt-10">
            <label className="block text-sm text-zinc-300">
              Collection
              <select
                value={manageCollectionId}
                onChange={(event) => {
                  const nextCollectionId = event.target.value;
                  setManageCollectionId(nextCollectionId);
                  loadManagedArtworks(nextCollectionId);
                }}
                className="mt-2 w-full border border-white/15 bg-black px-4 py-3 text-white outline-none focus:border-cyan-300"
              >
                {collections.map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.world_code} - {collection.title}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-8 grid min-h-[520px] border border-white/10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
              <div className="max-h-[720px] overflow-y-auto border-b border-white/10 lg:border-b-0 lg:border-r">
                <div className="sticky top-0 border-b border-white/10 bg-zinc-950 px-4 py-3 text-xs uppercase tracking-[0.2em] text-zinc-500">
                  {busy
                    ? "Loading pieces..."
                    : `${managedArtworks.length} pieces`}
                </div>
                {managedArtworks.map((artwork) => (
                  <button
                    key={artwork.id}
                    type="button"
                    onClick={() => selectArtwork(artwork)}
                    className={`grid w-full grid-cols-[64px_minmax(0,1fr)] gap-3 border-b border-white/10 p-3 text-left transition ${
                      selectedArtworkId === artwork.id
                        ? "bg-cyan-300/10"
                        : "hover:bg-white/5"
                    }`}
                  >
                    <img
                      src={artwork.src}
                      alt=""
                      className="h-16 w-16 object-cover object-center"
                    />
                    <span className="min-w-0 self-center">
                      <span className="block truncate text-sm text-white">
                        {artwork.title}
                      </span>
                      <span className="mt-1 block text-xs text-zinc-500">
                        Piece {artwork.sort_order ?? "-"}
                      </span>
                    </span>
                  </button>
                ))}
                {!busy && !managedArtworks.length && (
                  <p className="p-5 text-sm leading-6 text-zinc-500">
                    This collection has no artwork yet.
                  </p>
                )}
              </div>

              <div className="p-5 sm:p-7">
                {selectedArtworkId ? (
                  <form onSubmit={handleUpdateArtwork} className="space-y-6">
                    <div className="aspect-[4/3] overflow-hidden bg-black">
                      <img
                        src={
                          managedArtworks.find(
                            (artwork) => artwork.id === selectedArtworkId
                          )?.src ?? ""
                        }
                        alt={editTitle}
                        className="h-full w-full object-contain"
                      />
                    </div>

                    <label className="block text-sm text-zinc-300">
                      Artwork title
                      <input
                        value={editTitle}
                        onChange={(event) => setEditTitle(event.target.value)}
                        required
                        className="mt-2 w-full border border-white/15 bg-black px-4 py-3 text-white outline-none focus:border-cyan-300"
                      />
                    </label>

                    <label className="block text-sm text-zinc-300">
                      Mood
                      <input
                        value={editMood}
                        onChange={(event) => setEditMood(event.target.value)}
                        className="mt-2 w-full border border-white/15 bg-black px-4 py-3 text-white outline-none focus:border-cyan-300"
                      />
                    </label>

                    <label className="block text-sm text-zinc-300">
                      Tags
                      <input
                        value={editTags}
                        onChange={(event) => setEditTags(event.target.value)}
                        placeholder="cyberpunk, portrait, neon"
                        className="mt-2 w-full border border-white/15 bg-black px-4 py-3 text-white outline-none focus:border-cyan-300"
                      />
                    </label>

                    {error && <p className="text-sm text-red-300">{error}</p>}
                    {message && (
                      <p className="text-sm text-emerald-300">{message}</p>
                    )}

                    <button
                      type="submit"
                      disabled={busy}
                      className="w-full bg-cyan-300 px-5 py-3 font-medium text-zinc-950 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busy ? "Saving..." : "Save artwork details"}
                    </button>
                  </form>
                ) : (
                  <div className="grid min-h-[420px] place-items-center text-center text-sm text-zinc-500">
                    Select a collection with artwork to begin editing.
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
