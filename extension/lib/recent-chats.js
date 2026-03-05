export const CHAT_SESSIONS_STORAGE_KEY = "ui.chatSessions";

const DEFAULT_STORE = {
  sessions: [],
  activeSessionId: null
};

function nowIso(value) {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  return new Date().toISOString();
}

function createId(idFactory) {
  const factory = typeof idFactory === "function" ? idFactory : () => `session-${Date.now()}`;
  return factory();
}

function normalizeMessage(raw) {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const id = typeof raw.id === "string" && raw.id.trim().length > 0 ? raw.id.trim() : "";
  const role = raw.role === "user" || raw.role === "assistant" ? raw.role : "";
  const text = typeof raw.text === "string" ? raw.text : "";
  const ts = typeof raw.ts === "string" && raw.ts.trim().length > 0 ? raw.ts.trim() : "";
  if (!id || !role || !ts) {
    return null;
  }

  const message = {
    id,
    role,
    text,
    ts
  };

  if (typeof raw.runId === "string" && raw.runId.trim().length > 0) {
    message.runId = raw.runId.trim();
  }
  if (raw.status === "queued" || raw.status === "running" || raw.status === "done" || raw.status === "error") {
    message.status = raw.status;
  }

  return message;
}

function normalizeSession(raw) {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const id = typeof raw.id === "string" && raw.id.trim().length > 0 ? raw.id.trim() : "";
  if (!id) {
    return null;
  }

  const createdAt = nowIso(raw.createdAt);
  const updatedAt = nowIso(raw.updatedAt);
  const title = typeof raw.title === "string" ? raw.title.trim() : "";

  const messages = Array.isArray(raw.messages)
    ? raw.messages.map(normalizeMessage).filter(Boolean)
    : [];

  return {
    id,
    title,
    createdAt,
    updatedAt,
    messages
  };
}

export function normalizeChatSessionsStore(raw) {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_STORE };
  }

  const sessions = Array.isArray(raw.sessions) ? raw.sessions.map(normalizeSession).filter(Boolean) : [];
  const activeSessionId = typeof raw.activeSessionId === "string" ? raw.activeSessionId.trim() : "";

  const hasActive = activeSessionId && sessions.some((session) => session.id === activeSessionId);
  return {
    sessions,
    activeSessionId: hasActive ? activeSessionId : null
  };
}

export function upsertChatSession(store, session) {
  const normalizedStore = normalizeChatSessionsStore(store);
  const normalizedSession = normalizeSession(session);
  if (!normalizedSession) {
    return normalizedStore;
  }

  const nextSessions = normalizedStore.sessions.filter((entry) => entry.id !== normalizedSession.id).concat([normalizedSession]);
  return {
    ...normalizedStore,
    sessions: nextSessions
  };
}

export function ensureActiveSession(store, options = {}) {
  const normalizedStore = normalizeChatSessionsStore(store);
  if (normalizedStore.activeSessionId) {
    return normalizedStore;
  }

  const now = nowIso(options.now);
  const id = createId(options.idFactory);
  const session = {
    id,
    title: "",
    createdAt: now,
    updatedAt: now,
    messages: []
  };

  return {
    sessions: [session].concat(normalizedStore.sessions),
    activeSessionId: id
  };
}

function deriveTitle(existingTitle, message) {
  if (typeof existingTitle === "string" && existingTitle.trim().length > 0) {
    return existingTitle.trim();
  }
  if (message.role !== "user") {
    return "";
  }
  const candidate = message.text.trim().replace(/\s+/g, " ").slice(0, 60);
  return candidate;
}

export function appendSessionMessage(store, sessionId, message, options = {}) {
  const normalizedStore = normalizeChatSessionsStore(store);
  const normalizedMessage = normalizeMessage(message);
  if (!normalizedMessage) {
    return normalizedStore;
  }

  const id = typeof sessionId === "string" ? sessionId.trim() : "";
  if (!id) {
    return normalizedStore;
  }

  const now = nowIso(options.now);
  const nextSessions = normalizedStore.sessions.map((session) => {
    if (session.id !== id) {
      return session;
    }

    const nextMessages = session.messages.concat([normalizedMessage]);
    return {
      ...session,
      title: deriveTitle(session.title, normalizedMessage),
      updatedAt: now,
      messages: nextMessages
    };
  });

  return {
    ...normalizedStore,
    activeSessionId: normalizedStore.activeSessionId ?? id,
    sessions: nextSessions
  };
}

export function pruneChatSessions(store, { maxSessions = 15, maxMessagesPerSession = 200 } = {}) {
  const normalizedStore = normalizeChatSessionsStore(store);
  const limitedSessions = normalizedStore.sessions
    .slice()
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, Math.max(0, maxSessions))
    .map((session) => ({
      ...session,
      messages: session.messages.slice(-Math.max(0, maxMessagesPerSession))
    }));

  const activeSessionId = normalizedStore.activeSessionId && limitedSessions.some((s) => s.id === normalizedStore.activeSessionId)
    ? normalizedStore.activeSessionId
    : limitedSessions[0]?.id ?? null;

  return {
    sessions: limitedSessions,
    activeSessionId
  };
}

