import { parseChatAppearance, type ChatAppearance } from "./chat-appearance";

export const CHAT_APPEARANCE_CHANGE_EVENT = "nodeine:chat-appearance";

type ChatAppearanceStorage = Pick<Storage, "getItem" | "setItem">;
type ChatAppearanceListener = () => void;

/** Browser dependencies stay at this seam so persistence can be exercised without a DOM. */
export type ChatAppearanceStoreAdapter = {
  getStorage: () => ChatAppearanceStorage | null;
  addEventListener: (type: string, listener: ChatAppearanceListener) => void;
  removeEventListener: (type: string, listener: ChatAppearanceListener) => void;
  dispatchEvent: (type: string) => void;
};

export type ChatAppearanceStore = {
  getSnapshot: (key: string | null) => string | null;
  getTemporarySnapshot: (key: string | null) => boolean;
  subscribe: (callback: ChatAppearanceListener) => () => void;
  updateAppearance: (key: string | null, patch: Partial<ChatAppearance>) => boolean;
};

function browserStorage(): ChatAppearanceStorage | null {
  if (typeof window === "undefined") return null;
  try {
    // Accessing localStorage itself can throw in privacy-restricted browser contexts.
    return window.localStorage;
  } catch {
    return null;
  }
}

const browserAdapter: ChatAppearanceStoreAdapter = {
  getStorage: browserStorage,
  addEventListener: (type, listener) => window.addEventListener(type, listener),
  removeEventListener: (type, listener) => window.removeEventListener(type, listener),
  dispatchEvent: (type) => window.dispatchEvent(new Event(type)),
};

export function createChatAppearanceStore(adapter: ChatAppearanceStoreAdapter): ChatAppearanceStore {
  const temporaryPreferences = new Map<string, string>();

  function storageOrNull(): ChatAppearanceStorage | null {
    try {
      return adapter.getStorage();
    } catch {
      return null;
    }
  }

  function getSnapshot(key: string | null): string | null {
    if (!key) return null;

    const temporary = temporaryPreferences.get(key);
    if (temporary !== undefined) return temporary;

    const storage = storageOrNull();
    if (!storage) return null;
    try {
      return storage.getItem(key);
    } catch {
      return null;
    }
  }

  function subscribe(callback: ChatAppearanceListener) {
    adapter.addEventListener("storage", callback);
    adapter.addEventListener(CHAT_APPEARANCE_CHANGE_EVENT, callback);
    return () => {
      adapter.removeEventListener("storage", callback);
      adapter.removeEventListener(CHAT_APPEARANCE_CHANGE_EVENT, callback);
    };
  }

  function updateAppearance(key: string | null, patch: Partial<ChatAppearance>) {
    if (!key) return false;

    const current = parseChatAppearance(getSnapshot(key));
    const next = JSON.stringify(
      parseChatAppearance(JSON.stringify({ ...current, ...patch }))
    );

    let persisted = true;
    const storage = storageOrNull();
    try {
      if (!storage) throw new Error("Chat appearance storage is unavailable.");
      storage.setItem(key, next);
      temporaryPreferences.delete(key);
    } catch {
      temporaryPreferences.set(key, next);
      persisted = false;
    }

    try {
      adapter.dispatchEvent(CHAT_APPEARANCE_CHANGE_EVENT);
    } catch {
      // Preferences remain usable even if a non-browser adapter cannot dispatch events.
    }
    return persisted;
  }

  return {
    getSnapshot,
    getTemporarySnapshot: key => key !== null && temporaryPreferences.has(key),
    subscribe,
    updateAppearance,
  };
}

export const chatAppearanceStore = createChatAppearanceStore(browserAdapter);
