/**
 * Tiny in-process pub/sub for SSE fan-out, keyed by user address.
 *
 * Good enough for a single Node instance (dev / a single Railway worker). For
 * multi-instance prod, swap the backing store for Postgres LISTEN/NOTIFY or a
 * broker (Redis/Ably/Supabase realtime) behind this same interface.
 */
type Listener = (event: { type: string; data: unknown }) => void;

const channels = new Map<string, Set<Listener>>();

export function subscribe(userAddress: string, listener: Listener): () => void {
  let set = channels.get(userAddress);
  if (!set) {
    set = new Set();
    channels.set(userAddress, set);
  }
  set.add(listener);
  return () => {
    set?.delete(listener);
    if (set && set.size === 0) channels.delete(userAddress);
  };
}

export function publish(userAddress: string, type: string, data: unknown): void {
  const set = channels.get(userAddress);
  if (!set) return;
  for (const listener of set) {
    try {
      listener({ type, data });
    } catch {
      // a broken listener shouldn't take down the others
    }
  }
}
