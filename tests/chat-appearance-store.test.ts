import assert from "node:assert/strict";
import test from "node:test";
import { chatAppearanceKey, DEFAULT_CHAT_APPEARANCE, parseChatAppearance } from "../lib/chat-appearance";
import {
  createChatAppearanceStore,
  type ChatAppearanceStoreAdapter,
} from "../lib/chat-appearance-store";

class MemoryStorage {
  readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

class MemoryEvents {
  private readonly listeners = new Map<string, Set<() => void>>();

  add(type: string, listener: () => void) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  remove(type: string, listener: () => void) {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type: string) {
    for (const listener of this.listeners.get(type) ?? []) listener();
  }
}

function createAdapter(storage: MemoryStorage, events = new MemoryEvents()): ChatAppearanceStoreAdapter & { events: MemoryEvents } {
  return {
    getStorage: () => storage,
    addEventListener: (type, listener) => events.add(type, listener),
    removeEventListener: (type, listener) => events.remove(type, listener),
    dispatchEvent: (type) => events.emit(type),
    events,
  };
}

test("the production store persists normalized preferences and reloads them", () => {
  const storage = new MemoryStorage();
  const adapter = createAdapter(storage);
  const key = chatAppearanceKey("viewer-1", "conversation-1");
  const firstStore = createChatAppearanceStore(adapter);

  assert.equal(firstStore.updateAppearance(key, { palette: "orchid", artworkId: "artwork-123", dim: 43 }), true);
  const raw = storage.getItem(key);
  assert.notEqual(raw, null);
  assert.deepEqual(parseChatAppearance(raw), {
    palette: "orchid",
    artworkId: "artwork-123",
    hidden: false,
    dim: 43,
  });

  const reloadedStore = createChatAppearanceStore(createAdapter(storage));
  assert.equal(reloadedStore.getSnapshot(key), raw);
});

test("the store exposes malformed persisted data to the existing fallback parser", () => {
  const storage = new MemoryStorage();
  const key = chatAppearanceKey("viewer-1", "conversation-1");
  storage.setItem(key, "not-json");

  const store = createChatAppearanceStore(createAdapter(storage));
  assert.deepEqual(parseChatAppearance(store.getSnapshot(key)), DEFAULT_CHAT_APPEARANCE);
});

test("denied storage reads and writes retain this session's normalized preference", () => {
  const events = new MemoryEvents();
  const deniedStorage = {
    getItem: () => {
      throw new Error("Storage reads are denied");
    },
    setItem: () => {
      throw new Error("Storage writes are denied");
    },
  };
  const deniedAdapter: ChatAppearanceStoreAdapter = {
    getStorage: () => deniedStorage,
    addEventListener: (type, listener) => events.add(type, listener),
    removeEventListener: (type, listener) => events.remove(type, listener),
    dispatchEvent: (type) => events.emit(type),
  };
  const key = chatAppearanceKey("viewer-1", "conversation-1");
  const store = createChatAppearanceStore(deniedAdapter);

  assert.equal(store.getSnapshot(key), null);
  assert.equal(store.updateAppearance(key, { palette: "ember", dim: 30 }), false);
  assert.deepEqual(parseChatAppearance(store.getSnapshot(key)), {
    palette: "ember",
    artworkId: null,
    hidden: false,
    dim: 35,
  });
});

test("storage getter failures use the same temporary fallback", () => {
  const events = new MemoryEvents();
  const inaccessibleAdapter: ChatAppearanceStoreAdapter = {
    getStorage: () => {
      throw new Error("Storage property access is denied");
    },
    addEventListener: (type, listener) => events.add(type, listener),
    removeEventListener: (type, listener) => events.remove(type, listener),
    dispatchEvent: (type) => events.emit(type),
  };
  const key = chatAppearanceKey("viewer-1", "conversation-1");
  const store = createChatAppearanceStore(inaccessibleAdapter);

  assert.equal(store.updateAppearance(key, { hidden: true }), false);
  assert.equal(parseChatAppearance(store.getSnapshot(key)).hidden, true);
});

test("same-document updates notify subscribers and cleanup stops future notifications", () => {
  const storage = new MemoryStorage();
  const adapter = createAdapter(storage);
  const store = createChatAppearanceStore(adapter);
  const key = chatAppearanceKey("viewer-1", "conversation-1");
  let notifications = 0;
  const unsubscribe = store.subscribe(() => {
    notifications += 1;
  });

  store.updateAppearance(key, { hidden: true });
  assert.equal(notifications, 1);

  unsubscribe();
  store.updateAppearance(key, { hidden: false });
  assert.equal(notifications, 1);
});

test("external storage events notify subscribers and expose the new primitive snapshot", () => {
  const storage = new MemoryStorage();
  const adapter = createAdapter(storage);
  const store = createChatAppearanceStore(adapter);
  const key = chatAppearanceKey("viewer-1", "conversation-1");
  storage.setItem(key, JSON.stringify({ palette: "ember", artworkId: null, hidden: true, dim: 70 }));
  let notifications = 0;
  const unsubscribe = store.subscribe(() => {
    notifications += 1;
  });

  adapter.events.emit("storage");
  assert.equal(notifications, 1);
  assert.equal(typeof store.getSnapshot(key), "string");
  assert.deepEqual(parseChatAppearance(store.getSnapshot(key)), {
    palette: "ember",
    artworkId: null,
    hidden: true,
    dim: 70,
  });
  unsubscribe();
});

test("account and conversation keys retain independent snapshots", () => {
  const storage = new MemoryStorage();
  const store = createChatAppearanceStore(createAdapter(storage));
  const aliceRoomOne = chatAppearanceKey("alice", "room-1");
  const aliceRoomTwo = chatAppearanceKey("alice", "room-2");
  const bobRoomOne = chatAppearanceKey("bob", "room-1");

  store.updateAppearance(aliceRoomOne, { palette: "orchid" });
  store.updateAppearance(aliceRoomTwo, { palette: "ember" });
  store.updateAppearance(bobRoomOne, { hidden: true });

  assert.equal(parseChatAppearance(store.getSnapshot(aliceRoomOne)).palette, "orchid");
  assert.equal(parseChatAppearance(store.getSnapshot(aliceRoomTwo)).palette, "ember");
  assert.equal(parseChatAppearance(store.getSnapshot(bobRoomOne)).hidden, true);
  assert.equal(store.getSnapshot(null), null);
});

test("temporary status survives resubscription and stays scoped when returning to a conversation", () => {
  const adapter = createAdapter(new MemoryStorage());
  adapter.getStorage = () => { throw new Error("Storage is blocked"); };
  const store = createChatAppearanceStore(adapter);
  const first = chatAppearanceKey("alice", "room-1");
  const second = chatAppearanceKey("alice", "room-2");
  const otherAccount = chatAppearanceKey("bob", "room-1");
  const unsubscribe = store.subscribe(() => {});

  store.updateAppearance(first, { palette: "orchid" });
  unsubscribe();
  assert.equal(store.getTemporarySnapshot(second), false);
  assert.equal(store.getTemporarySnapshot(otherAccount), false);
  assert.equal(store.getTemporarySnapshot(null), false);
  const remounted = store.subscribe(() => {});
  assert.equal(store.getTemporarySnapshot(first), true);
  assert.equal(parseChatAppearance(store.getSnapshot(first)).palette, "orchid");
  remounted();
});

test("temporary status clears and notifies when the same choice can be persisted again", () => {
  const adapter = createAdapter(new MemoryStorage());
  const availableStorage = adapter.getStorage;
  adapter.getStorage = () => { throw new Error("Storage is blocked"); };
  const store = createChatAppearanceStore(adapter);
  const key = chatAppearanceKey("alice", "room-1");
  store.updateAppearance(key, { palette: "ember" });
  const raw = store.getSnapshot(key);
  const statuses: boolean[] = [];
  const unsubscribe = store.subscribe(() => statuses.push(store.getTemporarySnapshot(key)));
  adapter.getStorage = availableStorage;

  assert.equal(store.updateAppearance(key, { palette: "ember" }), true);
  assert.equal(store.getSnapshot(key), raw);
  assert.equal(store.getTemporarySnapshot(key), false);
  assert.deepEqual(statuses, [false]);
  unsubscribe();
});
