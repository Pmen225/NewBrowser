import { describe, expect, it } from "vitest";

import { buildEmailDraftCardMarkup, deriveDraftInsertState } from "../../extension/panel.js";

describe("email draft artifact helpers", () => {
  it("marks the card ready when both subject and body targets exist", () => {
    expect(
      deriveDraftInsertState({
        subject: { targetId: "subject-1" },
        body: { targetId: "body-1" }
      })
    ).toMatchObject({
      canInsert: true,
      mode: "subject_and_body",
      statusLabel: "Ready to insert"
    });
  });

  it("marks the card as needing page focus when no targets exist", () => {
    expect(deriveDraftInsertState(undefined)).toMatchObject({
      canInsert: false,
      mode: "none",
      statusLabel: "Refocus page fields"
    });
  });

  it("renders a compact email draft card with insert and copy actions", () => {
    const markup = buildEmailDraftCardMarkup(
      {
        kind: "email",
        subject: "Accessing David Finch's calendar",
        body_markdown: "- Open Outlook\n- Go to **Calendar**",
        body_text: "Open Outlook\nGo to Calendar"
      },
      {
        canInsert: true,
        mode: "subject_and_body",
        statusLabel: "Ready to insert"
      }
    );

    expect(markup).toContain("Email");
    expect(markup).toContain("Accessing David Finch's calendar");
    expect(markup).toContain("Ready to insert");
    expect(markup).toContain("Insert");
    expect(markup).toContain("Copy");
    expect(markup).toContain("draft-card");
  });
});
