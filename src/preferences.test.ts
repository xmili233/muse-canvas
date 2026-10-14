import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import {
  avatarInitials,
  DEFAULT_PREFERENCES,
  loadPreferences,
  PREFERENCES_KEY,
} from "./preferences.ts";

function storage(t: TestContext, value: string | null) {
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem(key: string) {
        assert.equal(key, PREFERENCES_KEY);
        return value;
      },
    },
  });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else delete (globalThis as { localStorage?: Storage }).localStorage;
  });
}

test("saved profile and canvas preferences survive loading", (t) => {
  const preferences = {
    ...DEFAULT_PREFERENCES,
    name: "王小明",
    avatarColor: "#496b95",
    showGrid: false,
    openAgent: false,
  };
  storage(t, JSON.stringify(preferences));
  assert.deepEqual(loadPreferences(), preferences);
});

test("damaged preferences fall back without touching canvas storage", (t) => {
  storage(t, "{not valid JSON");
  assert.deepEqual(loadPreferences(), DEFAULT_PREFERENCES);
});

test("invalid field types and unsupported colors cannot enter the interface", (t) => {
  storage(
    t,
    JSON.stringify({
      name: "  ",
      avatarColor: "url(unknown)",
      showGrid: "false",
      openSidebar: 0,
      openAgent: null,
    }),
  );
  assert.deepEqual(loadPreferences(), DEFAULT_PREFERENCES);
});

test("avatar initials support names, Chinese and emoji without splitting characters", () => {
  assert.equal(avatarInitials("zhiwei wang"), "ZW");
  assert.equal(avatarInitials("王小明"), "王小");
  assert.equal(avatarInitials("😀 Cat"), "😀C");
  assert.equal(avatarInitials(" "), "M");
});
