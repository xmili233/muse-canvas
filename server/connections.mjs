import { randomBytes } from "node:crypto";

export const CONNECTION_IDLE_MS = 30 * 60 * 1000;

export function createConnectionStore({
  now = Date.now,
  idleMs = CONNECTION_IDLE_MS,
} = {}) {
  const sessions = new Map();
  const prune = () => {
    for (const [token, session] of sessions) {
      if (session.expiresAt <= now()) sessions.delete(token);
    }
  };
  return {
    create(connection) {
      prune();
      const token = randomBytes(32).toString("base64url");
      sessions.set(token, { ...connection, expiresAt: now() + idleMs });
      return token;
    },
    get(token) {
      const session = sessions.get(token);
      if (!session) return undefined;
      if (session.expiresAt <= now()) {
        sessions.delete(token);
        return undefined;
      }
      session.expiresAt = now() + idleMs;
      return session;
    },
    delete(token) {
      sessions.delete(token);
    },
    prune,
    get size() {
      return sessions.size;
    },
  };
}

export const connectionStore = createConnectionStore();
const cleanup = setInterval(connectionStore.prune, 60_000);
cleanup.unref();
