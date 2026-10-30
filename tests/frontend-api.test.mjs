import assert from "node:assert/strict";
import { test } from "node:test";
import { api, ApiError, money, priceText, query, uploadProductImage, checkoutErrorMessage, safeMediaPath } from "../lib/api.ts";
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


test("image upload UI client sends raw file with session credentials and rejects unsafe responses", async () => {
  const original = globalThis.fetch;
  const file = new File([new Uint8Array([137, 80, 78, 71])], "sample.png", { type: "image/png" });
  try {
    globalThis.fetch = async (path, options) => {
      assert.equal(path, "/api/admin/media/tf2");
      assert.equal(options.method, "POST");
      assert.equal(options.credentials, "same-origin");
      assert.equal(options.body, file);
      assert.equal(options.headers["Content-Type"], "image/png");
      return Response.json({ path: "/media/tf2/0123456789abcdef0123456789abcdef.webp" }, { status: 201 });
    };
    assert.equal(await uploadProductImage("tf2", file), "/media/tf2/0123456789abcdef0123456789abcdef.webp");
    globalThis.fetch = async () => Response.json({ detail: "Administrator access required" }, { status: 403 });
    await assert.rejects(uploadProductImage("tf2", file),
      error => error instanceof ApiError && error.status === 403);
    globalThis.fetch = async () => Response.json({ path: "https://evil.example/file.webp" }, { status: 201 });
    await assert.rejects(uploadProductImage("tf2", file),
      error => error instanceof ApiError && error.status === 502);
  } finally {
    globalThis.fetch = original;
  }
});

test("cart distinguishes missing payment setup from other checkout failures in Persian", () => {
  const missing = checkoutErrorMessage(new ApiError(503, "Payment instructions are not configured"));
  assert.match(missing, /اطلاعات پرداخت فروشگاه/);
  assert.doesNotMatch(missing, /Payment instructions/);
  assert.match(checkoutErrorMessage(new ApiError(503, "Exchange rate is not configured")), /نرخ تبدیل/);
  assert.match(checkoutErrorMessage(new ApiError(409, "A CS2 item is unavailable")), /موجودی/);
  assert.equal(checkoutErrorMessage(new ApiError(500, "Internal Server Error")), "ثبت سفارش انجام نشد. لطفاً دوباره تلاش کنید.");
});

test("product images render only safe local media paths", () => {
  assert.equal(safeMediaPath("/media/cs2/example.webp"), true);
  assert.equal(safeMediaPath("/media/legacy.webp"), true);
  assert.equal(safeMediaPath("/media/tf2/example.png"), true);
  assert.equal(safeMediaPath("https://evil.example/track.png"), false);
  assert.equal(safeMediaPath("/media/../secret.webp"), false);
  assert.equal(safeMediaPath("/media/tf2/example.svg"), false);
});
