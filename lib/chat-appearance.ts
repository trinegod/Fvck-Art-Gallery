export const CHAT_PALETTES = {
  glacier: { label: "Glacier", background: "#8de6ed", foreground: "#0b2025" },
  orchid: { label: "Orchid", background: "#d7c1f4", foreground: "#271831" },
  ember: { label: "Ember", background: "#f2c28a", foreground: "#2b190d" },
} as const;

export type ChatAppearance = {
  palette: keyof typeof CHAT_PALETTES;
  artworkId: string | null;
  hidden: boolean;
  dim: number;
};

export const DEFAULT_CHAT_APPEARANCE: ChatAppearance = {
  palette: "glacier", artworkId: null, hidden: false, dim: 60,
};

/** Stored preferences are untrusted. Never persist image URLs or message content. */
export function parseChatAppearance(value: string | null): ChatAppearance {
  if (!value) return { ...DEFAULT_CHAT_APPEARANCE };
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { ...DEFAULT_CHAT_APPEARANCE };
    const data = parsed as Record<string, unknown>;
    return {
      palette: typeof data.palette === "string" && Object.hasOwn(CHAT_PALETTES, data.palette)
        ? data.palette as ChatAppearance["palette"] : "glacier",
      artworkId: typeof data.artworkId === "string" && /^[a-z0-9-]{1,80}$/i.test(data.artworkId)
        ? data.artworkId : null,
      hidden: data.hidden === true,
      dim: typeof data.dim === "number" && Number.isFinite(data.dim)
        ? Math.round(Math.min(85, Math.max(35, data.dim))) : 60,
    };
  } catch {
    return { ...DEFAULT_CHAT_APPEARANCE };
  }
}

export function chatAppearanceKey(accountId: string, conversationId: string) {
  return `nodeine:chat-appearance:v1:${encodeURIComponent(accountId)}:${encodeURIComponent(conversationId)}`;
}
