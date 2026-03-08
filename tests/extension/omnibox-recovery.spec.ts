import { describe, expect, it } from "vitest";

import {
  extractSearchRecoveryQuery,
  resolveCompletedTabRecovery,
  resolveOmniboxRecovery
} from "../../extension/lib/omnibox-recovery.js";

describe("omnibox recovery", () => {
  it("treats bare host DNS failures as search queries", () => {
    expect(resolveOmniboxRecovery({
      url: "https://google/",
      error: "ERR_NAME_NOT_RESOLVED"
    })).toEqual({
      query: "google",
      searchUrl: "https://www.google.com/search?q=google"
    });
  });

  it("folds path and query fragments into the recovery search", () => {
    expect(extractSearchRecoveryQuery("http://react/docs/hooks?mode=reference")).toBe("react docs hooks mode reference");
  });

  it("does not hijack dotted domains or localhost", () => {
    expect(resolveOmniboxRecovery({
      url: "https://google.com/",
      error: "ERR_NAME_NOT_RESOLVED"
    })).toBeNull();
    expect(resolveOmniboxRecovery({
      url: "http://localhost:3000/",
      error: "ERR_NAME_NOT_RESOLVED"
    })).toBeNull();
  });

  it("ignores subframe and non-resolution failures", () => {
    expect(resolveOmniboxRecovery({
      url: "https://youtube/",
      error: "ERR_CERT_AUTHORITY_INVALID"
    })).toBeNull();
    expect(resolveOmniboxRecovery({
      url: "https://youtube/",
      error: "ERR_NAME_NOT_RESOLVED",
      frameId: 2
    })).toBeNull();
  });

  it("recovers completed bare-host error pages when the title is still the hostname", () => {
    expect(resolveCompletedTabRecovery({
      url: "http://youtub/",
      title: "youtub",
      status: "complete"
    })).toEqual({
      query: "youtub",
      searchUrl: "https://www.google.com/search?q=youtub"
    });
  });

  it("does not hijack completed pages with a real title", () => {
    expect(resolveCompletedTabRecovery({
      url: "http://intranet/",
      title: "Team dashboard",
      status: "complete"
    })).toBeNull();
  });
});
