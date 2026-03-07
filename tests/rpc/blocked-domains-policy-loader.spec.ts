import { describe, expect, it } from "vitest";

import { loadBlockedDomainsPolicyFromSystem, type BlockedDomainsPolicyLoaderDeps } from "../../sidecar/src/rpc/blocked-domains-policy-loader";

interface FsEntry {
  name: string;
  type: "file" | "dir";
}

function createDeps(input: {
  platform: NodeJS.Platform;
  files?: Record<string, string>;
  dirs?: Record<string, FsEntry[]>;
  execOutputs?: Record<string, string>;
}): BlockedDomainsPolicyLoaderDeps {
  const files = input.files ?? {};
  const dirs = input.dirs ?? {};
  const execOutputs = input.execOutputs ?? {};

  return {
    platform: input.platform,
    existsSync(path) {
      return path in files || path in dirs;
    },
    readFileSync(path) {
      const value = files[path];
      if (value === undefined) {
        throw new Error(`Missing file ${path}`);
      }
      return value;
    },
    readDirSync(path) {
      const entries = dirs[path];
      if (!entries) {
        throw new Error(`Missing dir ${path}`);
      }

      return entries.map((entry) => ({
        name: entry.name,
        isFile: () => entry.type === "file"
      }));
    },
    execFileSync(command, args) {
      const key = `${command} ${args.join(" ")}`;
      const output = execOutputs[key];
      if (output === undefined) {
        throw new Error(`Missing exec output for ${key}`);
      }
      return output;
    }
  };
}

describe("blocked domains system policy loader", () => {
  it("loads and merges Linux managed JSON policies", () => {
    const deps = createDeps({
      platform: "linux",
      dirs: {
        "/etc/chromium/policies/managed": [
          { name: "01-base.json", type: "file" },
          { name: "note.txt", type: "file" }
        ],
        "/etc/opt/chrome/policies/managed": [{ name: "02-extra.json", type: "file" }]
      },
      files: {
        "/etc/chromium/policies/managed/01-base.json": JSON.stringify({
          URLBlocklist: ["*", "example.com"],
          URLAllowlist: { "1": "example.com", "2": "internal.example.com" }
        }),
        "/etc/opt/chrome/policies/managed/02-extra.json": JSON.stringify({
          URLBlocklist: ["chrome://*", "example.com"],
          URLAllowlist: ["internal.example.com", "docs.example.com"]
        })
      }
    });

    const policy = loadBlockedDomainsPolicyFromSystem({
      forceReload: true,
      deps
    });

    expect(policy).toEqual({
      blocklist: ["*", "example.com", "chrome://*"],
      allowlist: ["example.com", "internal.example.com", "docs.example.com"]
    });
  });

  it("loads macOS managed plist/json policies", () => {
    const deps = createDeps({
      platform: "darwin",
      files: {
        "/Library/Managed Preferences/com.google.Chrome.plist": "",
        "/Library/Managed Preferences/com.google.Chrome.json": JSON.stringify({
          URLBlocklist: ["*"],
          URLAllowlist: ["example.com"]
        }),
        "/Library/Managed Preferences/org.chromium.Chromium.plist": ""
      },
      execOutputs: {
        "plutil -convert json -o - /Library/Managed Preferences/com.google.Chrome.plist": JSON.stringify({
          URLBlocklist: ["file://*"],
          URLAllowlist: ["file://*"]
        }),
        "plutil -convert json -o - /Library/Managed Preferences/org.chromium.Chromium.plist": JSON.stringify({
          URLAllowlist: ["chromium.org"]
        })
      }
    });

    const policy = loadBlockedDomainsPolicyFromSystem({
      forceReload: true,
      deps
    });

    expect(policy).toEqual({
      blocklist: ["file://*", "*"],
      allowlist: ["file://*", "example.com", "chromium.org"]
    });
  });

  it("loads Windows registry direct values and numbered list keys", () => {
    const root = "HKLM\\Software\\Policies\\Google\\Chrome";
    const deps = createDeps({
      platform: "win32",
      execOutputs: {
        [`reg query ${root} /v URLBlocklist`]: `
HKEY_LOCAL_MACHINE\\Software\\Policies\\Google\\Chrome
    URLBlocklist    REG_SZ    *
`,
        [`reg query ${root} /v URLAllowlist`]: `
HKEY_LOCAL_MACHINE\\Software\\Policies\\Google\\Chrome
    URLAllowlist    REG_MULTI_SZ    example.com\\0intranet.example
`,
        [`reg query ${root}\\URLBlocklist`]: `
HKEY_LOCAL_MACHINE\\Software\\Policies\\Google\\Chrome\\URLBlocklist
    1    REG_SZ    chrome://*
    2    REG_SZ    file://*
`,
        [`reg query ${root}\\URLAllowlist`]: `
HKEY_LOCAL_MACHINE\\Software\\Policies\\Google\\Chrome\\URLAllowlist
    1    REG_SZ    docs.example.com
`
      }
    });

    const policy = loadBlockedDomainsPolicyFromSystem({
      forceReload: true,
      deps
    });

    expect(policy).toEqual({
      blocklist: ["*", "chrome://*", "file://*"],
      allowlist: ["example.com", "intranet.example", "docs.example.com"]
    });
  });

  it("returns empty policy on unsupported platforms", () => {
    const policy = loadBlockedDomainsPolicyFromSystem({
      forceReload: true,
      deps: createDeps({
        platform: "freebsd"
      })
    });

    expect(policy).toEqual({
      blocklist: [],
      allowlist: []
    });
  });

  it("returns a cloned cached policy to prevent external mutation", () => {
    const deps = createDeps({
      platform: "linux",
      dirs: {
        "/etc/chromium/policies/managed": [{ name: "policy.json", type: "file" }]
      },
      files: {
        "/etc/chromium/policies/managed/policy.json": JSON.stringify({
          URLBlocklist: ["*"],
          URLAllowlist: ["example.com"]
        })
      }
    });

    const first = loadBlockedDomainsPolicyFromSystem({
      forceReload: true,
      deps
    });
    first.blocklist?.push("MUTATED");

    const second = loadBlockedDomainsPolicyFromSystem({
      deps
    });

    expect(second.blocklist).toEqual(["*"]);
  });
});
