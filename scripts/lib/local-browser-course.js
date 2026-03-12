import http from "node:http";
import { listenWithLoopbackGuard } from "./loopback-bind.js";

function pageTemplate(title, body, script = "") {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      :root { color-scheme: light; }
      body {
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        margin: 0;
        padding: 40px 24px;
        color: #111827;
        background: #f8fafc;
      }
      main {
        max-width: 720px;
        margin: 0 auto;
        background: #ffffff;
        border: 1px solid #dbe3ef;
        border-radius: 20px;
        padding: 28px;
        box-shadow: 0 18px 50px rgba(15, 23, 42, 0.08);
      }
      h1 { margin: 0 0 12px; font-size: 30px; line-height: 1.1; }
      p { color: #4b5563; line-height: 1.6; }
      label, button, select, input { font: inherit; }
      input[type="text"], input[type="number"], select {
        min-height: 44px;
        padding: 0 12px;
        border-radius: 12px;
        border: 1px solid #cbd5e1;
        background: #fff;
      }
      button, input[type="submit"] {
        min-height: 44px;
        padding: 0 14px;
        border: 0;
        border-radius: 12px;
        background: #2563eb;
        color: #fff;
        cursor: pointer;
      }
      .stack { display: grid; gap: 14px; }
      .row { display: flex; gap: 12px; align-items: center; }
      #message, #result, #uploaded-files {
        min-height: 24px;
        font-weight: 600;
      }
      #checkbox, #input-example, .card {
        border: 1px solid #e5e7eb;
        border-radius: 16px;
        padding: 18px;
        background: #f9fafb;
      }
    </style>
  </head>
  <body>
    <main>
      ${body}
    </main>
    ${script ? `<script>${script}</script>` : ""}
  </body>
</html>`;
}

function indexPage() {
  return pageTemplate(
    "Atlas Local Browser Course",
    `<h1>Atlas Local Browser Course</h1>
    <p>This is the repo-native browser-control crash course. Use the scenario pages directly.</p>
    <div class="stack">
      <a href="/checkboxes">Checkboxes</a>
      <a href="/dropdown">Dropdown</a>
      <a href="/dynamic-controls">Dynamic Controls</a>
      <a href="/javascript_alerts">JavaScript Prompt</a>
      <a href="/inputs">Inputs</a>
      <a href="/upload">Upload</a>
    </div>`
  );
}

function checkboxesPage() {
  return pageTemplate(
    "Checkboxes",
    `<h1>Checkboxes</h1>
    <p>Make sure checkbox 1 is checked and checkbox 2 is unchecked.</p>
    <div class="stack">
      <label class="row"><input type="checkbox" /> checkbox 1</label>
      <label class="row"><input type="checkbox" checked /> checkbox 2</label>
    </div>`
  );
}

function dropdownPage() {
  return pageTemplate(
    "Dropdown",
    `<h1>Dropdown</h1>
    <p>Select the requested option.</p>
    <select id="dropdown">
      <option value="">Please select an option</option>
      <option value="1">Option 1</option>
      <option value="2">Option 2</option>
    </select>`
  );
}

function dynamicControlsPage() {
  return pageTemplate(
    "Dynamic Controls",
    `<h1>Dynamic Controls</h1>
    <p>Remove the checkbox, enable the input, and enter the requested text.</p>
    <div class="stack">
      <div id="checkbox">
        <label class="row"><input type="checkbox" /> A checkbox</label>
      </div>
      <div class="row">
        <button id="remove-button" type="button">Remove</button>
      </div>
      <div id="input-example" class="stack">
        <input type="text" disabled value="" />
        <button id="enable-button" type="button">Enable</button>
      </div>
      <div id="message" aria-live="polite"></div>
    </div>`,
    `(() => {
      const message = document.getElementById("message");
      const checkbox = document.getElementById("checkbox");
      const input = document.querySelector("#input-example input");
      const removeButton = document.getElementById("remove-button");
      const enableButton = document.getElementById("enable-button");

      removeButton.addEventListener("click", () => {
        removeButton.disabled = true;
        message.textContent = "Waiting for checkbox...";
        setTimeout(() => {
          checkbox.innerHTML = "";
          message.textContent = "It's gone!";
          removeButton.disabled = false;
        }, 180);
      });

      enableButton.addEventListener("click", () => {
        enableButton.disabled = true;
        message.textContent = "Waiting for input...";
        setTimeout(() => {
          input.disabled = false;
          message.textContent = "It's enabled!";
          enableButton.disabled = false;
        }, 180);
      });
    })();`
  );
}

function javascriptAlertsPage() {
  return pageTemplate(
    "JavaScript Alerts",
    `<h1>JavaScript Alerts</h1>
    <p>Use the JavaScript prompt and submit the requested text.</p>
    <div class="stack">
      <button id="prompt-button" type="button">Click for JS Prompt</button>
      <div id="result"></div>
    </div>`,
    `(() => {
      const result = document.getElementById("result");
      document.getElementById("prompt-button").addEventListener("click", () => {
        const value = window.prompt("I am a JS prompt", "");
        result.textContent = value == null ? "You entered nothing" : "You entered: " + value;
      });
    })();`
  );
}

function inputsPage() {
  return pageTemplate(
    "Inputs",
    `<h1>Inputs</h1>
    <p>Set the number field to the requested value.</p>
    <input type="number" inputmode="numeric" value="" />`
  );
}

function uploadPage() {
  return pageTemplate(
    "File Upload",
    `<h1>File Upload</h1>
    <p>Choose a file and submit it.</p>
    <form id="upload-form" class="stack">
      <input id="file-upload" type="file" />
      <input id="file-submit" type="submit" value="Upload" />
    </form>
    <h3 id="upload-heading"></h3>
    <div id="uploaded-files"></div>`,
    `(() => {
      const form = document.getElementById("upload-form");
      const input = document.getElementById("file-upload");
      const heading = document.getElementById("upload-heading");
      const uploaded = document.getElementById("uploaded-files");
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const file = input.files && input.files[0];
        if (!file) {
          heading.textContent = "No file selected";
          uploaded.textContent = "";
          return;
        }
        heading.textContent = "File Uploaded!";
        uploaded.textContent = file.name;
      });
    })();`
  );
}

function notFoundPage() {
  return pageTemplate("Not Found", `<h1>Not Found</h1><p>The requested local crash-course page does not exist.</p>`);
}

export function buildLocalBrowserCourseScenarios({ baseUrl, uploadFixturePath }) {
  return [
    {
      name: "checkboxes",
      targetUrl: `${baseUrl}/checkboxes`,
      prompt: "On this page, make sure checkbox 1 is checked and checkbox 2 is unchecked, then tell me the final state.",
      siteEvalSource: `() => ({
        c1: document.querySelectorAll('input[type="checkbox"]')[0]?.checked ?? null,
        c2: document.querySelectorAll('input[type="checkbox"]')[1]?.checked ?? null
      })`,
      verifyDom(siteEval, site) {
        return Boolean(site?.url?.includes("/checkboxes")) && siteEval?.c1 === true && siteEval?.c2 === false;
      },
      verifyAssistant(text) {
        const normalized = String(text || "").toLowerCase();
        return normalized.includes("checkbox 1") && normalized.includes("checked") && normalized.includes("checkbox 2") && normalized.includes("unchecked");
      }
    },
    {
      name: "dropdown",
      targetUrl: `${baseUrl}/dropdown`,
      prompt: "On this page, select Option 2 and tell me which option is selected.",
      siteEvalSource: `() => ({ value: document.querySelector('#dropdown')?.value ?? '' })`,
      verifyDom(siteEval, site) {
        return Boolean(site?.url?.includes("/dropdown")) && siteEval?.value === "2";
      },
      verifyAssistant(text) {
        return /option 2/i.test(String(text || ""));
      }
    },
    {
      name: "dynamic-controls",
      targetUrl: `${baseUrl}/dynamic-controls`,
      prompt: "On this page, remove the checkbox, enable the text field, type \"Atlas\", and tell me the final status message and field value.",
      siteEvalSource: `() => ({
        checkboxPresent: !!document.querySelector('#checkbox input[type="checkbox"]'),
        inputDisabled: document.querySelector('#input-example input')?.disabled ?? null,
        inputValue: document.querySelector('#input-example input')?.value ?? '',
        message: document.querySelector('#message')?.textContent?.trim() ?? ''
      })`,
      verifyDom(siteEval, site) {
        return Boolean(site?.url?.includes("/dynamic-controls"))
          && siteEval?.checkboxPresent === false
          && siteEval?.inputDisabled === false
          && siteEval?.inputValue === "Atlas"
          && /enabled|gone/i.test(siteEval?.message ?? "");
      },
      verifyAssistant(text) {
        const normalized = String(text || "").toLowerCase();
        return normalized.includes("atlas") && (normalized.includes("enabled") || normalized.includes("gone"));
      }
    },
    {
      name: "javascript-prompt",
      targetUrl: `${baseUrl}/javascript_alerts`,
      prompt: "On this page, trigger the JS Prompt, enter \"Atlas\", accept it, and tell me the result text.",
      siteEvalSource: `() => ({ result: document.querySelector('#result')?.textContent?.trim() ?? '' })`,
      verifyDom(siteEval, site) {
        return Boolean(site?.url?.includes("/javascript_alerts")) && siteEval?.result === "You entered: Atlas";
      },
      verifyAssistant(text) {
        return /you entered:\s*atlas/i.test(String(text || ""));
      }
    },
    {
      name: "inputs",
      targetUrl: `${baseUrl}/inputs`,
      prompt: "Set the number field on this page to 42 and tell me the final value.",
      siteEvalSource: `() => ({ value: document.querySelector('input')?.value ?? '' })`,
      verifyDom(siteEval, site) {
        return Boolean(site?.url?.includes("/inputs")) && siteEval?.value === "42";
      },
      verifyAssistant(text) {
        return /42/.test(String(text || ""));
      }
    },
    {
      name: "file-upload",
      targetUrl: `${baseUrl}/upload`,
      prompt: `Upload the file "${uploadFixturePath}" on this page and tell me the uploaded filename.`,
      siteEvalSource: `() => ({
        heading: document.querySelector('#upload-heading')?.textContent?.trim() ?? '',
        uploaded: document.querySelector('#uploaded-files')?.textContent?.trim() ?? ''
      })`,
      verifyDom(siteEval, site) {
        return Boolean(site?.url?.includes("/upload"))
          && /file uploaded!/i.test(siteEval?.heading ?? "")
          && siteEval?.uploaded === "atlas-upload-check.txt";
      },
      verifyAssistant(text) {
        return /atlas-upload-check\\.txt/i.test(String(text || ""));
      }
    }
  ];
}

export async function createLocalBrowserCourseServer({ host = "127.0.0.1", port = 0 } = {}) {
  const routes = new Map([
    ["/", { contentType: "text/html; charset=utf-8", body: indexPage() }],
    ["/checkboxes", { contentType: "text/html; charset=utf-8", body: checkboxesPage() }],
    ["/dropdown", { contentType: "text/html; charset=utf-8", body: dropdownPage() }],
    ["/dynamic-controls", { contentType: "text/html; charset=utf-8", body: dynamicControlsPage() }],
    ["/javascript_alerts", { contentType: "text/html; charset=utf-8", body: javascriptAlertsPage() }],
    ["/inputs", { contentType: "text/html; charset=utf-8", body: inputsPage() }],
    ["/upload", { contentType: "text/html; charset=utf-8", body: uploadPage() }]
  ]);

  const server = http.createServer((request, response) => {
    const pathname = new URL(request.url || "/", `http://${request.headers.host || `${host}:${port}`}`).pathname;
    const route = routes.get(pathname) || { contentType: "text/html; charset=utf-8", body: notFoundPage(), statusCode: 404 };
    response.writeHead(route.statusCode || 200, {
      "content-type": route.contentType,
      "cache-control": "no-store"
    });
    response.end(route.body);
  });

  await listenWithLoopbackGuard(server, {
    host,
    port,
    label: "local browser course server"
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Unable to determine local browser course server address.");
  }

  const baseUrl = `http://${host}:${address.port}`;

  return {
    host,
    port: address.port,
    baseUrl,
    async close() {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    }
  };
}
