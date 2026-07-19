import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { notFound } from "next/navigation";

type CreatorPageProps = {
  params: Promise<{ username: string }>;
};

type CreatorProfile = {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
};

type Collection = {
  id: string;
  title: string;
  summary: string | null;
  world_code: string | null;
  sort_order: number | null;
};

type Artwork = {
  id: string;
  collection_id: string;
  title: string;
  src: string;
  thumb_src: string | null;
  mood: string | null;
  tags: string[] | null;
  sort_order: number | null;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const dynamic = "force-dynamic";

export default async function CreatorPage({ params }: CreatorPageProps) {
  if (!supabaseUrl || !supabaseKey) {
    return (
      <main className="grid min-h-screen place-items-center bg-zinc-950 px-5 text-zinc-400">
        Supabase environment variables are missing.
      </main>
    );
  }

  const { username: usernameParam } = await params;
  const username = decodeURIComponent(usernameParam).toLowerCase();
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("id, username, display_name, bio, avatar_url")
    .eq("username", username)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profileData) notFound();

  const profile = profileData as CreatorProfile;
  const { data: collectionData, error: collectionError } = await supabase
    .from("collections")
    .select("id, title, summary, world_code, sort_order")
    .eq("owner_id", profile.id)
    .order("sort_order");

  if (collectionError) throw collectionError;

  const collections = (collectionData ?? []) as Collection[];
  const collectionIds = collections.map((collection) => collection.id);
  let artworks: Artwork[] = [];

  if (collectionIds.length) {
    const { data: artworkData, error: artworkError } = await supabase
      .from("artworks")
      .select(
        "id, collection_id, title, src, thumb_src, mood, tags, sort_order"
      )
      .in("collection_id", collectionIds)
      .order("sort_order");

    if (artworkError) throw artworkError;
    artworks = (artworkData ?? []) as Artwork[];
  }

  const artworksByCollection = new Map<string, Artwork[]>();
  for (const artwork of artworks) {
    const collectionArtworks = artworksByCollection.get(artwork.collection_id);
    if (collectionArtworks) {
      collectionArtworks.push(artwork);
    } else {
      artworksByCollection.set(artwork.collection_id, [artwork]);
    }
  }

  const creatorInitial = profile.display_name.charAt(0).toUpperCase() || "N";

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-white/10 px-5 py-5 sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link
            href="/"
            className="text-lg font-light tracking-[0.24em] text-white hover:text-cyan-200"
          >
            NODEINE
          </Link>
          <nav className="flex items-center gap-5 text-xs uppercase tracking-[0.18em]">
            <Link href="/" className="text-zinc-400 hover:text-white">
              Browse archive
            </Link>
            <Link href="/admin" className="text-cyan-300 hover:text-cyan-200">
              Creator studio
            </Link>
          </nav>
        </div>
      </header>

      <section className="border-b border-white/10 px-5 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto grid max-w-7xl gap-7 sm:grid-cols-[144px_minmax(0,1fr)] sm:items-center">
          <div className="grid h-36 w-36 place-items-center overflow-hidden rounded-full border border-white/15 bg-black text-5xl font-light text-cyan-300">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={`${profile.display_name} profile picture`}
                className="h-full w-full object-cover"
              />
            ) : (
              creatorInitial
            )}
          </div>

          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">
              Creator archive
            </p>
            <h1 className="mt-3 text-4xl font-light text-white sm:text-5xl">
              {profile.display_name}
            </h1>
            <p className="mt-2 text-sm text-zinc-500">@{profile.username}</p>
            {profile.bio && (
              <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-300">
                {profile.bio}
              </p>
            )}
            <div className="mt-6 flex gap-8 text-sm">
              <p>
                <span className="block text-xl text-white">
                  {collections.length}
                </span>
                <span className="text-zinc-500">Collections</span>
              </p>
              <p>
                <span className="block text-xl text-white">{artworks.length}</span>
                <span className="text-zinc-500">Artworks</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
        {collections.length ? (
          <div className="space-y-20">
            {collections.map((collection) => {
              const collectionArtworks =
                artworksByCollection.get(collection.id) ?? [];

              return (
                <section key={collection.id}>
                  <div className="mb-7 flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">
                        {collection.world_code || "Visual world"}
                      </p>
                      <h2 className="mt-2 text-2xl font-light text-white sm:text-3xl">
                        {collection.title}
                      </h2>
                      {collection.summary && (
                        <p className="mt-2 max-w-2xl leading-7 text-zinc-400">
                          {collection.summary}
                        </p>
                      )}
                    </div>
                    <p className="shrink-0 text-sm text-zinc-500">
                      {collectionArtworks.length} pieces
                    </p>
                  </div>

                  {collectionArtworks.length ? (
                    <div className="columns-2 gap-3 sm:columns-3 lg:columns-4">
                      {collectionArtworks.map((artwork) => (
                        <figure
                          key={artwork.id}
                          className="group mb-3 break-inside-avoid overflow-hidden border border-white/10 bg-black"
                        >
                          <img
                            src={artwork.thumb_src || artwork.src}
                            alt={artwork.title}
                            loading="lazy"
                            decoding="async"
                            className="h-auto w-full transition duration-300 group-hover:opacity-90"
                          />
                          <figcaption className="border-t border-white/10 px-3 py-3">
                            <p className="text-sm text-zinc-200">
                              {artwork.title}
                            </p>
                            {artwork.mood && (
                              <p className="mt-1 text-xs leading-5 text-zinc-500">
                                {artwork.mood}
                              </p>
                            )}
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                  ) : (
                    <p className="py-10 text-sm text-zinc-500">
                      This collection is waiting for its first piece.
                    </p>
                  )}
                </section>
              );
            })}
          </div>
        ) : (
          <div className="border-y border-white/10 py-20 text-center">
            <p className="text-sm text-zinc-500">
              This creator has not published a collection yet.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
