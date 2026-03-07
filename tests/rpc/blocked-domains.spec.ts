import { describe, expect, it } from "vitest";

import { evaluateBlockedNavigation, type BlockedDomainsPolicy } from "../../sidecar/src/rpc/blocked-domains";

describe("blocked domains policy engine", () => {
  it("rejects hostname wildcard patterns inside hosts", () => {
    const policy: BlockedDomainsPolicy = {
      blocklist: ["*.example.com"]
    };

    const subdomain = evaluateBlockedNavigation("https://pay.example.com/checkout", policy);
    const apex = evaluateBlockedNavigation("https://example.com/checkout", policy);

    expect(subdomain.allowed).toBe(true);
    expect(apex.allowed).toBe(true);
  });

  it("allows explicit exceptions over global blocklist", () => {
    const policy: BlockedDomainsPolicy = {
      blocklist: ["*"],
      allowlist: ["example.com"]
    };

    const allowed = evaluateBlockedNavigation("https://example.com/", policy);
    const blocked = evaluateBlockedNavigation("https://other-domain.dev/path", policy);

    expect(allowed).toMatchObject({
      allowed: true,
      matched_rule: "example.com",
      matched_list: "allowlist"
    });
    expect(blocked).toMatchObject({
      allowed: false,
      matched_rule: "*",
      matched_list: "blocklist"
    });
  });

  it("hard-blocks chrome/file schemes unless explicitly allowed", () => {
    const blockedChrome = evaluateBlockedNavigation("chrome://flags", {});
    const blockedFile = evaluateBlockedNavigation("file:///tmp/report.txt", {});

    expect(blockedChrome).toMatchObject({
      allowed: false,
      matched_rule: "chrome://*",
      matched_list: "hard_block"
    });
    expect(blockedFile).toMatchObject({
      allowed: false,
      matched_rule: "file://*",
      matched_list: "hard_block"
    });

    const allowedChrome = evaluateBlockedNavigation("chrome://flags", {
      allowlist: ["chrome://*"]
    });
    const allowedFile = evaluateBlockedNavigation("file:///tmp/report.txt", {
      allowlist: ["file://*"]
    });

    expect(allowedChrome).toMatchObject({
      allowed: true,
      matched_rule: "chrome://*",
      matched_list: "allowlist"
    });
    expect(allowedFile).toMatchObject({
      allowed: true,
      matched_rule: "file://*",
      matched_list: "allowlist"
    });
  });

  it("does not let low-specificity allowlist override hard-block schemes", () => {
    const decision = evaluateBlockedNavigation("chrome://flags", {
      allowlist: ["*"]
    });

    expect(decision).toMatchObject({
      allowed: false,
      matched_rule: "chrome://*",
      matched_list: "hard_block"
    });
  });

  it("matches host rules case-insensitively and includes subdomains by default", () => {
    const policy: BlockedDomainsPolicy = {
      blocklist: ["example.com"]
    };

    const apex = evaluateBlockedNavigation("https://example.com/", policy);
    const subdomain = evaluateBlockedNavigation("https://WWW.Example.com/path", policy);

    expect(apex).toMatchObject({
      allowed: false,
      matched_rule: "example.com",
      matched_list: "blocklist"
    });
    expect(subdomain).toMatchObject({
      allowed: false,
      matched_rule: "example.com",
      matched_list: "blocklist"
    });
  });

  it("supports scheme wildcard patterns", () => {
    const policy: BlockedDomainsPolicy = {
      blocklist: ["*://example.com"]
    };

    const http = evaluateBlockedNavigation("http://example.com/path", policy);
    const https = evaluateBlockedNavigation("https://example.com/path", policy);

    expect(http).toMatchObject({
      allowed: false,
      matched_rule: "*://example.com",
      matched_list: "blocklist"
    });
    expect(https).toMatchObject({
      allowed: false,
      matched_rule: "*://example.com",
      matched_list: "blocklist"
    });
  });

  it("supports exact-host dot-prefix rules", () => {
    const policy: BlockedDomainsPolicy = {
      blocklist: ["example.com"],
      allowlist: [".example.com"]
    };

    const exactHost = evaluateBlockedNavigation("https://example.com/allow", policy);
    const subdomain = evaluateBlockedNavigation("https://www.example.com/block", policy);

    expect(exactHost).toMatchObject({
      allowed: true,
      matched_rule: ".example.com",
      matched_list: "allowlist"
    });
    expect(subdomain).toMatchObject({
      allowed: false,
      matched_rule: "example.com",
      matched_list: "blocklist"
    });
  });

  it("applies case-sensitive path and query matching", () => {
    const policy: BlockedDomainsPolicy = {
      blocklist: ["https://example.com/Path?Case=Yes"]
    };

    const exact = evaluateBlockedNavigation("https://EXAMPLE.com/Path?Case=Yes", policy);
    const pathCaseMismatch = evaluateBlockedNavigation("https://example.com/path?Case=Yes", policy);
    const queryCaseMismatch = evaluateBlockedNavigation("https://example.com/Path?case=Yes", policy);

    expect(exact).toMatchObject({
      allowed: false,
      matched_rule: "https://example.com/Path?Case=Yes",
      matched_list: "blocklist"
    });
    expect(pathCaseMismatch.allowed).toBe(true);
    expect(queryCaseMismatch.allowed).toBe(true);
  });

  it("uses full rule specificity to resolve allowlist/blocklist precedence", () => {
    const policy: BlockedDomainsPolicy = {
      blocklist: ["example.com/path?x=1"],
      allowlist: ["sub.example.com"]
    };

    const decision = evaluateBlockedNavigation("https://sub.example.com/path?x=1", policy);

    expect(decision).toMatchObject({
      allowed: false,
      matched_rule: "example.com/path?x=1",
      matched_list: "blocklist"
    });
  });

  it("treats duplicate query keys with allowlist strictness", () => {
    const policy: BlockedDomainsPolicy = {
      blocklist: ["*"],
      allowlist: ["https://youtube.com/watch?v=V2"]
    };

    const blockedMixed = evaluateBlockedNavigation("https://youtube.com/watch?v=V1&v=V2", policy);
    const allowedUniform = evaluateBlockedNavigation("https://youtube.com/watch?v=V2&v=V2", policy);

    expect(blockedMixed).toMatchObject({
      allowed: false,
      matched_rule: "*",
      matched_list: "blocklist"
    });
    expect(allowedUniform).toMatchObject({
      allowed: true,
      matched_rule: "https://youtube.com/watch?v=V2",
      matched_list: "allowlist"
    });
  });

  it("parses @ query delimiter for key-only tokens", () => {
    const policy: BlockedDomainsPolicy = {
      blocklist: ["example.com@token"]
    };

    const matched = evaluateBlockedNavigation("https://example.com/path?token=1", policy);
    const missed = evaluateBlockedNavigation("https://example.com/path?other=1", policy);

    expect(matched).toMatchObject({
      allowed: false,
      matched_rule: "example.com@token",
      matched_list: "blocklist"
    });
    expect(missed.allowed).toBe(true);
  });

  it("ignores invalid custom-scheme host-specific patterns but accepts wildcard custom patterns", () => {
    const policy: BlockedDomainsPolicy = {
      blocklist: ["myapp://example.com", "myapp://*"]
    };

    const blockedByValidRule = evaluateBlockedNavigation("myapp://example.com/path", policy);
    const blockedByValidWildcard = evaluateBlockedNavigation("myapp://other-host/path", policy);

    expect(blockedByValidRule).toMatchObject({
      allowed: false,
      matched_rule: "myapp://*",
      matched_list: "blocklist"
    });
    expect(blockedByValidWildcard).toMatchObject({
      allowed: false,
      matched_rule: "myapp://*",
      matched_list: "blocklist"
    });
  });

  it("does not apply invalid custom-scheme host-specific patterns on their own", () => {
    const policy: BlockedDomainsPolicy = {
      blocklist: ["myapp://example.com"]
    };

    const decision = evaluateBlockedNavigation("myapp://example.com/path", policy);
    expect(decision.allowed).toBe(true);
  });

  it("rejects invalid or non-absolute URLs as INVALID_REQUEST", () => {
    try {
      evaluateBlockedNavigation("/relative/path", {});
      throw new Error("Expected INVALID_REQUEST error");
    } catch (error) {
      expect(error).toMatchObject({
        code: "INVALID_REQUEST",
        retryable: false,
        details: { field: "url" }
      });
    }
  });

  it("normalizes protocol-less host URLs to https", () => {
    const decision = evaluateBlockedNavigation("example.com/docs?q=1", {
      blocklist: ["https://example.com/docs?q=1"]
    });

    expect(decision).toMatchObject({
      allowed: false,
      normalized_url: "https://example.com/docs?q=1",
      hostname: "example.com",
      matched_rule: "https://example.com/docs?q=1",
      matched_list: "blocklist"
    });
  });

  it("is deterministic for identical input", () => {
    const policy: BlockedDomainsPolicy = {
      blocklist: ["*"],
      allowlist: ["example.com"]
    };

    const one = evaluateBlockedNavigation("https://example.com/path?a=1", policy);
    const two = evaluateBlockedNavigation("https://example.com/path?a=1", policy);
    expect(one).toEqual(two);
  });
});
