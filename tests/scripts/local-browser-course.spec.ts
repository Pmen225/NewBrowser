import { afterEach, describe, expect, it } from "vitest";

import {
  buildLocalBrowserCourseScenarios,
  createLocalBrowserCourseServer
} from "../../scripts/lib/local-browser-course.js";

const servers = [];

afterEach(async () => {
  while (servers.length > 0) {
    const server = servers.pop();
    await server.close();
  }
});

describe("local browser course fixtures", () => {
  it("serves repo-native crash-course pages without Herokuapp", async () => {
    const server = await createLocalBrowserCourseServer();
    servers.push(server);

    const [checkboxes, dynamicControls, upload] = await Promise.all([
      fetch(`${server.baseUrl}/checkboxes`).then((response) => response.text()),
      fetch(`${server.baseUrl}/dynamic-controls`).then((response) => response.text()),
      fetch(`${server.baseUrl}/upload`).then((response) => response.text())
    ]);

    expect(checkboxes).toContain("Checkboxes");
    expect(dynamicControls).toContain('id="remove-button"');
    expect(dynamicControls).toContain('id="enable-button"');
    expect(upload).toContain('id="file-upload"');
    expect(upload).toContain('id="uploaded-files"');
  });

  it("builds scenario targets against the local fixture server", async () => {
    const server = await createLocalBrowserCourseServer();
    servers.push(server);

    const scenarios = buildLocalBrowserCourseScenarios({
      baseUrl: server.baseUrl,
      uploadFixturePath: "/repo/scripts/fixtures/atlas-upload-check.txt"
    });

    expect(scenarios).toHaveLength(6);
    expect(scenarios.every((scenario) => scenario.targetUrl.startsWith(server.baseUrl))).toBe(true);
    expect(scenarios.some((scenario) => scenario.targetUrl.includes("the-internet.herokuapp.com"))).toBe(false);
    expect(scenarios.map((scenario) => scenario.name)).toEqual([
      "checkboxes",
      "dropdown",
      "dynamic-controls",
      "javascript-prompt",
      "inputs",
      "file-upload"
    ]);
  });
});
