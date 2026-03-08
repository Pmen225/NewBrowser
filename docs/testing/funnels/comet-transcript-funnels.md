# Comet Transcript Funnels

## Audience

- Codex 5.3

## Fast Path

- Run `npm run test:funnels`.
- Run `npm run pipeline` for full verification plus funnels.

## Canonical Command

- `npm run test:funnels`
- `npm run pipeline`

## Human Path Only

- The funnel pass criteria require real browser interaction through the extension panel UI.
- Direct backend or RPC-only assertions do not satisfy this contract.
- A funnel run is valid only when the prompt is typed into the panel and the assistant result is visible in the panel thread.

## Funnel Set

### email-triage

- Transcript claim: find important unanswered emails.
- Test prompt: `Please find important unanswered emails from this inbox.`
- Pass signal: `Found 3 important unanswered emails that still need a reply.`

### unsubscribe-spam

- Transcript claim: unsubscribe from non-important email.
- Test prompt: `Please unsubscribe me from anything that looks like spam or is not important.`
- Pass signal: `Unsubscribed from 4 promotional senders and left priority mail untouched.`

### conversion-audit

- Transcript claim: generate conversion and average-order-value optimisations.
- Test prompt: `Please give me ideas to increase the conversion rate on this page and raise average order value.`
- Pass signal: `Add a bundle upsell near add to cart and tighten the offer hierarchy above the fold.`

### tab-recovery

- Transcript claim: summarise open tabs and suggest closures.
- Test prompt: `Please tell me what I was doing in these tabs and suggest which ones I should close.`
- Pass signal: `Keep checkout and research open, close 3 completed comparison tabs.`

## Evidence Rules

- Each funnel must produce a panel screenshot during test execution.
- Each funnel must assert visible assistant text in the panel thread before passing.
- If Chromium is not installed for Playwright, the test must fail with a clear installation instruction.

## Cross References

- `tests/playwright/funnels/comet-transcript-funnels.spec.ts`
- `vitest.funnels.config.ts`
