import { describe, expect, it, test } from "vitest";

import {
  buildAttachmentPromptPrefix,
  isReadableTextFile,
  readImportedAttachments
} from "../../extension/lib/file-import.js";

describe("file import helpers", () => {
  test.each([
    [{ name: "notes.md", type: "text/markdown" }, true],
    [{ name: "report.csv", type: "text/csv" }, true],
    [{ name: "payload.json", type: "application/json" }, true],
    [{ name: "screenshot.png", type: "image/png" }, false],
    [{ name: "archive.zip", type: "application/zip" }, false]
  ])("detects readable text files for %o", (fileLike, expected) => {
    expect(isReadableTextFile(fileLike)).toBe(expected);
  });

  it("reads supported files and builds a prompt prefix", async () => {
    const attachments = await readImportedAttachments([
      {
        name: "brief.txt",
        type: "text/plain",
        size: 42,
        async text() {
          return "First line\nSecond line";
        }
      },
      {
        name: "photo.png",
        type: "image/png",
        size: 12
      }
    ]);

    expect(attachments).toHaveLength(1);
    expect(attachments[0]).toMatchObject({
      source: "local",
      name: "brief.txt",
      mimeType: "text/plain",
      isTextReadable: true
    });
    expect(attachments[0].textContent).toBe("First line\nSecond line");

    const prefix = buildAttachmentPromptPrefix(attachments);
    expect(prefix).toContain("[Attached file: brief.txt]");
    expect(prefix).toContain("First line\nSecond line");
    expect(prefix.endsWith("\n\n")).toBe(true);
  });

  it("truncates oversized attachment content", async () => {
    const [attachment] = await readImportedAttachments(
      [
        {
          name: "huge.txt",
          type: "text/plain",
          async text() {
            return "x".repeat(32);
          }
        }
      ],
      { maxCharsPerAttachment: 10 }
    );

    expect(attachment.textContent).toBe("xxxxxxxxxx...");
  });
});
