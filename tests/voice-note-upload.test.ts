import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";
import {
  buildVoiceNotePath,
  inspectVoiceNoteFile,
  MAX_MULTIPART_BODY_BYTES,
  MAX_VOICE_NOTE_BYTES,
  parseVoiceDurationMs,
  readBoundedRequestBody,
} from "../lib/voice-note-upload";

const conversationId = "60f1ec6b-8258-45f1-98f1-6a507008b621";
const senderId = "b02ee353-ecf4-42df-bd3b-d45bfb6e234e";
const objectId = "fb2a0d85-8c04-4c22-9b45-054a1e4d930a";
const nodeRequire = createRequire(import.meta.url);

type RouteOutcome = "ambiguous-committed" | "ambiguous-unknown" | "rejected";

function loadVoiceRoute(outcome: RouteOutcome) {
  const committedRows: Array<Record<string, unknown>> = [];
  const objects = new Set<string>();
  let pending: Record<string, unknown> | null = null;
  const client = {
    rpc: async () => ({ data: true, error: null }),
    from(table: string) {
      if (table === "conversation_members") {
        return {
          select() { return this; },
          eq() { return this; },
          maybeSingle: async () => ({ data: { conversation_id: conversationId }, error: null }),
        };
      }
      if (table === "messages") {
        return {
          insert(value: Record<string, unknown>) {
            pending = value;
            return this;
          },
          select() { return this; },
          eq() { return this; },
          maybeSingle: async () => ({
            data: committedRows.find((row) => row.id === pending?.id && row.attachment_path === pending?.attachment_path) ?? null,
            error: null,
          }),
          single: async () => {
            if (outcome === "ambiguous-committed") {
              committedRows.push({ ...pending });
              return {
                data: null,
                error: { code: "", details: "", hint: "", message: "TypeError: fetch failed" },
                status: 0,
              };
            }
            if (outcome === "ambiguous-unknown") {
              return {
                data: null,
                error: { code: "", details: "", hint: "", message: "TypeError: fetch failed" },
                status: 0,
              };
            }
            return { data: null, error: { code: "23514", message: "payload rejected" }, status: 400 };
          },
        };
      }
      throw new Error(`Unexpected table ${table}`);
    },
    storage: {
      from() {
        return {
          upload: async (path: string) => {
            objects.add(path);
            return { error: null };
          },
          remove: async (paths: string[]) => {
            for (const path of paths) objects.delete(path);
            return { error: null };
          },
        };
      },
    },
  };
  const source = readFileSync("app/api/messages/voice/route.ts", "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exported: { POST?: (request: Request) => Promise<Response> } = {};
  new Function("require", "exports", "process", output)(
    (name: string) => {
      if (name === "@supabase/supabase-js") {
        return {
          createClient: (_url: string, _key: string, config: { global?: unknown }) => config.global
            ? client
            : { auth: { getUser: async () => ({ data: { user: { id: senderId } }, error: null }) } },
        };
      }
      if (name === "@/lib/voice-note-upload") return nodeRequire("../lib/voice-note-upload.ts");
      return nodeRequire(name);
    },
    exported,
    { env: { NEXT_PUBLIC_SUPABASE_URL: "https://fixture.invalid", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "fixture" } },
  );
  return { committedRows, objects, post: exported.POST! };
}

function voiceRequest(file: File) {
  const form = new FormData();
  form.set("conversationId", conversationId);
  form.set("durationMs", "1000");
  form.set("file", file);
  return new Request("https://fixture.invalid/api/messages/voice", {
    body: form,
    headers: { Authorization: "Bearer fixture-token" },
    method: "POST",
  });
}

function webmFile() {
  return new File(
    [Uint8Array.from([0x1a, 0x45, 0xdf, 0xa3, 0x42, 0x82, 0x84, 0x77, 0x65, 0x62, 0x6d])],
    "clip.webm",
    { type: "audio/webm" },
  );
}

test("accepts recorder WebM and MP4 containers only when the MIME agrees", async () => {
  const webm = new File([Uint8Array.from([0x1a, 0x45, 0xdf, 0xa3, 0x42, 0x82, 0x84, 0x77, 0x65, 0x62, 0x6d])], "untrusted-name.mp4", { type: "audio/webm;codecs=opus" });
  const mp4 = new File([Uint8Array.from([0, 0, 0, 20, 0x66, 0x74, 0x79, 0x70, 0x4d, 0x34, 0x41, 0x20])], "untrusted-name.webm", { type: "audio/mp4;codecs=mp4a.40.2" });

  assert.deepEqual(await inspectVoiceNoteFile(webm), { mime: "audio/webm", extension: "webm" });
  assert.deepEqual(await inspectVoiceNoteFile(mp4), { mime: "audio/mp4", extension: "m4a" });
  await assert.rejects(
    inspectVoiceNoteFile(new File([Uint8Array.from([0x1a, 0x45, 0xdf, 0xa3, 0x42, 0x82, 0x84, 0x77, 0x65, 0x62, 0x6d])], "clip.m4a", { type: "audio/mp4" })),
    /WebM or MP4 audio/,
  );
});

test("rejects oversized audio and bounds informational recorder duration", async () => {
  await assert.rejects(
    inspectVoiceNoteFile(new File([new Uint8Array(MAX_VOICE_NOTE_BYTES + 1)], "clip.webm", { type: "audio/webm" })),
    /5 MiB/,
  );
  assert.equal(parseVoiceDurationMs("60000"), 60000);
  assert.throws(() => parseVoiceDurationMs("60001"), /60 seconds/);
  assert.throws(() => parseVoiceDurationMs("0"), /60 seconds/);
});

test("generates the only accepted voice-note object path without using the file name", () => {
  assert.equal(
    buildVoiceNotePath(conversationId, senderId, { mime: "audio/mp4", extension: "m4a" }, objectId),
    `${conversationId}/voice/${senderId}/${objectId}.m4a`,
  );
});

test("stops reading a multipart body once the exact cap is exceeded", async () => {
  const request = new Request("https://example.invalid/api/messages/voice", {
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(MAX_MULTIPART_BODY_BYTES));
        controller.enqueue(new Uint8Array(1));
        controller.close();
      },
    }),
    method: "POST",
    // Node's Request accepts a stream body with duplex; the DOM type has not caught up.
    duplex: "half",
  } as RequestInit);
  await assert.rejects(readBoundedRequestBody(request), /too large/);
});

test("a lost insert response reconciles the generated message id and preserves its committed audio", async () => {
  const route = loadVoiceRoute("ambiguous-committed");
  const response = await route.post(voiceRequest(webmFile()));
  const payload = await response.json() as { message: Record<string, unknown> };

  assert.equal(response.status, 200);
  assert.equal(route.committedRows.length, 1);
  assert.equal(payload.message.id, route.committedRows[0]?.id);
  assert.equal(route.objects.has(String(route.committedRows[0]?.attachment_path)), true);
});

test("an unknown insert outcome preserves private audio and tells the caller to check the conversation", async () => {
  const route = loadVoiceRoute("ambiguous-unknown");
  const response = await route.post(voiceRequest(webmFile()));
  const payload = await response.json() as { error: string };

  assert.equal(response.status, 503);
  assert.match(payload.error, /could not confirm/i);
  assert.equal(route.objects.size, 1);
});

test("only a confirmed database rejection cleans up the generated upload", async () => {
  const route = loadVoiceRoute("rejected");
  const response = await route.post(voiceRequest(webmFile()));

  assert.equal(response.status, 502);
  assert.equal(route.committedRows.length, 0);
  assert.equal(route.objects.size, 0);
});

test("invalid recorder MIME is a client error and never uploads an object", async () => {
  const route = loadVoiceRoute("ambiguous-unknown");
  const response = await route.post(voiceRequest(new File(["not audio"], "clip.png", { type: "image/png" })));
  const payload = await response.json() as { error: string };

  assert.equal(response.status, 415);
  assert.match(payload.error, /WebM or MP4/);
  assert.equal(route.objects.size, 0);
});
