import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  buildVoiceNotePath,
  inspectVoiceNoteFile,
  isUuid,
  MAX_VOICE_NOTE_BYTES,
  parseVoiceDurationMs,
  readBoundedRequestBody,
  VOICE_NOTE_BUCKET,
} from "@/lib/voice-note-upload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

type AuthenticatedClient = {
  client: SupabaseClient;
  userId: string;
};

const messageFields = "id, conversation_id, sender_id, body, message_type, artwork_id, attachment_path, attachment_mime, attachment_name, voice_duration_ms, created_at";

function errorResponse(error: unknown): Response {
  if (error instanceof ApiError) return Response.json({ error: error.message }, { status: error.status });
  return Response.json({ error: "Voice notes are unavailable right now." }, { status: 500 });
}

function serverConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new ApiError("Voice notes are not configured.", 503);
  return { url, key };
}

function bearerToken(request: Request) {
  const match = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i);
  if (!match?.[1]) throw new ApiError("Sign in to send voice notes.", 401);
  return match[1];
}

async function authenticatedClient(request: Request): Promise<AuthenticatedClient> {
  const { url, key } = serverConfig();
  const token = bearerToken(request);
  const verifier = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await verifier.auth.getUser(token);
  if (error || !data.user) throw new ApiError("Sign in to send voice notes.", 401);

  return {
    userId: data.user.id,
    client: createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    }),
  };
}

async function verifyMembership(client: SupabaseClient, conversationId: string, userId: string) {
  const { data, error } = await client
    .from("conversation_members")
    .select("conversation_id")
    .eq("conversation_id", conversationId)
    .eq("profile_id", userId)
    .maybeSingle();

  if (error) throw new ApiError("Could not verify conversation access.", 503);
  if (!data) throw new ApiError("You are not a member of this conversation.", 403);
}

async function voiceNotesEnabled(client: SupabaseClient) {
  const { data, error } = await client.rpc("nodeine_voice_notes_available");
  if (error) {
    if (error.code === "PGRST202") {
      return { enabled: false as const, reason: "Private audio delivery has not been activated yet." };
    }
    throw new ApiError("Could not check voice-note availability.", 503);
  }
  if (data !== true) return { enabled: false as const, reason: "Voice notes are not available for this account." };
  return { enabled: true as const };
}

function exactlyOne(formData: FormData, name: string): FormDataEntryValue {
  const values = formData.getAll(name);
  if (values.length !== 1) throw new ApiError(`Voice note ${name} is required.`, 400);
  return values[0]!;
}

function asFile(value: FormDataEntryValue): File {
  if (typeof value === "string" || !(value instanceof Blob) || !("name" in value)) {
    throw new ApiError("Voice note file is required.", 400);
  }
  return value as File;
}

async function parseVoiceNoteRequest(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data;")) {
    throw new ApiError("Voice notes must use multipart form data.", 415);
  }

  let formData: FormData;
  try {
    const body = await readBoundedRequestBody(request);
    // Copy to a concrete ArrayBuffer because Next's bundled DOM types do not
    // accept a Uint8Array backed by a potentially shared ArrayBuffer as BodyInit.
    const multipartBody = new ArrayBuffer(body.byteLength);
    new Uint8Array(multipartBody).set(body);
    formData = await new Request(request.url, {
      body: multipartBody,
      headers: { "content-type": contentType },
      method: "POST",
    }).formData();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(error instanceof Error ? error.message : "Voice note request is invalid.", 400);
  }

  const conversationValue = exactlyOne(formData, "conversationId");
  if (typeof conversationValue !== "string" || !isUuid(conversationValue)) {
    throw new ApiError("Conversation identifier is invalid.", 400);
  }

  try {
    return {
      conversationId: conversationValue,
      durationMs: parseVoiceDurationMs(exactlyOne(formData, "durationMs")),
      file: asFile(exactlyOne(formData, "file")),
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(error instanceof Error ? error.message : "Voice note is invalid.", 400);
  }
}

function isConfirmedDatabaseRejection(error: unknown, status: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: unknown }).code;
  // postgrest-js represents fetch failures as status 0 and often code: "".
  // Restrict cleanup to response-backed Postgres/PostgREST errors instead.
  return typeof status === "number"
    && status >= 400
    && status <= 599
    && typeof code === "string"
    && (/^[0-9A-Z]{5}$/i.test(code) || /^PGRST\d+$/i.test(code));
}

async function findCommittedVoiceMessage(client: SupabaseClient, messageId: string, attachmentPath: string) {
  try {
    const { data, error } = await client
      .from("messages")
      .select(messageFields)
      .eq("id", messageId)
      .eq("attachment_path", attachmentPath)
      .maybeSingle();
    return error ? null : data;
  } catch {
    return null;
  }
}

async function validateUploadedVoiceFile(file: File) {
  try {
    return await inspectVoiceNoteFile(file);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Voice note file is invalid.";
    if (file.size > MAX_VOICE_NOTE_BYTES) throw new ApiError(message, 413);
    if (file.size <= 0) throw new ApiError(message, 400);
    throw new ApiError(message, 415);
  }
}

export async function GET(request: Request) {
  try {
    const conversationId = new URL(request.url).searchParams.get("conversationId");
    if (!conversationId || !isUuid(conversationId)) throw new ApiError("Conversation identifier is invalid.", 400);

    const { client, userId } = await authenticatedClient(request);
    await verifyMembership(client, conversationId, userId);
    return Response.json(await voiceNotesEnabled(client));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  let uploadedPath: string | null = null;
  let client: SupabaseClient | null = null;
  let cleanupUploadedObject = false;

  try {
    const auth = await authenticatedClient(request);
    client = auth.client;
    const { conversationId, durationMs, file } = await parseVoiceNoteRequest(request);
    await verifyMembership(client, conversationId, auth.userId);

    const enabled = await voiceNotesEnabled(client);
    if (!enabled.enabled) throw new ApiError(enabled.reason, 503);

    const container = await validateUploadedVoiceFile(file);
    const messageId = crypto.randomUUID();
    uploadedPath = buildVoiceNotePath(conversationId, auth.userId, container);
    const { error: uploadError } = await client.storage
      .from(VOICE_NOTE_BUCKET)
      .upload(uploadedPath, file, { contentType: container.mime, upsert: false });
    if (uploadError) throw new ApiError("Voice note could not be uploaded.", 502);

    let data: Record<string, unknown> | null = null;
    let insertError: unknown = null;
    let insertStatus: unknown = null;
    try {
      const result = await client
        .from("messages")
        .insert({
          id: messageId,
          attachment_mime: container.mime,
          attachment_name: null,
          attachment_path: uploadedPath,
          body: null,
          conversation_id: conversationId,
          message_type: "voice",
          sender_id: auth.userId,
          voice_duration_ms: durationMs,
        })
        .select(messageFields)
        .single();
      data = result.data as Record<string, unknown> | null;
      insertError = result.error;
      insertStatus = result.status;
    } catch {
      // A thrown transport error may arrive after PostgreSQL has committed.
      insertError = null;
    }
    if (data) return Response.json({ message: data });

    // Reconcile before cleanup even if the response looks like a normal
    // database rejection: a completed write must always win over deletion.
    const committed = await findCommittedVoiceMessage(client, messageId, uploadedPath);
    if (committed) return Response.json({ message: committed });

    if (insertError && isConfirmedDatabaseRejection(insertError, insertStatus)) {
      cleanupUploadedObject = true;
      throw new ApiError("Voice note could not be sent.", 502);
    }

    throw new ApiError(
      "We could not confirm whether your private audio was sent. Check the conversation before trying again.",
      503,
    );
  } catch (error) {
    if (cleanupUploadedObject && uploadedPath && client) {
      const { error: cleanupError } = await client.storage.from(VOICE_NOTE_BUCKET).remove([uploadedPath]);
      if (cleanupError) {
        return Response.json(
          { error: "Voice note could not be sent and its upload could not be removed safely." },
          { status: 502 },
        );
      }
    }
    return errorResponse(error);
  }
}
