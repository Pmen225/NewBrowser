import { describe, expect, it } from "vitest";

import {
  appendSessionMessage,
  clearActiveSession,
  ensureActiveSession,
  normalizeChatSessionsStore,
  pruneChatSessions,
  upsertChatSession
} from "../../extension/lib/recent-chats.js";

describe("recent chats store", () => {
  it("normalizes unknown values into a safe store", () => {
    expect(normalizeChatSessionsStore(null)).toEqual({
      sessions: [],
      activeSessionId: null
    });
    expect(normalizeChatSessionsStore({ activeSessionId: "x" })).toEqual({
      sessions: [],
      activeSessionId: null
    });
  });

  it("ensures an active session exists and remains stable", () => {
    const now = "2026-03-02T10:00:00.000Z";
    const store = ensureActiveSession({ sessions: [], activeSessionId: null }, {
      now,
      idFactory: () => "session-1"
    });

    expect(store.activeSessionId).toBe("session-1");
    expect(store.sessions).toHaveLength(1);
    expect(store.sessions[0]).toMatchObject({
      id: "session-1",
      createdAt: now,
      updatedAt: now
    });

    const again = ensureActiveSession(store, { now, idFactory: () => "session-2" });
    expect(again.activeSessionId).toBe("session-1");
    expect(again.sessions).toHaveLength(1);
  });

  it("appends messages, updates titles, and prunes deterministically", () => {
    const now = "2026-03-02T10:00:00.000Z";
    const store = ensureActiveSession({ sessions: [], activeSessionId: null }, {
      now,
      idFactory: () => "session-1"
    });

    const withUser = appendSessionMessage(store, "session-1", {
      id: "m1",
      role: "user",
      text: "Summarize this page",
      ts: now
    }, { now });

    expect(withUser.sessions[0].title).toBe("Summarize this page");
    expect(withUser.sessions[0].messages).toHaveLength(1);

    const withAssistant = appendSessionMessage(withUser, "session-1", {
      id: "m2",
      role: "assistant",
      text: "Working...",
      ts: "2026-03-02T10:01:00.000Z",
      status: "running"
    }, { now: "2026-03-02T10:01:00.000Z" });

    expect(withAssistant.sessions[0].messages).toHaveLength(2);
    expect(withAssistant.sessions[0].updatedAt).toBe("2026-03-02T10:01:00.000Z");

    const session2 = upsertChatSession(withAssistant, {
      id: "session-2",
      title: "Other",
      createdAt: "2026-03-01T10:00:00.000Z",
      updatedAt: "2026-03-02T09:00:00.000Z",
      messages: []
    });

    const pruned = pruneChatSessions(session2, { maxSessions: 1, maxMessagesPerSession: 1 });
    expect(pruned.sessions).toHaveLength(1);
    expect(pruned.sessions[0].id).toBe("session-1");
    expect(pruned.sessions[0].messages).toHaveLength(1);
  });

  it("assigns generated ids to bare panel turns", () => {
    const base = ensureActiveSession({ sessions: [], activeSessionId: null }, {
      now: "2026-03-02T10:00:00.000Z",
      idFactory: () => "session-1"
    });

    const withUser = appendSessionMessage(base, "session-1", {
      role: "user",
      text: "hello",
      ts: "2026-03-02T10:00:00.000Z"
    }, {
      idFactory: () => "message-1",
      now: "2026-03-02T10:00:00.000Z"
    });

    const withAssistant = appendSessionMessage(withUser, "session-1", {
      role: "assistant",
      text: "hi",
      ts: "2026-03-02T10:01:00.000Z"
    }, {
      idFactory: () => "message-2",
      now: "2026-03-02T10:01:00.000Z"
    });

    expect(withAssistant.sessions[0].messages).toEqual([
      {
        id: "message-1",
        role: "user",
        text: "hello",
        ts: "2026-03-02T10:00:00.000Z"
      },
      {
        id: "message-2",
        role: "assistant",
        text: "hi",
        ts: "2026-03-02T10:01:00.000Z"
      }
    ]);
  });

  it("clears the active session without deleting chat history", () => {
    const store = {
      activeSessionId: "session-1",
      sessions: [
        {
          id: "session-1",
          title: "Find oldest YouTube video",
          createdAt: "2026-03-02T10:00:00.000Z",
          updatedAt: "2026-03-02T10:02:00.000Z",
          messages: [
            {
              id: "message-1",
              role: "user",
              text: "Find the oldest video on YouTube",
              ts: "2026-03-02T10:00:00.000Z"
            }
          ]
        }
      ]
    };

    expect(clearActiveSession(store)).toEqual({
      activeSessionId: null,
      sessions: store.sessions
    });
  });
});
