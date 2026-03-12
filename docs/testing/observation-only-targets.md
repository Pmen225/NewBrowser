# Observation-Only Targets

This file is not a canonical benchmark input.

It is a planning list for real-world sites the user cares about, but that are not yet promoted into:

- `bench/targets.yaml`
- `bench/tasks.yaml`

Until a site is promoted into those canonical files, agents must treat it as observation-only.

## Global Safety Rules

Allowed:

- open a site
- navigate between pages
- read visible content
- summarize state
- identify controls, forms, and next steps
- explain what a page does
- locate where an action would happen

Forbidden without a future task-specific workflow and explicit user approval:

- send
- submit
- apply
- save
- publish
- delete
- approve
- invite
- activate roles
- change settings
- grant or remove permissions
- create or close tickets
- send email or chat messages
- upload files
- change ads, campaigns, websites, or tenant configuration

For work and admin portals, default behavior is:

- read-only
- navigation-only
- summarize-only
- locate-controls-only

## Promotion Rule

A site listed here is only a planned safe-read target.

It does not become an active QA or runtime-improvement obligation until it is added to:

- `bench/targets.yaml`
- `bench/tasks.yaml`

## Work And Admin Portals

Highest risk. Treat all of these as read-only unless a future workflow explicitly says otherwise.

| Platform | Notes / URL |
|---|---|
| Microsoft 365 admin centers | Includes all tenant admin centers; observation-only |
| SharePoint admin center | Observation-only |
| Azure Portal | Observation-only |
| Outlook Web | `https://outlook.cloud.microsoft.mcas.ms/mail/` |
| Outlook Calendar | `https://outlook.cloud.microsoft.mcas.ms/calendar/view/week` |
| Microsoft 365 Chat / Teams-adjacent web surface | `https://m365.cloud.microsoft.mcas.ms/chat/...` |
| Microsoft Teams web | Observation-only |
| Excel Online | Observation-only |
| Word Online | Observation-only |
| ServiceDesk (Health Foundation) | `https://servicedesk.health.org.uk/home` |
| Kocho N-able | `https://kocho.n-able.com/login` |
| N-able N-Central | Observation-only |
| Mimecast Admin | `https://login-uk.mimecast.com/admin#/home` |
| Google Ads | Observation-only |
| Bing Ads / Microsoft Ads | Observation-only |
| Marketing web tools and websites | Observation-only |
| n8n | Observation-only |

## Communication And Collaboration

Read-only unless and until there is a task-specific safe workflow.

| Platform | Notes / URL |
|---|---|
| Outlook | Includes Microsoft cloud URLs above |
| Gmail | Observation-only |
| Microsoft Teams | Observation-only |
| Notion | Observation-only |
| SharePoint | Observation-only |
| ChatGPT | Observation-only |
| Perplexity | Observation-only |
| Grok | Observation-only |
| Google AI Studio | Observation-only |
| NotebookLM | `https://notebooklm.google.com/...` |
| GitHub | Observation-only by default |

## Job Hunting Sites

Especially sensitive because "apply" is explicitly forbidden in observation-only mode.

| Platform | Notes / URL |
|---|---|
| LinkedIn | Observation-only; no applying, messaging, or profile edits |
| Indeed | Includes `indeed.co.uk`; observation-only |
| Totaljobs | Observation-only |
| Reed | Observation-only |
| CV-Library | Observation-only |
| General job hunting sites / job applications | Observation-only research and navigation only |

## Research, Social, And Search

Lower operational risk, but still observation-only until promoted into canonical tasks.

| Platform | Notes / URL |
|---|---|
| Reddit | Observation-only |
| YouTube | Observation-only |
| Twitter / X | Observation-only |
| Google Search | Observation-only |
| Perplexity | Listed above; deduplicated |
| ChatGPT | Listed above; deduplicated |
| Grok | Listed above; deduplicated |
| NotebookLM | Listed above; deduplicated |
| Pluralsight | Observation-only |

## Website And Creative Tools

Potentially write-capable. Keep strictly read-only.

| Platform | Notes / URL |
|---|---|
| Wix | No edits or publishing |
| Canva | `https://www.canva.com` |
| Marketing sites and web tools | No edits, no publish, no campaign changes |

## User-Supplied Exact URLs

Keep these intact for future safe-read workflows.

- `https://kocho.n-able.com/login`
- `https://servicedesk.health.org.uk/home`
- `https://login-uk.mimecast.com/admin#/home`
- `https://outlook.cloud.microsoft.mcas.ms/mail/`
- `https://outlook.cloud.microsoft.mcas.ms/calendar/view/week`
- `https://outlook.cloud.microsoft.mcas.ms/host/b5abf2ae-c16b-4310-8f8a-d3bcdb52f162/entity1-d870f6cd-4aa5-4d42-9626-ab690c041429`
- `https://m365.cloud.microsoft.mcas.ms/chat/?from=PortalHome&auth=2&origindomain=microsoft365&client-request-id=8dc6657e-4ce6-09e7-3d13-c50dccebf433&fromCode=CsrToSSR`
- `https://notebooklm.google.com/?icid=home_maincta&_gl=1*1uk344o*_ga*MjI2MzEzODc2LjE3NzIxNDU5MTk.*_ga_W0LDH41ZCB*czE3NzMxNzA1ODgkbzckZzAkdDE3NzMxNzA1ODgkajYwJGwwJGgw`
- `https://www.canva.com`

## Next Safe Step

When one of these sites needs real automation coverage, promote it by:

1. defining the site in `bench/targets.yaml`
2. defining observation-safe tasks in `bench/tasks.yaml`
3. defining visible evidence requirements
4. documenting any extra guardrails before another agent is allowed to run it
