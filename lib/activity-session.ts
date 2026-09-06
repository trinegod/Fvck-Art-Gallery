import type { SupabaseClient } from "@supabase/supabase-js";

/** Client-side privacy boundary. RLS still decides which rows may be read/written. */
export function createAccountScope() {
  let accountId: string | null = null;
  let generation = 0;
  const requests = new Map<string, number>();
  return {
    setAccount(next: string | null) {
      if (next !== accountId) {
        accountId = next;
        generation += 1;
        requests.clear();
      }
    },
    clear() {
      accountId = null;
      generation += 1;
      requests.clear();
    },
    account() { return accountId; },
    capture(expectedAccount = accountId) {
      const captured = generation;
      return () => expectedAccount !== null && accountId === expectedAccount && generation === captured;
    },
    latest(key: string, expectedAccount = accountId) {
      const isAccountCurrent = this.capture(expectedAccount);
      if (!isAccountCurrent()) return () => false;
      const request = (requests.get(key) ?? 0) + 1;
      requests.set(key, request);
      return () => isAccountCurrent() && requests.get(key) === request;
    },
  };
}

export type AccountScope = ReturnType<typeof createAccountScope>;

/** A newer auth event wins over a slower startup getUser response. */
export function observeAccount(
  auth: Pick<SupabaseClient["auth"], "getUser" | "onAuthStateChange">,
  onAccount: (id: string | null) => void,
) {
  let active = true;
  let authRevision = 0;
  let resolved = false;
  const bootstrapRevision = authRevision;
  const bootstrap = auth.getUser();
  const { data } = auth.onAuthStateChange((_event, session) => {
    authRevision += 1;
    resolved = true;
    if (active) onAccount(session?.user.id ?? null);
  });
  void bootstrap.then(({ data: userData }) => {
    if (!active || authRevision !== bootstrapRevision) return;
    resolved = true;
    onAccount(userData.user?.id ?? null);
  }).catch(() => {
    if (active && authRevision === bootstrapRevision) {
      resolved = true;
      onAccount(null);
    }
  });
  const fallback = setTimeout(() => {
    // This is an empty access state, not an authoritative auth event: a late
    // successful bootstrap may still sign in if no newer event has arrived.
    if (active && !resolved) onAccount(null);
  }, 2200);
  return () => {
    active = false;
    clearTimeout(fallback);
    data.subscription.unsubscribe();
  };
}

export async function runAccountRequest<T>(
  scope: AccountScope,
  accountId: string,
  key: string,
  request: (isCurrent: () => boolean) => Promise<T>,
  commit: (value: T) => void,
  fail: (error: unknown) => void,
) {
  const isCurrent = scope.latest(key, accountId);
  if (!isCurrent()) return;
  try {
    const value = await request(isCurrent);
    if (isCurrent()) commit(value);
  } catch (error) {
    if (isCurrent()) fail(error);
  }
}
