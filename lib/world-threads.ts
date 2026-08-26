import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const WORLD_THREAD_MIN_ITEMS = 2;
export const WORLD_THREAD_MAX_ITEMS = 12;

export const WORLD_THREAD_RELATIONS = [
  "origin",
  "palette",
  "mood",
  "composition",
  "character",
  "setting",
  "motion",
  "lore",
  "contrast",
] as const;

export type WorldThreadRelation = (typeof WORLD_THREAD_RELATIONS)[number];
export type WorldThreadVisibility = "draft" | "public";

export type ThreadProfile = {
  id: string;
  username: string | null;
  displayName: string;
  avatarUrl: string | null;
};

export type ThreadArtwork = {
  id: string;
  title: string;
  src: string;
  thumbSrc: string | null;
  mediaType: string | null;
  mood: string | null;
  tags: string[];
  collection: {
    id: string;
    title: string;
    worldCode: string | null;
    creator: ThreadProfile | null;
  } | null;
};

export type WorldThreadItem = {
  id: string;
  position: number;
  relationType: WorldThreadRelation;
  note: string | null;
  addedBy: string;
  createdAt: string;
  artwork: ThreadArtwork;
};

export type WorldThread = {
  id: string;
  ownerId: string;
  title: string;
  slug: string;
  summary: string | null;
  visibility: WorldThreadVisibility;
  allowForks: boolean;
  createdAt: string;
  updatedAt: string;
  owner: ThreadProfile | null;
  forkedFromId: string | null;
  forkedFrom: {
    id: string;
    title: string;
    slug: string;
  } | null;
  itemCount: number;
  items: WorldThreadItem[];
};

export type WorldThreadDraftItem = {
  artworkId: string;
  relationType: WorldThreadRelation;
  note: string;
};

export type WorldThreadDraft = {
  title: string;
  summary: string;
  visibility: WorldThreadVisibility;
  allowForks: boolean;
  items: WorldThreadDraftItem[];
};

export type WorldThreadMutationResult = {
  threadId: string;
  threadSlug: string;
};

type ThreadRow = {
  id: string;
  owner_id: string;
  title: string;
  slug: string;
  summary: string | null;
  visibility: string;
  allow_forks: boolean;
  forked_from_id: string | null;
  created_at: string;
  updated_at: string;
};

type ThreadItemRow = {
  id: string;
  thread_id: string;
  artwork_id: string;
  position: number;
  relation_type: string;
  note: string | null;
  added_by: string;
  created_at: string;
};

type ArtworkRow = {
  id: string;
  collection_id: string;
  title: string;
  src: string;
  thumb_src: string | null;
  media_type: string | null;
  mood: string | null;
  tags: string[] | null;
};

type CollectionRow = {
  id: string;
  owner_id: string;
  title: string;
  world_code: string | null;
};

type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type SavedRow = {
  artwork_id: string;
  created_at: string;
};

const threadFields =
  "id, owner_id, title, slug, summary, visibility, allow_forks, forked_from_id, created_at, updated_at";
const itemFields =
  "id, thread_id, artwork_id, position, relation_type, note, added_by, created_at";
const artworkFields =
  "id, collection_id, title, src, thumb_src, media_type, mood, tags";

function unique(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => !!value)));
}

function isRelation(value: string): value is WorldThreadRelation {
  return (WORLD_THREAD_RELATIONS as readonly string[]).includes(value);
}

function relationOrFallback(value: string, isOrigin: boolean) {
  if (isOrigin) return "origin" as const;
  return isRelation(value) && value !== "origin" ? value : "mood";
}

function toProfile(row: ProfileRow | undefined): ThreadProfile | null {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name?.trim() || row.username || "NODEINE maker",
    avatarUrl: row.avatar_url,
  };
}

async function fetchProfiles(database: SupabaseClient, ids: string[]) {
  if (!ids.length) return new Map<string, ProfileRow>();
  const { data, error } = await database
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", ids);
  if (error) throw error;
  return new Map(((data ?? []) as ProfileRow[]).map((row) => [row.id, row]));
}

async function fetchArtworkMap(database: SupabaseClient, ids: string[]) {
  if (!ids.length) return new Map<string, ThreadArtwork>();

  const { data: artworkData, error: artworkError } = await database
    .from("artworks")
    .select(artworkFields)
    .in("id", ids);
  if (artworkError) throw artworkError;

  const artworkRows = (artworkData ?? []) as ArtworkRow[];
  const collectionIds = unique(artworkRows.map((row) => row.collection_id));
  const { data: collectionData, error: collectionError } = collectionIds.length
    ? await database
        .from("collections")
        .select("id, owner_id, title, world_code")
        .in("id", collectionIds)
    : { data: [], error: null };
  if (collectionError) throw collectionError;

  const collectionRows = (collectionData ?? []) as CollectionRow[];
  const collectionById = new Map(collectionRows.map((row) => [row.id, row]));
  const profileById = await fetchProfiles(
    database,
    unique(collectionRows.map((row) => row.owner_id))
  );

  return new Map(
    artworkRows.map((row): [string, ThreadArtwork] => {
      const collection = collectionById.get(row.collection_id);
      return [
        row.id,
        {
          id: row.id,
          title: row.title,
          src: row.src,
          thumbSrc: row.thumb_src,
          mediaType: row.media_type,
          mood: row.mood,
          tags: row.tags ?? [],
          collection: collection
            ? {
                id: collection.id,
                title: collection.title,
                worldCode: collection.world_code,
                creator: toProfile(profileById.get(collection.owner_id)),
              }
            : null,
        },
      ];
    })
  );
}

async function hydrateThreads(
  database: SupabaseClient,
  rows: ThreadRow[],
  itemLimitPerThread?: number
): Promise<WorldThread[]> {
  if (!rows.length) return [];

  const threadIds = rows.map((row) => row.id);
  const { data: itemData, error: itemError } = await database
    .from("world_thread_items")
    .select(itemFields)
    .in("thread_id", threadIds)
    .order("position", { ascending: true });
  if (itemError) throw itemError;

  const itemRows = (itemData ?? []) as ThreadItemRow[];
  const itemCountByThread = new Map<string, number>();
  for (const row of itemRows) {
    itemCountByThread.set(
      row.thread_id,
      (itemCountByThread.get(row.thread_id) ?? 0) + 1
    );
  }
  const hydratedItemRows = itemLimitPerThread
    ? itemRows.filter((row) => row.position <= itemLimitPerThread)
    : itemRows;
  const artworkById = await fetchArtworkMap(
    database,
    unique(hydratedItemRows.map((row) => row.artwork_id))
  );
  const profileById = await fetchProfiles(
    database,
    unique(rows.map((row) => row.owner_id))
  );

  const sourceIds = unique(rows.map((row) => row.forked_from_id));
  const { data: sourceData, error: sourceError } = sourceIds.length
    ? await database
        .from("world_threads")
        .select("id, title, slug")
        .in("id", sourceIds)
    : { data: [], error: null };
  if (sourceError) throw sourceError;
  const sourceById = new Map(
    ((sourceData ?? []) as Array<{ id: string; title: string; slug: string }>).map(
      (row) => [row.id, row]
    )
  );

  const itemsByThread = new Map<string, WorldThreadItem[]>();
  for (const row of hydratedItemRows) {
    const artwork = artworkById.get(row.artwork_id);
    if (!artwork) continue;
    const items = itemsByThread.get(row.thread_id) ?? [];
    items.push({
      id: row.id,
      position: row.position,
      relationType: relationOrFallback(row.relation_type, row.position === 1),
      note: row.note,
      addedBy: row.added_by,
      createdAt: row.created_at,
      artwork,
    });
    itemsByThread.set(row.thread_id, items);
  }

  return rows.map((row) => {
    const source = row.forked_from_id
      ? sourceById.get(row.forked_from_id)
      : undefined;
    return {
      id: row.id,
      ownerId: row.owner_id,
      title: row.title,
      slug: row.slug,
      summary: row.summary,
      visibility: row.visibility === "public" ? "public" : "draft",
      allowForks: row.allow_forks,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      owner: toProfile(profileById.get(row.owner_id)),
      forkedFromId: row.forked_from_id,
      forkedFrom: source
        ? { id: source.id, title: source.title, slug: source.slug }
        : null,
      itemCount: itemCountByThread.get(row.id) ?? 0,
      items: (itemsByThread.get(row.id) ?? []).sort(
        (a, b) => a.position - b.position
      ),
    } satisfies WorldThread;
  });
}

function publicDatabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return url && key ? createClient(url, key) : null;
}

export async function getPublicWorldThreads(limit = 24) {
  const database = publicDatabase();
  if (!database) return [];

  const { data, error } = await database
    .from("world_threads")
    .select(threadFields)
    .eq("visibility", "public")
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return hydrateThreads(database, (data ?? []) as ThreadRow[], 3);
}

export async function getPublicWorldThreadBySlug(slug: string) {
  const database = publicDatabase();
  if (!database) return null;

  const { data, error } = await database
    .from("world_threads")
    .select(threadFields)
    .eq("slug", slug)
    .eq("visibility", "public")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [thread] = await hydrateThreads(database, [data as ThreadRow]);
  return thread ?? null;
}

export async function getWorldThreadBySlug(
  database: SupabaseClient,
  slug: string
) {
  const { data, error } = await database
    .from("world_threads")
    .select(threadFields)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [thread] = await hydrateThreads(database, [data as ThreadRow]);
  return thread ?? null;
}

export async function getComposerArtwork(
  database: SupabaseClient,
  userId: string,
  includeArtworkIds: string[] = []
) {
  const { data: savedData, error: savedError } = await database
    .from("artwork_saves")
    .select("artwork_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (savedError) throw savedError;

  const savedRows = (savedData ?? []) as SavedRow[];
  const orderedIds = unique([
    ...includeArtworkIds,
    ...savedRows.map((row) => row.artwork_id),
  ]);
  const artworkById = await fetchArtworkMap(database, orderedIds);
  return orderedIds.flatMap((id) => {
    const artwork = artworkById.get(id);
    return artwork ? [artwork] : [];
  });
}

export function validateWorldThreadDraft(draft: WorldThreadDraft) {
  const title = draft.title.trim();
  const summary = draft.summary.trim();
  if (title.length < 2 || title.length > 80) {
    return { error: "Give the thread a title between 2 and 80 characters." };
  }
  if (summary.length > 320) {
    return { error: "Keep the thread summary under 320 characters." };
  }
  if (
    draft.items.length < WORLD_THREAD_MIN_ITEMS ||
    draft.items.length > WORLD_THREAD_MAX_ITEMS
  ) {
    return {
      error: `Choose between ${WORLD_THREAD_MIN_ITEMS} and ${WORLD_THREAD_MAX_ITEMS} pieces.`,
    };
  }
  if (new Set(draft.items.map((item) => item.artworkId)).size !== draft.items.length) {
    return { error: "Each artwork can appear only once in a thread." };
  }

  const items = draft.items.map((item, index) => ({
    artworkId: item.artworkId,
    relationType: relationOrFallback(item.relationType, index === 0),
    note: item.note.trim().slice(0, 280),
  }));

  return {
    error: null,
    value: {
      title,
      summary,
      visibility: draft.visibility,
      allowForks: draft.allowForks,
      items,
    } satisfies WorldThreadDraft,
  };
}

function mutationResult(data: unknown): WorldThreadMutationResult {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") {
    throw new Error("The thread was saved, but no destination was returned.");
  }
  const result = row as { thread_id?: unknown; thread_slug?: unknown };
  if (typeof result.thread_id !== "string" || typeof result.thread_slug !== "string") {
    throw new Error("The thread response was incomplete.");
  }
  return { threadId: result.thread_id, threadSlug: result.thread_slug };
}

function rpcPayload(draft: WorldThreadDraft) {
  return {
    thread_title: draft.title,
    thread_summary: draft.summary,
    thread_visibility: draft.visibility,
    thread_allow_forks: draft.allowForks,
    thread_artwork_ids: draft.items.map((item) => item.artworkId),
    thread_relation_types: draft.items.map((item) => item.relationType),
    thread_notes: draft.items.map((item) => item.note),
  };
}

export async function createWorldThread(
  database: SupabaseClient,
  draft: WorldThreadDraft
) {
  const validated = validateWorldThreadDraft(draft);
  if (validated.error || !validated.value) {
    throw new Error(validated.error || "The thread is incomplete.");
  }
  const { data, error } = await database.rpc(
    "create_world_thread",
    rpcPayload(validated.value)
  );
  if (error) throw error;
  return mutationResult(data);
}

export async function updateWorldThread(
  database: SupabaseClient,
  threadId: string,
  draft: WorldThreadDraft
) {
  const validated = validateWorldThreadDraft(draft);
  if (validated.error || !validated.value) {
    throw new Error(validated.error || "The thread is incomplete.");
  }
  const { data, error } = await database.rpc("update_world_thread", {
    target_thread_id: threadId,
    ...rpcPayload(validated.value),
  });
  if (error) throw error;
  return mutationResult(data);
}

export async function forkWorldThread(
  database: SupabaseClient,
  sourceThreadId: string
) {
  const { data, error } = await database.rpc("fork_world_thread", {
    source_thread_id: sourceThreadId,
  });
  if (error) throw error;
  return mutationResult(data);
}

export function worldThreadRelationLabel(relation: WorldThreadRelation) {
  return relation === "origin"
    ? "Origin"
    : `${relation.charAt(0).toUpperCase()}${relation.slice(1)}`;
}

export function worldThreadDescription(thread: WorldThread) {
  return (
    thread.summary ||
    `${thread.itemCount} connected references curated by ${
      thread.owner?.displayName || "a NODEINE maker"
    }.`
  );
}
