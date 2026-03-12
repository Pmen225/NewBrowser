STEP 1

UNDERSTAND THAT YOU WILL Keep iterating 5 times using these as guides.
YOU WILL SENSE CHECK YOUR IMPLIMENTATION  imm give you examples.

# EXAMPLE 1 

If there is a settings button in the browser there is no point placing setting button on the side car of the ai agent assistant its more intuitive to place all settings in one place in the browser itself even for the agent.

# Example 2

Side car has start and stop button when AI agent is controlling the page. There is an overlay with beautiful animation indicating the user the AI is controlling the browser. It comes with a pill shaped card which has the options take control and stop.

It therefore makes no sense to add place or have thow additional the buttons of pause and stop in the ai thinking card animation within the side car. Its totaly redundant. this is why you sense check in plan by investigating before you impliment. Furthermore the side car also has a stop button to stop the agent from processing the prompt which is there to stay and functions for both prompt and agentic actions.


# UI Guidelines
READ FIGMA GUIDANCE OR DO NOT PROCEED TO STEP 2!

Figma contains the following for UI and UX:

- Color
- Typography
- Iconography
- Spacing
- Inline cards
- Inline carousel
- Fullscreen
- Inspector
- PIP
- layers of UI elements you WILL USE as examples or COPY.

FIGMA LINK: https://www.figma.com/design/YhescLnJRV2iclo57Uzn7i/Apps-in-ChatGPT-%E2%80%A2-Components---Templates--Community-?node-id=2100-26495&p=f&t=RnnzEvAojLDoytPN-0

STEP 2
## Overview

Apps are developer-built experiences that are available in ChatGPT. They extend what users can do without breaking the flow of conversation, appearing through lightweight cards, carousels, fullscreen views, and other display modes that integrate seamlessly into ChatGPT’s interface.

Before you start designing your app visually, make sure you have reviewed our
  recommended [UX principles](https://developers.openai.com/apps-sdk/concepts/ux-principles).


# UX principles

## Overview

Creating a great ChatGPT app is about delivering a focused, conversational experience that feels native to ChatGPT.

The goal is to design experiences that feel consistent and useful while extending what you can do in ChatGPT conversations in ways that add real value.

Good examples include booking a ride, ordering food, checking availability, or tracking a delivery. These are tasks that are conversational, time bound, and easy to summarize visually with a clear call to action. Poor examples include replicating long form content from a website, requiring complex multi step workflows, or using the space for ads or irrelevant messaging.

Use the UX principles below to guide your development.

## Principles for great app UX

An app should do at least one thing _better_ because it lives in ChatGPT:

- **Conversational leverage** – natural language, thread context, and multi-turn guidance unlock workflows that traditional UI cannot.
- **Native fit** – the app feels embedded in ChatGPT, with seamless hand-offs between the model and your tools.
- **Composability** – actions are small, reusable building blocks that the model can mix with other apps to complete richer tasks.

If you cannot describe the clear benefit of running inside ChatGPT, keep iterating before publishing your app.

On the other hand, your app should also _improve the user experience_ in ChatGPT by either providing something new to know, new to do, or a better way to show information.

Below are a few principles you should follow to help ensure your app is a great fit for ChatGPT.

### 1. Extract, don’t port

Focus on the core jobs users use your product for. Instead of mirroring your full website or native app, identify a few atomic actions that can be extracted as tools. Each tool should expose the minimum inputs and outputs needed for the model to take the next step confidently.

### 2. Design for conversational entry

Expect users to arrive mid-conversation, with a specific task in mind, or with fuzzy intent.
Your app should support:

- Open-ended prompts (e.g. "Help me plan a team offsite").
- Direct commands (e.g. "Book the conference room Thursday at 3pm").
- First-run onboarding (teach new users how to engage through ChatGPT).

### 3. Design for the ChatGPT environment

ChatGPT provides the conversational surface. Use your UI selectively to clarify actions, capture inputs, or present structured results. Skip ornamental components that do not advance the current task, and lean on the conversation for relevant history, confirmation, and follow-up.

### 4. Optimize for conversation, not navigation

The model handles state management and routing. Your app supplies:

- Clear, declarative actions with well-typed parameters.
- Concise responses that keep the chat moving (tables, lists, or short paragraphs instead of dashboards).
- Helpful follow-up suggestions so the model can keep the user in flow.

### 5. Embrace the ecosystem moment

Highlight what is unique about your app inside ChatGPT:

- Accept rich natural language instead of form fields.
- Personalize with relevant context gleaned from the conversation.
- (Optional) Compose with other apps when it saves the user time or cognitive load.

## Checklist before publishing

Answer these yes/no questions before publishing your app. A “no” signals an opportunity to improve your app and have a chance at broader distribution once we open up app submissions later this year.

However, please note that we will evaluate each app on a case-by-case basis, and that answering "yes" to all of these questions does not guarantee that your app will be selected for distribution: it's only a baseline to help your app be a great fit for ChatGPT.

To learn about strict requirements for publishing your app, see the [App
  Submission Guidelines](https://developers.openai.com/apps-sdk/app-submission-guidelines).

- **Conversational value** – Does at least one primary capability rely on ChatGPT’s strengths (natural language, conversation context, multi-turn dialog)?
- **Beyond base ChatGPT** – Does the app provide new knowledge, actions, or presentation that users cannot achieve without it (e.g., proprietary data, specialized UI, or a guided flow)?
- **Atomic, model-friendly actions** – Are tools indivisible, self-contained, and defined with explicit inputs and outputs so the model can invoke them without clarifying questions?
- **Helpful UI only** – Would replacing every custom widget with plain text meaningfully degrade the user experience?
- **End-to-end in-chat completion** – Can users finish at least one meaningful task without leaving ChatGPT or juggling external tabs?
- **Performance & responsiveness** – Does the app respond quickly enough to maintain the rhythm of a chat?
- **Discoverability** – Is it easy to imagine prompts where the model would select this app confidently?
- **Platform fit** – Does the app take advantage of core platform behaviors (rich prompts, prior context, multi-tool composition, multimodality, or memory)?

Additionally, ensure that you avoid:

- Displaying **long-form or static content** better suited for a website or app.
- Requiring **complex multi-step workflows** that exceed the inline or fullscreen display modes.
- Using the space for **ads, upsells, or irrelevant messaging**.
- Surfacing **sensitive or private information** directly in a card where others might see it.
- **Duplicating ChatGPT’s system functions** (for example, recreating the input composer).

### Next steps

Once you have made sure your app has great UX, you can polish your app's UI by following our recommendations in the [UI guidelines](https://developers.openai.com/apps-sdk/concepts/ui-guidelines).
![Example apps in the ChatGPT mobile interface](https://developers.openai.com/images/apps-sdk/overview.png)

## Design system

To help you design high quality apps that feel native to ChatGPT, you can use the [Apps SDK UI](https://openai.github.io/apps-sdk-ui/) design system.

It provides styling foundations with Tailwind, CSS variable design tokens, and a library of well-crafted, accessible components.

Using the Apps SDK UI is not a requirement to build your app, but it will make building an app for ChatGPT faster and easier, in a way that is consistent with the ChatGPT design system.

Before diving into code, start designing with our [Figma component
  library](https://www.figma.com/community/file/1560064615791108827/apps-in-chatgpt-components-templates)

## Display modes

Display modes are the surfaces developers use to create experiences for apps in ChatGPT. They allow partners to show content and actions that feel native to conversation. Each mode is designed for a specific type of interaction, from quick confirmations to immersive workflows.

Using these consistently helps experiences stay simple and predictable.

### Inline

The inline display mode appears directly in the flow of the conversation. Inline surfaces currently always appear before the generated model response. Every app initially appears inline.

![Examples of inline cards and carousels in ChatGPT](https://developers.openai.com/images/apps-sdk/inline_display_mode.png)

**Layout**

- **Icon & tool call**: A label with the app name and icon.
- **Inline display**: A lightweight display with app content embedded above the model response.
- **Follow-up**: A short, model-generated response shown after the widget to suggest edits, next steps, or related actions. Avoid content that is redundant with the card.

#### Inline card

Lightweight, single-purpose widgets embedded directly in conversation. They provide quick confirmations, simple actions, or visual aids.

![Examples of inline cards](https://developers.openai.com/images/apps-sdk/inline_cards.png)

**When to use**

- A single action or decision (for example, confirm a booking).
- Small amounts of structured data (for example, a map, order summary, or quick status).
- A fully self-contained widget or tool (e.g., an audio player or a score card).

**Layout**

![Diagram of inline cards](https://developers.openai.com/images/apps-sdk/inline_card_layout.png)

- **Title**: Include a title if your card is document-based or contains items with a parent element, like songs in a playlist.
- **Expand**: Use to open a fullscreen display mode if the card contains rich media or interactivity like a map or an interactive diagram.
- **Show more**: Use to disclose additional items if multiple results are presented in a list.
- **Edit controls**: Provide inline support for app responses without overwhelming the conversation.
- **Primary actions**: Limit to two actions, placed at bottom of card. Actions should perform either a conversation turn or a tool call.

**Interaction**

![Diagram of interaction patterns for inline cards](https://developers.openai.com/images/apps-sdk/inline_card_interaction.png)

Cards support simple direct interaction.

- **States**: Edits made are persisted.
- **Simple direct edits**: If appropriate, inline editable text allows users to make quick edits without needing to prompt the model.
- **Dynamic layout**: Card layout can expand its height to match its contents up to the height of the mobile viewport.

**Rules of thumb**

- **Limit primary actions per card**: Support up to two actions maximum, with one primary CTA and one optional secondary CTA.
- **No deep navigation or multiple views within a card.** Cards should not contain multiple drill-ins, tabs, or deeper navigation. Consider splitting these into separate cards or tool actions.
- **No nested scrolling**. Cards should auto-fit their content and prevent internal scrolling.
- **No duplicative inputs**. Don’t replicate ChatGPT features in a card.

![Examples of patterns to avoid in inline cards](https://developers.openai.com/images/apps-sdk/inline_card_rules.png)

#### Inline carousel

A set of cards presented side-by-side, letting users quickly scan and choose from multiple options.

![Example of inline carousel](https://developers.openai.com/images/apps-sdk/inline_carousel.png)

**When to use**

- Presenting a small list of similar items (for example, restaurants, playlists, events).
- Items have more visual content and metadata than will fit in simple rows.

**Layout**

![Diagram of inline carousel](https://developers.openai.com/images/apps-sdk/inline_carousel_layout.png)

- **Image**: Items should always include an image or visual.
- **Title**: Carousel items should typically include a title to explain the content.
- **Metadata**: Use metadata to show the most important and relevant information about the item in the context of the response. Avoid showing more than two lines of text.
- **Badge**: Use the badge to show supporting context where appropriate.
- **Actions**: Provide a single clear CTA per item whenever possible.

**Rules of thumb**

- Keep to **3–8 items per carousel** for scannability.
- Reduce metadata to the most relevant details, with three lines max.
- Each card may have a single, optional CTA (for example, “Book” or “Play”).
- Use consistent visual hierarchy across cards.

### Fullscreen

Immersive experiences that expand beyond the inline card, giving users space for multi-step workflows or deeper exploration. The ChatGPT composer remains overlaid, allowing users to continue “talking to the app” through natural conversation in the context of the fullscreen view.

![Example of fullscreen](https://developers.openai.com/images/apps-sdk/fullscreen.png)

**When to use**

- Rich tasks that cannot be reduced to a single card (for example, an explorable map with pins, a rich editing canvas, or an interactive diagram).
- Browsing detailed content (for example, real estate listings, menus).

**Layout**

![Diagram of fullscreen](https://developers.openai.com/images/apps-sdk/fullscreen_layout.png)

- **System close**: Closes the sheet or view.
- **Fullscreen view**: Content area.
- **Composer**: ChatGPT’s native composer, allowing the user to follow up in the context of the fullscreen view.

**Interaction**

![Interaction patterns for fullscreen](https://developers.openai.com/images/apps-sdk/fullscreen_interaction_a.png)

- **Chat sheet**: Maintain conversational context alongside the fullscreen surface.
- **Thinking**: The composer input “shimmers” to show that a response is streaming.
- **Response**: When the model completes its response, an ephemeral, truncated snippet displays above the composer. Tapping it opens the chat sheet.

**Rules of thumb**

- **Design your UX to work with the system composer**. The composer is always present in fullscreen, so make sure your experience supports conversational prompts that can trigger tool calls and feel natural for users.
- **Use fullscreen to deepen engagement**, not to replicate your native app wholesale.

### Picture-in-picture (PiP)

A persistent floating window inside ChatGPT optimized for ongoing or live sessions like games or videos. PiP remains visible while the conversation continues, and it can update dynamically in response to user prompts.

![Example of picture-in-picture](https://developers.openai.com/images/apps-sdk/pip.png)

**When to use**

- **Activities that run in parallel with conversation**, such as a game, live collaboration, quiz, or learning session.
- **Situations where the PiP widget can react to chat input**, for example continuing a game round or refreshing live data based on a user request.

**Interaction**

![Interaction patterns for picture-in-picture](https://developers.openai.com/images/apps-sdk/fullscreen_interaction.png)

- **Activated:** On scroll, the PiP window stays fixed to the top of the viewport
- **Pinned:** The PiP remains fixed until the user dismisses it or the session ends.
- **Session ends:** The PiP returns to an inline position and scrolls away.

**Rules of thumb**

- **Ensure the PiP state can update or respond** when users interact through the system composer.
- **Close PiP automatically** when the session ends.
- **Do not overload PiP with controls or static content** better suited for inline or fullscreen.

## Visual design guidelines

A consistent look and feel helps partner-built tools feel like a natural part of the ChatGPT platform. Visual guidelines support clarity, usability, and accessibility, while still leaving room for brand expression in the right places.

These principles outline how to use color, type, spacing, and imagery in ways that preserve system clarity while giving partners space to differentiate their service.

### Why this matters

Visual and UX consistency helps improve the overall user experience of using apps in ChatGPT. By following these guidelines, partners can present their tools in a way that feels consistent to users and delivers value without distraction.

### Color

System-defined palettes help ensure actions and responses always feel consistent with the ChatGPT platform. Partners can add branding through accents, icons, or inline imagery, but should not redefine system colors.

![Color palette](https://developers.openai.com/images/apps-sdk/color.png)

**Rules of thumb**

- Use system colors for text, icons, and spatial elements like dividers.
- Partner brand accents such as logos or icons should not override backgrounds or text colors.
- Avoid custom gradients or patterns that break ChatGPT’s minimal look.
- Use brand accent colors on primary buttons inside app display modes.

![Example color usage](https://developers.openai.com/images/apps-sdk/color_usage_1.png)

_Use brand colors on accents and badges. Don't change text colors or other core component styles._

![Example color usage](https://developers.openai.com/images/apps-sdk/color_usage_2.png)

_Don't apply colors to backgrounds in text areas._

### Typography

ChatGPT uses platform-native system fonts (SF Pro on iOS, Roboto on Android) to ensure readability and accessibility across devices.

![Typography](https://developers.openai.com/images/apps-sdk/typography.png)

**Rules of thumb**

- Always inherit the system font stack, respecting system sizing rules for headings, body text, and captions.
- Use partner styling such as bold, italic, or highlights only within content areas, not for structural UI.
- Limit variation in font size as much as possible, preferring body and body-small sizes.

![Example typography](https://developers.openai.com/images/apps-sdk/typography_usage.png)

_Don't use custom fonts, even in full screen modes. Use system font variables wherever possible._

### Spacing & layout

Consistent margins, padding, and alignment keep partner content scannable and predictable inside conversation.

![Spacing & layout](https://developers.openai.com/images/apps-sdk/spacing.png)

**Rules of thumb**

- Use system grid spacing for cards, collections, and inspector panels.
- Keep padding consistent and avoid cramming or edge-to-edge text.
- Respect system specified corner rounds when possible to keep shapes consistent.
- Maintain visual hierarchy with headline, supporting text, and CTA in a clear order.

### Icons & imagery

System iconography provides visual clarity, while partner logos and images help users recognize brand context.

![Icons](https://developers.openai.com/images/apps-sdk/icons.png)

**Rules of thumb**

- Use either system icons or custom iconography that fits within ChatGPT's visual world — monochromatic and outlined.
- Do not include your logo as part of the response. ChatGPT will always append your logo and app name before the widget is rendered.
- All imagery must follow enforced aspect ratios to avoid distortion.

![Icons & imagery](https://developers.openai.com/images/apps-sdk/iconography.png)

### Accessibility

Every partner experience should be usable by the widest possible audience.
Accessibility should be a core consideration when you are building apps for ChatGPT.

**Rules of thumb**

- Text and background must maintain a minimum contrast ratio (WCAG AA).
- Provide alt text for all images.
- Support text resizing without breaking layouts.
