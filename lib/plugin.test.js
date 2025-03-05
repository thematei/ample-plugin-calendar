import { jest } from "@jest/globals"
import { mockApp, mockPlugin, mockNote } from "./test-helpers.js"

const REPO_URL = "https://github.com/alloy-org/plugin-builder";
// --------------------------------------------------------------------------------------
describe("This here plugin", () => {
  const plugin = mockPlugin();
  plugin._testEnvironment = true;

  // --------------------------------------------------------------------------------------
  it("should return true", () => {
    expect(plugin).toBeTruthy();
  });
});
