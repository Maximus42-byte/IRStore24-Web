import assert from "node:assert/strict";
import { test } from "node:test";
import { api, ApiError, money, priceText, query } from "../lib/api.ts";
import { safeExternalUrl } from "../lib/social.ts";

test("monetary formatting preserves decimal strings", () => {
  assert.equal(money("123456789.12340000"), "123,456,789.1234");
  assert.equal(money("0.00000001"), "0.00000001");
  assert.equal(money(null), "—");
  assert.equal(priceText({ amount: "1.25000000", currency: "USDT", toman: null, usdt: "1.25000000" }), "1.25 USDT");
});

test("query builder omits unset values and retains filters", () => {
  assert.equal(query({ search: "", page: 2, available: false }), "?page=2&available=false");
  assert.equal(safeExternalUrl("javascript:alert(1)"), null);
  assert.equal(safeExternalUrl("https://t.me/IRStoore"), "https://t.me/IRStoore");
});

test("API client uses same-origin credentials and handles HTTP errors", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (path, options) => {
      assert.equal(path, "/api/auth/me");
      assert.equal(options.credentials, "same-origin");
      assert.equal(options.cache, "no-store");
      return Response.json({ id: 1, email: "user@example.com" });
    };
    assert.equal((await api("/api/auth/me")).id, 1);
    globalThis.fetch = async () => Response.json({ detail: [{ msg: "Invalid input" }] }, { status: 422 });
    await assert.rejects(api("/api/cart"), error => error instanceof ApiError && error.status === 422 && error.message === "Invalid input");
  } finally {
    globalThis.fetch = original;
  }
});

test("API client reports network failure without exposing implementation errors", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => { throw new TypeError("socket failure"); };
    await assert.rejects(api("/api/cart"), error => error instanceof ApiError && error.status === 0);
  } finally {
    globalThis.fetch = original;
  }
});
