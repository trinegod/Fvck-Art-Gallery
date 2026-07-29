"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Archive,
  BadgeCheck,
  ChevronDown,
  CircleHelp,
  ExternalLink,
  FolderPlus,
  ImagePlus,
  Layers3,
  LogOut,
  Sparkles,
  UploadCloud,
  UserRound,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase-browser";

type StudioMode = "artwork" | "collection" | "manage" | "profile";

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

type CreatorProfile = {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
};

function StudioFeedback({
  error,
  message,
}: {
  error: string | null;
  message: string | null;
}) {
  if (!error && !message) return null;

  return (
    <div
      role="status"
      className={`rounded-xl border px-4 py-3 text-sm leading-6 ${
        error
          ? "border-rose-400/25 bg-rose-400/8 text-rose-200"
          : "border-cyan-300/20 bg-cyan-300/8 text-cyan-100"
      }`}
    >
      {error ?? message}
    </div>
  );
}

export default function AdminPage() {
  const [mode, setMode] = useState<StudioMode>("artwork");
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authReady, setAuthReady] = useState(!supabase);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signupDisplayName, setSignupDisplayName] = useState("");
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionId, setCollectionId] = useState("");
  const [title, setTitle] = useState("");
  const [mood, setMood] = useState("");
  const [tags, setTags] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
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
  const [profileUsername, setProfileUsername] = useState("");
  const [profileDisplayName, setProfileDisplayName] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [profileAvatarUrl, setProfileAvatarUrl] = useState("");
  const [profileAvatarFile, setProfileAvatarFile] = useState<File | null>(null);
  const [profileAvatarPreview, setProfileAvatarPreview] = useState("");
  const [profileAvatarInputKey, setProfileAvatarInputKey] = useState(0);
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
      setUserId(data.user?.id ?? null);
      setAuthReady(true);
    });

    const { data: authListener } = client.auth.onAuthStateChange(
      (_event, session) => {
        setUserEmail(session?.user.email ?? null);
        setUserId(session?.user.id ?? null);
        setAuthReady(true);
      }
    );

    return () => authListener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  useEffect(() => {
    if (message) toast.success(message);
  }, [message]);

  useEffect(() => {
    const client = supabase;
    if (!client || !userId) return;

    async function loadCollections(database: NonNullable<typeof supabase>) {
      const { data, error: collectionsError } = await database
        .from("collections")
        .select("id, title, world_code, sort_order")
        .eq("owner_id", userId)
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
  }, [userId]);

  useEffect(() => {
    const client = supabase;
    if (!client || !userId) return;

    async function loadProfile(database: NonNullable<typeof supabase>) {
      const { data, error: profileError } = await database
        .from("profiles")
        .select("id, username, display_name, bio, avatar_url")
        .eq("id", userId)
        .single();

      if (profileError) {
        setError(profileError.message);
        return;
      }

      const profile = data as CreatorProfile;
      setProfileUsername(profile.username);
      setProfileDisplayName(profile.display_name);
      setProfileBio(profile.bio ?? "");
      setProfileAvatarUrl(profile.avatar_url ?? "");
      setProfileAvatarPreview(profile.avatar_url ?? "");
    }

    loadProfile(client);
  }, [userId]);

  useEffect(() => {
    if (!profileAvatarPreview.startsWith("blob:")) return;

    return () => URL.revokeObjectURL(profileAvatarPreview);
  }, [profileAvatarPreview]);

  function slugify(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function selectProfileAvatar(nextFile: File | null) {
    setProfileAvatarFile(nextFile);
    setProfileAvatarPreview(
      nextFile ? URL.createObjectURL(nextFile) : profileAvatarUrl
    );
    setError(null);
    setMessage(null);
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

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !signupDisplayName.trim()) return;

    setBusy(true);
    setError(null);
    setMessage(null);

    const { data, error: signupError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          display_name: signupDisplayName.trim(),
        },
      },
    });

    if (signupError) {
      setError(signupError.message);
    } else if (!data.session) {
      setMessage("Check your email to confirm your creator account.");
    }

    setBusy(false);
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
      setFileInputKey((current) => current + 1);
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
      !userId ||
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
        owner_id: userId,
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

  async function handleUpdateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = supabase;
    const username = profileUsername.trim().toLowerCase();
    const displayName = profileDisplayName.trim();

    if (!client || !userId || !displayName) {
      setError("Enter a display name and username.");
      return;
    }

    if (!/^[a-z0-9][a-z0-9-]{2,29}$/.test(username)) {
      setError(
        "Username must be 3-30 characters using lowercase letters, numbers, or hyphens."
      );
      return;
    }

    const allowedAvatarTypes = ["image/png", "image/jpeg", "image/webp"];

    if (
      profileAvatarFile &&
      !allowedAvatarTypes.includes(profileAvatarFile.type)
    ) {
      setError("The profile picture must be a PNG, JPG, or WebP image.");
      return;
    }

    if (profileAvatarFile && profileAvatarFile.size > 5 * 1024 * 1024) {
      setError("The profile picture must be 5 MB or smaller.");
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);

    let avatarUrl = profileAvatarUrl || null;

    if (profileAvatarFile) {
      const avatarPath = `avatars/${userId}/avatar`;
      const { error: avatarUploadError } = await client.storage
        .from("artworks")
        .upload(avatarPath, profileAvatarFile, {
          cacheControl: "3600",
          contentType: profileAvatarFile.type,
          upsert: true,
        });

      if (avatarUploadError) {
        setError(avatarUploadError.message);
        setBusy(false);
        return;
      }

      const { data: avatarPublicUrl } = client.storage
        .from("artworks")
        .getPublicUrl(avatarPath);

      avatarUrl = `${avatarPublicUrl.publicUrl}?v=${Date.now()}`;
    }

    const { data, error: profileError } = await client
      .from("profiles")
      .update({
        username,
        display_name: displayName,
        bio: profileBio.trim() || null,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select("id, username, display_name, bio, avatar_url")
      .single();

    if (profileError) {
      setError(
        profileError.code === "23505"
          ? "That username is already taken."
          : profileError.message
      );
      setBusy(false);
      return;
    }

    const profile = data as CreatorProfile;
    setProfileUsername(profile.username);
    setProfileDisplayName(profile.display_name);
    setProfileBio(profile.bio ?? "");
    setProfileAvatarUrl(profile.avatar_url ?? "");
    setProfileAvatarPreview(profile.avatar_url ?? "");
    setProfileAvatarFile(null);
    setProfileAvatarInputKey((current) => current + 1);
    setMessage("Creator profile updated.");
    setBusy(false);
  }

  async function handleSignOut() {
    if (!supabase) return;
    await supabase.auth.signOut({ scope: "local" });
    setCollections([]);
    setUserId(null);
    setManagedArtworks([]);
    setSelectedArtworkId("");
    setProfileUsername("");
    setProfileDisplayName("");
    setProfileBio("");
    setProfileAvatarUrl("");
    setProfileAvatarFile(null);
    setProfileAvatarPreview("");
    setMessage(null);
  }

  function handleModeChange(nextMode: StudioMode) {
    setMode(nextMode);
    setError(null);
    setMessage(null);

    if (nextMode === "collection") {
      const nextNumber =
        Math.max(
          0,
          ...collections.map((collection) => collection.sort_order ?? 0)
        ) + 1;
      setNewWorldNumber((current) => current || String(nextNumber));
      setNewSortOrder((current) => current || String(nextNumber));
    }

    if (nextMode === "manage") {
      const targetCollectionId =
        manageCollectionId || collectionId || collections[0]?.id || "";
      setManageCollectionId(targetCollectionId);
      loadManagedArtworks(targetCollectionId);
    }
  }

  if (!authReady) {
    return (
      <>
        <main className="grid min-h-screen place-items-center bg-zinc-950 text-zinc-400">
          <div className="flex items-center gap-3 text-sm uppercase tracking-[0.24em]">
            <Sparkles className="size-4 animate-pulse text-cyan-300" />
            Loading archive access
          </div>
        </main>
      </>
    );
  }

  if (!userEmail) {
    return (
      <>
        <main className="relative min-h-screen overflow-hidden bg-zinc-950 px-5 py-12 text-zinc-100 sm:py-20">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(34,211,238,0.12),transparent_28%),radial-gradient(circle_at_85%_90%,rgba(8,145,178,0.08),transparent_32%)]" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:52px_52px]" />

          <section className="relative mx-auto max-w-md">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-cyan-300 transition hover:text-cyan-100"
            >
              <ArrowLeft className="size-3.5" />
              NODEINE archive
            </Link>

            <div className="mt-10 flex items-center justify-between">
              <Badge className="border border-cyan-300/25 bg-cyan-300/10 text-cyan-200">
                Creator channel
              </Badge>
              <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-zinc-600">
                NDN / 001
              </span>
            </div>

            <Card className="mt-4 border-white/10 bg-zinc-950/85 shadow-2xl shadow-black/50 ring-0 backdrop-blur-xl">
              <CardHeader className="border-b border-white/8 px-6 pb-6 pt-2">
                <div className="mb-3 grid size-11 place-items-center rounded-xl border border-cyan-300/20 bg-cyan-300/8 text-cyan-300">
                  <Archive className="size-5" />
                </div>
                <CardTitle className="text-3xl font-light tracking-tight text-white">
                  Creator access
                </CardTitle>
                <CardDescription className="max-w-sm leading-6 text-zinc-400">
                  {authMode === "signin"
                    ? "Enter the Studio and continue building your visual worlds."
                    : "Create your identity and open a new channel in the archive."}
                </CardDescription>
              </CardHeader>

              <CardContent className="px-6 pb-2">
                <Tabs
                  value={authMode}
                  onValueChange={(nextMode) => {
                    setAuthMode(nextMode as "signin" | "signup");
                    setError(null);
                    setMessage(null);
                  }}
                  className="gap-6"
                >
                  <TabsList className="grid h-11 w-full grid-cols-2 rounded-xl border border-white/8 bg-black/45 p-1 group-data-horizontal/tabs:h-11">
                    <TabsTrigger
                      value="signin"
                      className="h-full rounded-lg data-active:bg-cyan-300 data-active:text-zinc-950 dark:data-active:bg-cyan-300 dark:data-active:text-zinc-950"
                    >
                      Sign in
                    </TabsTrigger>
                    <TabsTrigger
                      value="signup"
                      className="h-full rounded-lg data-active:bg-cyan-300 data-active:text-zinc-950 dark:data-active:bg-cyan-300 dark:data-active:text-zinc-950"
                    >
                      Create account
                    </TabsTrigger>
                  </TabsList>

                  <form
                    onSubmit={
                      authMode === "signin" ? handleLogin : handleSignup
                    }
                  >
                    <FieldGroup>
                      {authMode === "signup" && (
                        <Field>
                          <FieldLabel htmlFor="signup-display-name">
                            Display name
                          </FieldLabel>
                          <Input
                            id="signup-display-name"
                            value={signupDisplayName}
                            onChange={(event) =>
                              setSignupDisplayName(event.target.value)
                            }
                            required
                            autoComplete="name"
                            className="h-11 border-white/12 bg-black/45"
                          />
                        </Field>
                      )}

                      <Field>
                        <FieldLabel htmlFor="creator-email">Email</FieldLabel>
                        <Input
                          id="creator-email"
                          type="email"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          required
                          autoComplete="email"
                          className="h-11 border-white/12 bg-black/45"
                        />
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="creator-password">
                          Password
                        </FieldLabel>
                        <Input
                          id="creator-password"
                          type="password"
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          required
                          autoComplete={
                            authMode === "signin"
                              ? "current-password"
                              : "new-password"
                          }
                          className="h-11 border-white/12 bg-black/45"
                        />
                      </Field>

                      <StudioFeedback error={error} message={message} />

                      <Button
                        type="submit"
                        size="lg"
                        disabled={busy}
                        className="h-11 w-full shadow-lg shadow-cyan-950/30"
                      >
                        {busy
                          ? authMode === "signin"
                            ? "Opening Studio..."
                            : "Creating channel..."
                          : authMode === "signin"
                            ? "Enter Creator Studio"
                            : "Create creator account"}
                      </Button>
                    </FieldGroup>
                  </form>
                </Tabs>
              </CardContent>
            </Card>

            <p className="mt-6 text-center text-xs leading-5 text-zinc-600">
              Independent archive tools for artists building impossible worlds.
            </p>
          </section>
        </main>
      </>
    );
  }

  const creatorInitial = (profileDisplayName || userEmail)
    .charAt(0)
    .toUpperCase();

  return (
    <>
      <main className="relative min-h-screen overflow-hidden bg-zinc-950 px-4 py-6 text-zinc-100 sm:px-8 sm:py-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_0%,rgba(34,211,238,0.11),transparent_25%),radial-gradient(circle_at_100%_40%,rgba(8,145,178,0.07),transparent_30%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.025] [background-image:linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:56px_56px]" />

        <section className="relative mx-auto max-w-6xl">
          <header className="flex flex-col gap-6 border-b border-white/10 pb-7 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-cyan-300 transition hover:text-cyan-100"
              >
                <ArrowLeft className="size-3.5" />
                NODEINE archive
              </Link>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <h1 className="text-4xl font-light tracking-tight text-white sm:text-5xl">
                  Creator Studio
                </h1>
                <Badge className="border border-cyan-300/25 bg-cyan-300/10 text-cyan-200">
                  <span className="mr-1 size-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,.8)]" />
                  Online
                </Badge>
              </div>
              <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-500">
                Publish new pieces, shape visual worlds, and control how your
                identity appears across the archive.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Dialog>
                <DialogTrigger
                  render={
                    <Button
                      variant="outline"
                      className="h-10 border-white/12 bg-black/30 px-3 text-zinc-300"
                    />
                  }
                >
                  <CircleHelp data-icon="inline-start" />
                  Studio guide
                </DialogTrigger>
                <DialogContent className="border border-white/10 bg-zinc-950/95 p-6 shadow-2xl shadow-black/60 ring-0 sm:max-w-md">
                  <DialogHeader>
                    <Badge className="mb-2 border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
                      NODEINE workflow
                    </Badge>
                    <DialogTitle className="text-xl text-white">
                      Build one world at a time.
                    </DialogTitle>
                    <DialogDescription className="leading-6 text-zinc-400">
                      Create a collection first, publish pieces into it, then
                      use Manage to refine titles, moods, and discovery tags.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="mt-2 grid gap-3">
                    {[
                      ["01", "Collections", "Define the world and its order."],
                      ["02", "Publish", "Add the strongest image and metadata."],
                      ["03", "Manage", "Review the sequence and tune details."],
                      ["04", "Profile", "Keep your public creator identity sharp."],
                    ].map(([number, label, detail]) => (
                      <div
                        key={number}
                        className="grid grid-cols-[32px_minmax(0,1fr)] gap-3 rounded-xl border border-white/8 bg-white/[0.025] p-3"
                      >
                        <span className="font-mono text-xs text-cyan-300">
                          {number}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-white">
                            {label}
                          </p>
                          <p className="mt-0.5 text-xs leading-5 text-zinc-500">
                            {detail}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>

              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="outline"
                      className="h-10 border-white/12 bg-black/30 pl-2 pr-3"
                    />
                  }
                >
                  <span className="grid size-7 place-items-center overflow-hidden rounded-lg bg-cyan-300/12 text-xs font-semibold text-cyan-200">
                    {profileAvatarPreview ? (
                      <img
                        src={profileAvatarPreview}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      creatorInitial
                    )}
                  </span>
                  <span className="hidden max-w-40 truncate sm:inline">
                    {profileDisplayName || userEmail}
                  </span>
                  <ChevronDown className="size-3.5 text-zinc-500" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-64 border border-white/10 bg-zinc-950/95 p-2 shadow-2xl shadow-black/50"
                >
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="px-2 py-2">
                      <span className="block truncate text-sm font-medium text-zinc-100">
                        {profileDisplayName || "NODEINE creator"}
                      </span>
                      <span className="mt-0.5 block truncate font-normal text-zinc-500">
                        {userEmail}
                      </span>
                    </DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleModeChange("profile")}
                    className="px-2 py-2"
                  >
                    <UserRound />
                    Edit creator profile
                  </DropdownMenuItem>
                  {profileUsername && (
                    <DropdownMenuItem
                      render={<Link href={`/creator/${profileUsername}`} />}
                      className="px-2 py-2"
                    >
                      <ExternalLink />
                      View public profile
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    render={<Link href="/" />}
                    className="px-2 py-2"
                  >
                    <Archive />
                    Return to archive
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={handleSignOut}
                    className="px-2 py-2"
                  >
                    <LogOut />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Card size="sm" className="border-white/8 bg-black/25 ring-0">
              <CardContent className="flex items-center justify-between px-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                    Visual worlds
                  </p>
                  <p className="mt-1 text-2xl font-light text-white">
                    {collections.length.toString().padStart(2, "0")}
                  </p>
                </div>
                <Layers3 className="size-5 text-cyan-300/70" />
              </CardContent>
            </Card>
            <Card size="sm" className="border-white/8 bg-black/25 ring-0">
              <CardContent className="flex items-center justify-between px-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                    Loaded pieces
                  </p>
                  <p className="mt-1 text-2xl font-light text-white">
                    {managedArtworks.length.toString().padStart(2, "0")}
                  </p>
                </div>
                <ImagePlus className="size-5 text-cyan-300/70" />
              </CardContent>
            </Card>
            <Card size="sm" className="border-white/8 bg-black/25 ring-0">
              <CardContent className="flex items-center justify-between px-4">
                <div className="min-w-0">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                    Creator channel
                  </p>
                  <p className="mt-2 truncate text-sm text-white">
                    {profileUsername ? `@${profileUsername}` : "Profile pending"}
                  </p>
                </div>
                <BadgeCheck className="size-5 shrink-0 text-cyan-300/70" />
              </CardContent>
            </Card>
          </div>

          <Tabs
            value={mode}
            onValueChange={(nextMode) =>
              handleModeChange(nextMode as StudioMode)
            }
            className="mt-6 gap-5"
          >
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl border border-white/10 bg-black/35 p-1 group-data-horizontal/tabs:h-auto md:grid-cols-4">
              <TabsTrigger
                value="artwork"
                className="min-h-12 rounded-lg px-3 text-xs data-active:bg-cyan-300 data-active:text-zinc-950 dark:data-active:bg-cyan-300 dark:data-active:text-zinc-950 sm:text-sm"
              >
                <UploadCloud />
                Publish artwork
              </TabsTrigger>
              <TabsTrigger
                value="collection"
                className="min-h-12 rounded-lg px-3 text-xs data-active:bg-cyan-300 data-active:text-zinc-950 dark:data-active:bg-cyan-300 dark:data-active:text-zinc-950 sm:text-sm"
              >
                <FolderPlus />
                Create collection
              </TabsTrigger>
              <TabsTrigger
                value="manage"
                className="min-h-12 rounded-lg px-3 text-xs data-active:bg-cyan-300 data-active:text-zinc-950 dark:data-active:bg-cyan-300 dark:data-active:text-zinc-950 sm:text-sm"
              >
                <Archive />
                Manage archive
              </TabsTrigger>
              <TabsTrigger
                value="profile"
                className="min-h-12 rounded-lg px-3 text-xs data-active:bg-cyan-300 data-active:text-zinc-950 dark:data-active:bg-cyan-300 dark:data-active:text-zinc-950 sm:text-sm"
              >
                <UserRound />
                Profile
              </TabsTrigger>
            </TabsList>

            <TabsContent value="artwork">
              <Card className="border-white/10 bg-zinc-950/80 shadow-2xl shadow-black/30 ring-0 backdrop-blur-xl">
                <CardHeader className="border-b border-white/8 px-5 pb-5 sm:px-7">
                  <Badge className="mb-2 border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
                    Publish / New transmission
                  </Badge>
                  <CardTitle className="text-2xl font-light text-white">
                    Add a piece to the archive
                  </CardTitle>
                  <CardDescription className="max-w-2xl leading-6 text-zinc-500">
                    Select the world it belongs to, upload the final image, and
                    add enough context for it to be discoverable.
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-5 sm:px-7">
                  <form onSubmit={handleUpload}>
                    <FieldGroup className="grid gap-5 sm:grid-cols-2">
                      <Field className="sm:col-span-2">
                        <FieldLabel htmlFor="publish-collection">
                          Collection
                        </FieldLabel>
                        <NativeSelect
                          id="publish-collection"
                          value={collectionId}
                          onChange={(event) =>
                            setCollectionId(event.target.value)
                          }
                          required
                          className="w-full"
                        >
                          {collections.map((collection) => (
                            <NativeSelectOption
                              key={collection.id}
                              value={collection.id}
                            >
                              {collection.world_code} — {collection.title}
                            </NativeSelectOption>
                          ))}
                        </NativeSelect>
                        {!collections.length && (
                          <FieldDescription>
                            Create your first collection before publishing.
                          </FieldDescription>
                        )}
                      </Field>

                      <Field className="sm:col-span-2">
                        <FieldLabel htmlFor="artwork-file">Image</FieldLabel>
                        <Input
                          id="artwork-file"
                          key={fileInputKey}
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={(event) =>
                            setFile(event.target.files?.[0] ?? null)
                          }
                          required
                          className="h-auto min-h-24 border-dashed border-white/15 bg-black/35 px-4 py-5 file:mr-3 file:rounded-lg file:bg-cyan-300 file:px-3 file:text-zinc-950"
                        />
                        <FieldDescription>
                          PNG, JPG, or WebP. Maximum size 10 MB.
                        </FieldDescription>
                      </Field>

                      <Field className="sm:col-span-2">
                        <FieldLabel htmlFor="artwork-title">
                          Artwork title
                        </FieldLabel>
                        <Input
                          id="artwork-title"
                          value={title}
                          onChange={(event) => setTitle(event.target.value)}
                          required
                          className="h-11 bg-black/35"
                        />
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="artwork-mood">Mood</FieldLabel>
                        <Input
                          id="artwork-mood"
                          value={mood}
                          onChange={(event) => setMood(event.target.value)}
                          placeholder="Neon city solitude"
                          className="h-11 bg-black/35"
                        />
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="artwork-tags">Tags</FieldLabel>
                        <Input
                          id="artwork-tags"
                          value={tags}
                          onChange={(event) => setTags(event.target.value)}
                          placeholder="cyberpunk, portrait, neon"
                          className="h-11 bg-black/35"
                        />
                      </Field>

                      <div className="grid gap-4 sm:col-span-2">
                        <StudioFeedback error={error} message={message} />
                        <Button
                          type="submit"
                          size="lg"
                          disabled={busy || !file || !collections.length}
                          className="h-11 w-full"
                        >
                          <UploadCloud data-icon="inline-start" />
                          {busy ? "Publishing..." : "Publish to archive"}
                        </Button>
                      </div>
                    </FieldGroup>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="collection">
              <Card className="border-white/10 bg-zinc-950/80 shadow-2xl shadow-black/30 ring-0 backdrop-blur-xl">
                <CardHeader className="border-b border-white/8 px-5 pb-5 sm:px-7">
                  <Badge className="mb-2 border border-violet-300/20 bg-violet-300/10 text-violet-200">
                    Worldbuilding / New collection
                  </Badge>
                  <CardTitle className="text-2xl font-light text-white">
                    Open a new visual world
                  </CardTitle>
                  <CardDescription className="max-w-2xl leading-6 text-zinc-500">
                    Collections give each body of work its own atmosphere,
                    sequence, and numbered place in the archive.
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-5 sm:px-7">
                  <form onSubmit={handleCreateCollection}>
                    <FieldGroup className="grid gap-5 sm:grid-cols-2">
                      <Field className="sm:col-span-2">
                        <FieldLabel htmlFor="collection-name">
                          Collection name
                        </FieldLabel>
                        <Input
                          id="collection-name"
                          value={newCollectionTitle}
                          onChange={(event) =>
                            setNewCollectionTitle(event.target.value)
                          }
                          required
                          placeholder="New visual world"
                          className="h-11 bg-black/35"
                        />
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="world-number">
                          World number
                        </FieldLabel>
                        <Input
                          id="world-number"
                          type="number"
                          min="1"
                          step="1"
                          value={newWorldNumber}
                          onChange={(event) =>
                            setNewWorldNumber(event.target.value)
                          }
                          required
                          className="h-11 bg-black/35"
                        />
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="display-order">
                          Display order
                        </FieldLabel>
                        <Input
                          id="display-order"
                          type="number"
                          min="1"
                          step="1"
                          value={newSortOrder}
                          onChange={(event) =>
                            setNewSortOrder(event.target.value)
                          }
                          required
                          className="h-11 bg-black/35"
                        />
                      </Field>

                      <Field className="sm:col-span-2">
                        <FieldLabel htmlFor="collection-summary">
                          Collection summary
                        </FieldLabel>
                        <Textarea
                          id="collection-summary"
                          value={newCollectionSummary}
                          onChange={(event) =>
                            setNewCollectionSummary(event.target.value)
                          }
                          required
                          rows={5}
                          placeholder="Describe the visual world and its atmosphere."
                          className="resize-y bg-black/35"
                        />
                      </Field>

                      <div className="grid gap-4 sm:col-span-2">
                        <StudioFeedback error={error} message={message} />
                        <Button
                          type="submit"
                          size="lg"
                          disabled={busy}
                          className="h-11 w-full"
                        >
                          <FolderPlus data-icon="inline-start" />
                          {busy ? "Creating..." : "Create collection"}
                        </Button>
                      </div>
                    </FieldGroup>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="manage">
              <Card className="border-white/10 bg-zinc-950/80 shadow-2xl shadow-black/30 ring-0 backdrop-blur-xl">
                <CardHeader className="border-b border-white/8 px-5 pb-5 sm:px-7">
                  <Badge className="mb-2 border border-amber-300/20 bg-amber-300/10 text-amber-200">
                    Archive control / Metadata
                  </Badge>
                  <CardTitle className="text-2xl font-light text-white">
                    Tune the archive
                  </CardTitle>
                  <CardDescription className="max-w-2xl leading-6 text-zinc-500">
                    Review a collection piece by piece and sharpen the details
                    people use to understand and discover the work.
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-0 pb-0">
                  <div className="px-5 sm:px-7">
                    <Field>
                      <FieldLabel htmlFor="manage-collection">
                        Collection
                      </FieldLabel>
                      <NativeSelect
                        id="manage-collection"
                        value={manageCollectionId}
                        onChange={(event) => {
                          const nextCollectionId = event.target.value;
                          setManageCollectionId(nextCollectionId);
                          loadManagedArtworks(nextCollectionId);
                        }}
                        className="w-full"
                      >
                        {collections.map((collection) => (
                          <NativeSelectOption
                            key={collection.id}
                            value={collection.id}
                          >
                            {collection.world_code} — {collection.title}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </Field>
                  </div>

                  <div className="mt-6 grid min-h-[540px] border-t border-white/10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.35fr)]">
                    <div className="max-h-[760px] overflow-y-auto border-b border-white/10 bg-black/20 lg:border-b-0 lg:border-r">
                      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-zinc-950/95 px-4 py-3 backdrop-blur">
                        <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                          {busy
                            ? "Loading pieces..."
                            : `${managedArtworks.length} pieces`}
                        </span>
                        <span className="size-1.5 rounded-full bg-cyan-300 shadow-[0_0_9px_rgba(103,232,249,.7)]" />
                      </div>
                      {managedArtworks.map((artwork) => (
                        <button
                          key={artwork.id}
                          type="button"
                          onClick={() => selectArtwork(artwork)}
                          className={`grid w-full grid-cols-[64px_minmax(0,1fr)] gap-3 border-b border-white/8 p-3 text-left transition ${
                            selectedArtworkId === artwork.id
                              ? "bg-cyan-300/10 shadow-[inset_3px_0_0_#67e8f9]"
                              : "hover:bg-white/[0.035]"
                          }`}
                        >
                          <img
                            src={artwork.src}
                            alt=""
                            className="size-16 rounded-lg object-cover object-center"
                          />
                          <span className="min-w-0 self-center">
                            <span className="block truncate text-sm text-white">
                              {artwork.title}
                            </span>
                            <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.15em] text-zinc-600">
                              Piece {artwork.sort_order ?? "—"}
                            </span>
                          </span>
                        </button>
                      ))}
                      {!busy && !managedArtworks.length && (
                        <div className="grid min-h-48 place-items-center p-6 text-center">
                          <div>
                            <ImagePlus className="mx-auto size-5 text-zinc-700" />
                            <p className="mt-3 text-sm leading-6 text-zinc-500">
                              This collection has no artwork yet.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="p-5 sm:p-7">
                      {selectedArtworkId ? (
                        <form onSubmit={handleUpdateArtwork}>
                          <FieldGroup>
                            <div className="aspect-[4/3] overflow-hidden rounded-xl border border-white/10 bg-black">
                              <img
                                src={
                                  managedArtworks.find(
                                    (artwork) =>
                                      artwork.id === selectedArtworkId
                                  )?.src ?? ""
                                }
                                alt={editTitle}
                                className="size-full object-contain"
                              />
                            </div>

                            <Field>
                              <FieldLabel htmlFor="edit-artwork-title">
                                Artwork title
                              </FieldLabel>
                              <Input
                                id="edit-artwork-title"
                                value={editTitle}
                                onChange={(event) =>
                                  setEditTitle(event.target.value)
                                }
                                required
                                className="h-11 bg-black/35"
                              />
                            </Field>

                            <div className="grid gap-5 sm:grid-cols-2">
                              <Field>
                                <FieldLabel htmlFor="edit-artwork-mood">
                                  Mood
                                </FieldLabel>
                                <Input
                                  id="edit-artwork-mood"
                                  value={editMood}
                                  onChange={(event) =>
                                    setEditMood(event.target.value)
                                  }
                                  className="h-11 bg-black/35"
                                />
                              </Field>

                              <Field>
                                <FieldLabel htmlFor="edit-artwork-tags">
                                  Tags
                                </FieldLabel>
                                <Input
                                  id="edit-artwork-tags"
                                  value={editTags}
                                  onChange={(event) =>
                                    setEditTags(event.target.value)
                                  }
                                  placeholder="cyberpunk, portrait, neon"
                                  className="h-11 bg-black/35"
                                />
                              </Field>
                            </div>

                            <StudioFeedback error={error} message={message} />

                            <Button
                              type="submit"
                              size="lg"
                              disabled={busy}
                              className="h-11 w-full"
                            >
                              {busy ? "Saving..." : "Save artwork details"}
                            </Button>
                          </FieldGroup>
                        </form>
                      ) : (
                        <div className="grid min-h-[420px] place-items-center text-center">
                          <div className="max-w-xs">
                            <Archive className="mx-auto size-7 text-zinc-700" />
                            <p className="mt-4 text-sm leading-6 text-zinc-500">
                              Select a collection with artwork to begin editing.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="profile">
              <Card className="border-white/10 bg-zinc-950/80 shadow-2xl shadow-black/30 ring-0 backdrop-blur-xl">
                <CardHeader className="border-b border-white/8 px-5 pb-5 sm:px-7">
                  <Badge className="mb-2 border border-fuchsia-300/20 bg-fuchsia-300/10 text-fuchsia-200">
                    Creator identity / Public
                  </Badge>
                  <CardTitle className="text-2xl font-light text-white">
                    Shape your public profile
                  </CardTitle>
                  <CardDescription className="max-w-2xl leading-6 text-zinc-500">
                    Your name, image, and statement connect every world you
                    publish under one recognizable identity.
                  </CardDescription>
                  {profileUsername && (
                    <Link
                      href={`/creator/${profileUsername}`}
                      className="mt-2 inline-flex w-fit items-center gap-1.5 text-xs text-cyan-300 hover:text-cyan-100"
                    >
                      /creator/{profileUsername}
                      <ExternalLink className="size-3" />
                    </Link>
                  )}
                </CardHeader>
                <CardContent className="px-5 sm:px-7">
                  <form onSubmit={handleUpdateProfile}>
                    <FieldGroup>
                      <div className="grid gap-5 rounded-xl border border-white/8 bg-black/20 p-4 sm:grid-cols-[112px_minmax(0,1fr)] sm:items-center">
                        <div className="grid size-28 place-items-center overflow-hidden rounded-2xl border border-cyan-300/15 bg-cyan-300/5 text-3xl font-light text-cyan-300 shadow-inner shadow-black/50">
                          {profileAvatarPreview ? (
                            <img
                              src={profileAvatarPreview}
                              alt="Profile picture preview"
                              className="size-full object-cover"
                            />
                          ) : (
                            creatorInitial || "N"
                          )}
                        </div>

                        <Field>
                          <FieldLabel htmlFor="profile-picture">
                            Profile picture
                          </FieldLabel>
                          <Input
                            id="profile-picture"
                            key={profileAvatarInputKey}
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={(event) =>
                              selectProfileAvatar(
                                event.target.files?.[0] ?? null
                              )
                            }
                            className="h-auto border-dashed bg-black/35 py-3 file:mr-3 file:rounded-lg file:bg-cyan-300 file:px-3 file:text-zinc-950"
                          />
                          <FieldDescription>
                            PNG, JPG, or WebP. Maximum size 5 MB.
                          </FieldDescription>
                        </Field>
                      </div>

                      <div className="grid gap-5 sm:grid-cols-2">
                        <Field>
                          <FieldLabel htmlFor="profile-username">
                            Username
                          </FieldLabel>
                          <Input
                            id="profile-username"
                            value={profileUsername}
                            onChange={(event) =>
                              setProfileUsername(event.target.value)
                            }
                            required
                            minLength={3}
                            maxLength={30}
                            autoComplete="username"
                            placeholder="your-creator-name"
                            className="h-11 bg-black/35"
                          />
                          <FieldDescription>
                            Lowercase letters, numbers, or hyphens.
                          </FieldDescription>
                        </Field>

                        <Field>
                          <FieldLabel htmlFor="profile-display-name">
                            Display name
                          </FieldLabel>
                          <Input
                            id="profile-display-name"
                            value={profileDisplayName}
                            onChange={(event) =>
                              setProfileDisplayName(event.target.value)
                            }
                            required
                            maxLength={80}
                            autoComplete="name"
                            className="h-11 bg-black/35"
                          />
                        </Field>
                      </div>

                      <Field>
                        <FieldLabel htmlFor="profile-bio">Bio</FieldLabel>
                        <Textarea
                          id="profile-bio"
                          value={profileBio}
                          onChange={(event) =>
                            setProfileBio(event.target.value)
                          }
                          rows={6}
                          maxLength={500}
                          placeholder="Tell people about the worlds you create."
                          className="resize-y bg-black/35"
                        />
                        <FieldDescription className="text-right">
                          {profileBio.length}/500
                        </FieldDescription>
                      </Field>

                      <StudioFeedback error={error} message={message} />

                      <Button
                        type="submit"
                        size="lg"
                        disabled={busy}
                        className="h-11 w-full"
                      >
                        <BadgeCheck data-icon="inline-start" />
                        {busy ? "Saving..." : "Save creator profile"}
                      </Button>
                    </FieldGroup>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </section>
      </main>
    </>
  );
}
