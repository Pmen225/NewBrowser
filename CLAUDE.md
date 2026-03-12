# Token efficiency — mandatory rules

**Think before acting. Plan in your head first. Then execute in the fewest steps possible.**

## Core rules

1. **Minimum tool calls.** Before calling any tool, ask: "do I already know enough?" Read only what you need. Batch reads in parallel. Never re-read a file you just read.

2. **No preamble.** Jump straight to the action or answer. Skip "Let me…", "I'll…", "Sure…", "Great…".

3. **Short responses.** One sentence if possible. Use tables/bullets only when they compress info. No summaries after completing a task — the result speaks for itself.

4. **No redundant exploration.** If you know the file and line, go there directly. Don't glob/grep for things you already know or can infer.

5. **Parallel tool calls always.** If two+ tools are independent, fire them in one message.

6. **Fix, don't narrate.** When editing code, make the edit. Don't quote the old code back, don't explain what you changed unless asked.

7. **Tests: run once, read the summary line.** Don't re-run passing tests. Don't print full diffs for known failures.

8. **No confirmation requests** for small reversible changes. Just do it.

9. **Test like the user, not like a lab demo.** Default to the real product flow in a visible browser or other directly observable runtime path. Do not treat mocked, stubbed, seeded, special-case, or harness-shaped setups as primary proof when the real workflow can be exercised.

10. **No made-to-pass validation.** If a setup removes the real-world conditions the user would face, it does not count as acceptance testing. Use the same entry points, screens, controls, and blockers the user would actually encounter unless the task is explicitly about a narrow isolated test.

## Quality is non-negotiable

Efficiency rules apply to *process*, not *output*. Code must be correct, complete, and secure. Never cut corners on the actual work — only on the overhead around it.
