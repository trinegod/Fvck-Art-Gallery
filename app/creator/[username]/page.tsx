import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { notFound } from "next/navigation";
import CreatorGallery, {
  type CreatorArtwork,
  type CreatorCollection,
} from "./creator-gallery";
import PolishedImage from "../../components/polished-image";
import MobileAppNavigation from "../../components/mobile-app-navigation";
import ProfileFollowControl from "../../components/profile-follow-control";

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

  const collections = (collectionData ?? []) as CreatorCollection[];
  const collectionIds = collections.map((collection) => collection.id);
  let artworks: CreatorArtwork[] = [];

  if (collectionIds.length) {
    const { data: artworkData, error: artworkError } = await supabase
      .from("artworks")
      .select(
        "id, collection_id, title, src, thumb_src, mood, tags, sort_order"
      )
      .in("collection_id", collectionIds)
      .order("sort_order");

    if (artworkError) throw artworkError;
    artworks = (artworkData ?? []) as CreatorArtwork[];
  }

  const creatorInitial = profile.display_name.charAt(0).toUpperCase() || "N";

  return (
    <main className="min-h-screen bg-zinc-950 pb-[calc(7rem+env(safe-area-inset-bottom))] text-zinc-100 lg:pb-0">
      <header className="border-b border-white/10 px-5 py-5 sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link
            href="/"
            className="text-lg font-light tracking-[0.24em] text-white hover:text-cyan-200"
          >
            NODEINE
          </Link>
          <nav className="hidden items-center gap-5 text-xs uppercase tracking-[0.18em] lg:flex">
            <Link href="/" className="text-zinc-400 hover:text-white">
              Archive
            </Link>
            <Link href="/discover" className="text-zinc-400 hover:text-white">
              Discover
            </Link>
            <Link href="/saved" className="text-zinc-400 hover:text-white">
              Saved
            </Link>
            <Link href="/messages" className="text-zinc-400 hover:text-white">
              Inbox
            </Link>
            <Link href="/admin" className="text-cyan-300 hover:text-cyan-200">
              Studio
            </Link>
          </nav>
        </div>
      </header>

      <section className="border-b border-white/10 px-5 py-10 sm:px-8 sm:py-16">
        <div className="mx-auto grid max-w-7xl gap-7 sm:grid-cols-[144px_minmax(0,1fr)] sm:items-center">
          <div className="mx-auto grid h-32 w-32 place-items-center overflow-hidden rounded-full border border-white/15 bg-black text-5xl font-light text-cyan-300 shadow-[0_0_50px_rgba(34,211,238,.08)] sm:mx-0 sm:h-36 sm:w-36">
            {profile.avatar_url ? (
              <PolishedImage
                src={profile.avatar_url}
                alt={`${profile.display_name} profile picture`}
                wrapperClassName="h-full w-full"
                className="h-full w-full object-cover"
              />
            ) : (
              creatorInitial
            )}
          </div>

          <div className="max-w-3xl text-center sm:text-left">
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
            <ProfileFollowControl
              profileId={profile.id}
              creatorName={profile.display_name}
              creatorUsername={profile.username}
              collectionCount={collections.length}
              artworkCount={artworks.length}
            />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-9 sm:px-8 sm:py-12">
        <CreatorGallery collections={collections} artworks={artworks} />
      </div>
      <MobileAppNavigation profileHref={`/creator/${profile.username}`} />
    </main>
  );
}
