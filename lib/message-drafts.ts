type Draft = Readonly<{ text: string; revision: number }>;

type DraftSnapshot = Readonly<{
  accountId: string | null;
  drafts: ReadonlyMap<string, Draft>;
  sending: ReadonlySet<string>;
}>;

export const EMPTY_MESSAGE_DRAFTS: DraftSnapshot = {
  accountId: null, drafts: new Map(), sending: new Set(),
};

/** Memory only, owned by one mounted app. Never persist private text to storage. */
export function createMessageDraftStore() {
  let snapshot = EMPTY_MESSAGE_DRAFTS;
  let generation = 0;
  let revision = 0;
  const listeners = new Set<() => void>();
  const operations = new Map<string, symbol>();
  const publish = (next: DraftSnapshot) => {
    snapshot = next;
    listeners.forEach(listener => listener());
  };

  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    setAccount(accountId: string | null) {
      if (accountId === snapshot.accountId) return;
      generation += 1;
      operations.clear();
      publish({ accountId, drafts: new Map(), sending: new Set() });
    },
    write(accountId: string | null, conversationId: string | null, text: string) {
      if (!accountId || accountId !== snapshot.accountId || !conversationId) return;
      if ((snapshot.drafts.get(conversationId)?.text ?? "") === text) return;
      const drafts = new Map(snapshot.drafts);
      if (text) drafts.set(conversationId, { text, revision: ++revision });
      else drafts.delete(conversationId);
      publish({ ...snapshot, drafts });
    },
    /** Locks this destination across navigation; completion can only consume its captured revision. */
    beginSend(accountId: string, conversationId: string) {
      if (accountId !== snapshot.accountId || operations.has(conversationId)) return null;
      const captured = snapshot.drafts.get(conversationId);
      const epoch = generation;
      const operation = Symbol("draft-send");
      operations.set(conversationId, operation);
      publish({ ...snapshot, sending: new Set(operations.keys()) });
      return {
        text: captured?.text ?? "",
        complete(confirmed: boolean) {
          if (epoch !== generation || accountId !== snapshot.accountId || operations.get(conversationId) !== operation) return;
          operations.delete(conversationId);
          const drafts = new Map(snapshot.drafts);
          if (confirmed && captured && drafts.get(conversationId)?.revision === captured.revision) drafts.delete(conversationId);
          publish({ ...snapshot, drafts, sending: new Set(operations.keys()) });
        },
      };
    },
  };
}

export function visibleMessageDrafts(snapshot: DraftSnapshot, accountId: string | null) {
  return accountId && accountId === snapshot.accountId ? snapshot : EMPTY_MESSAGE_DRAFTS;
}
