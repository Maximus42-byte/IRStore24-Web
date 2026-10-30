// Browser-driven checks against a disposable, migrated PostgreSQL database.
// E2E_CONFIG_PATH points to a private JSON file with origin, test identities,
// passwords, and database name. No credentials are stored in this repository.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, chmodSync } from "node:fs";
import { spawnSync } from "node:child_process";

const configPath = process.env.E2E_CONFIG_PATH;
assert(configPath, "E2E_CONFIG_PATH is required");
const config = JSON.parse(readFileSync(configPath, "utf8"));
assert(/^irstore24_e2e_[a-f0-9]+$/.test(config.database));
assert(/^http:\/\/localhost:\d+$/.test(config.origin));
config.api_port ??= 8000;
config.user = { email: config.user_email, password: config.user_password };
config.admin = { email: config.admin_email, password: config.admin_password };
const phase = process.argv[2];
const statePath = `/tmp/${config.database}-state.json`;
let state = {};
try { state = JSON.parse(readFileSync(statePath, "utf8")); } catch { /* first phase */ }
function saveState() { writeFileSync(statePath, JSON.stringify(state)); chmodSync(statePath, 0o600); }
function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function fixed8(value) {
  const match = String(value).match(/^(-?)(\d+)(?:\.(\d{1,8}))?$/);
  assert(match, `Invalid fixed-point decimal: ${value}`);
  return BigInt(match[1] + match[2] + (match[3] || "").padEnd(8, "0"));
}
function assertDecimal(actual, expected) { assert.equal(fixed8(actual), fixed8(expected)); }

class Tab {
  static async open(port, path = "/") {
    const response = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(config.origin + path)}`, { method: "PUT" });
    assert.equal(response.status, 200, "Chrome CDP must be available");
    const target = await response.json();
    const tab = new Tab(target, port);
    await tab.ready;
    await tab.call("Page.enable");
    await tab.call("Runtime.enable");
    await tab.call("Network.enable");
    await tab.waitFor("document.readyState === 'complete'");
    await delay(500);
    return tab;
  }
  constructor(target, port) {
    this.target = target;
    this.port = port;
    this.id = 0;
    this.pending = new Map();
    this.responses = [];
    this.socket = new WebSocket(target.webSocketDebuggerUrl);
    this.ready = new Promise((resolve, reject) => {
      this.socket.onopen = resolve;
      this.socket.onerror = reject;
    });
    this.socket.onmessage = event => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const callback = this.pending.get(message.id);
        if (callback) { this.pending.delete(message.id); callback(message); }
      } else if (message.method === "Network.responseReceived") {
        this.responses.push({ url: message.params.response.url, status: message.params.response.status });
      }
    };
  }
  async call(method, params = {}) {
    await this.ready;
    const id = ++this.id;
    const answer = new Promise((resolve, reject) => {
      this.pending.set(id, message => message.error ? reject(new Error(`${method}: ${message.error.message}`)) : resolve(message.result));
      setTimeout(() => { if (this.pending.delete(id)) reject(new Error(`${method} timed out`)); }, 20000).unref();
    });
    this.socket.send(JSON.stringify({ id, method, params }));
    return answer;
  }
  async eval(expression) {
    const reply = await this.call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (reply.exceptionDetails) throw new Error(reply.exceptionDetails.text);
    return reply.result.value;
  }
  async waitFor(expression, timeout = 15000) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      try { if (await this.eval(expression)) return; } catch { /* navigation */ }
      await delay(150);
    }
    throw new Error(`Browser wait timed out: ${expression}\n${(await this.text()).slice(0, 600)}`);
  }
  async goto(path) {
    await this.call("Page.navigate", { url: config.origin + path });
    await this.waitFor(`location.href === ${JSON.stringify(config.origin + path)} && document.readyState === 'complete'`, 30000);
    await delay(500);
  }
  async text() { return this.eval("document.body?.innerText || ''"); }
  async fill(selector, value) {
    await this.waitFor(`!!document.querySelector(${JSON.stringify(selector)})`);
    const result = await this.eval(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); const setter = Object.getOwnPropertyDescriptor(el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value').set; setter.call(el, ${JSON.stringify(String(value))}); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); return el.value; })()`);
    assert.equal(result, String(value));
  }
  async select(selector, value) {
    const result = await this.eval(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); el.value = ${JSON.stringify(value)}; el.dispatchEvent(new Event('change', { bubbles: true })); return el.value; })()`);
    assert.equal(result, value);
  }
  async click(selector) {
    await this.waitFor(`!!document.querySelector(${JSON.stringify(selector)})`);
    await this.eval(`document.querySelector(${JSON.stringify(selector)}).click()`);
  }
  async clickText(selector, text) {
    const result = await this.eval(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find(el => el.textContent.includes(${JSON.stringify(text)})); if (!el) return false; el.click(); return true; })()`);
    assert(result, `Missing ${selector} containing ${text}`);
  }
  async api(path, options = {}) {
    const result = await this.eval(`(async () => { const res = await fetch(${JSON.stringify(path)}, { credentials: 'same-origin', ...${JSON.stringify(options)} }); let body; try { body = await res.json(); } catch { body = null; } return { status: res.status, body }; })()`);
    return result;
  }
  async waitApiStatus(path, status) {
    await this.waitFor(`(async () => (await fetch(${JSON.stringify(path)}, { credentials: 'same-origin' })).status === ${status})()`);
  }
  async waitApiField(path, field, value) {
    await this.waitFor(`(async () => (await (await fetch(${JSON.stringify(path)}, { credentials: 'same-origin' })).json())[${JSON.stringify(field)}] === ${JSON.stringify(value)})()`);
  }
  async cookies() { return (await this.call("Network.getCookies", { urls: [config.origin] })).cookies; }
  async close() { this.socket.close(); await fetch(`http://127.0.0.1:${this.port}/json/close/${this.target.id}`); }
}

async function register(tab, identity) {
  await tab.goto("/register");
  await tab.fill("#email", identity.email);
  await tab.fill("#password", identity.password);
  await tab.fill("#confirm", identity.password);
  await tab.click("form button[type=submit]");
  await tab.waitFor("location.pathname === '/login'");
  assert((await tab.text()).includes("ثبت‌نام انجام شد"));
}
async function login(tab, identity, path = "/account") {
  await tab.goto("/login");
  await tab.fill("#email", identity.email);
  await tab.fill("#password", identity.password);
  await tab.click("form button[type=submit]");
  await tab.waitFor(`location.pathname === ${JSON.stringify(path)}`);
  const me = await tab.api("/api/auth/me");
  assert.equal(me.status, 200);
  assert.equal(me.body.email, identity.email);
  return me.body;
}
async function clickArticleButton(tab, href, label) {
  const selector = `article:has(a[href="${href}"])`;
  const result = await tab.eval(`(() => { const article = document.querySelector(${JSON.stringify(selector)}); const button = [...(article?.querySelectorAll('button') || [])].find(el => el.textContent.trim() === ${JSON.stringify(label)}); if (!button) return false; button.click(); return true; })()`);
  assert(result, `Missing article button ${label} for ${href}`);
}
async function chooseTestImage(tab, selector) {
  await tab.eval(`(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 8;
    canvas.getContext('2d').fillRect(0, 0, 8, 8);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const file = new File([blob], 'e2e-image.png', { type: 'image/png' });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    const input = document.querySelector(${JSON.stringify(selector)});
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  await tab.waitFor("!!document.querySelector('img[alt=\"پیش‌نمایش تصویر انتخاب‌شده\"][src^=\"blob:\"]')");
}

async function getProduct(tab, kind, id) {
  if (kind === "tf2-keys") {
    const listing = await tab.api("/api/tf2-keys");
    assert.equal(listing.status, 200);
    const product = listing.body.items.find(item => item.id === id);
    assert(product, `TF2 key ${id} missing`);
    return product;
  }
  const response = await tab.api(`/api/${kind}/${id}`);
  assert.equal(response.status, 200);
  return response.body;
}
async function createPendingCS2(tab) {
  await tab.goto(`/cs2-items/${state.cs2.slug}`);
  await tab.waitFor("document.body.innerText.includes('E2E AWP Test Skin')");
  await tab.clickText("button", "افزودن به سبد خرید");
  await tab.waitFor("location.pathname === '/cart'");
  await tab.waitFor("document.body.innerText.includes('E2E AWP Test Skin')");
  await tab.clickText("button", "خرید");
  await tab.waitFor("location.pathname.startsWith('/account/orders/')");
  const number = await tab.eval("location.pathname.split('/').at(-1)");
  await tab.waitFor("document.body.innerText.includes('pending')");
  return number;
}
function runBackend(args, extraEnv = {}) {
  const result = spawnSync("/home/maximus/Projects/IRStore24/backend/.venv/bin/python", args, {
    cwd: process.cwd() + "/backend",
    env: { ...process.env, POSTGRES_DB: config.database, ...extraEnv },
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
}
async function run() {
  if (phase === "prepare") {
    const createDatabase = `import json, os, re
from sqlalchemy import create_engine, text
from app.core.config import settings
cfg = json.load(open(os.environ["E2E_CONFIG_PATH"]))
name = cfg["database"]
assert re.fullmatch(r"irstore24_e2e_[a-f0-9]+", name)
assert settings.postgres_db == name and settings.db_host in ("127.0.0.1", "localhost")
maintenance = create_engine(settings.database_url.set(database="postgres"), isolation_level="AUTOCOMMIT")
with maintenance.connect() as db:
    assert db.scalar(text("select current_database()")) == "postgres"
    assert db.scalar(text("select count(*) from pg_database where datname = :name"), {"name": name}) == 0
    db.execute(text("create database " + name))
`;
    runBackend(["-c", createDatabase], { E2E_CONFIG_PATH: configPath });
    runBackend(["-m", "alembic", "upgrade", "head"]);
    const current = runBackend(["-m", "alembic", "current"]);
    assert(current.includes("(head)"), `Alembic did not reach head: ${current}`);
    console.log("PASS isolated local database created and migrated to head");
  } else if (phase === "register") {
    const tab = await Tab.open(9222, "/");
    try {
      await register(tab, config.user);
      await register(tab, config.admin);
      const bad = await tab.api("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: config.user.email, password: "invalid-password" }) });
      assert.equal(bad.status, 401);
      const unauth = await tab.api("/api/admin/users");
      assert.equal(unauth.status, 401);
      console.log("PASS browser registration (user, admin candidate), invalid login, unauthenticated admin rejection");
    } finally { await tab.close(); }
  } else if (phase === "promote") {
    const promote = `import json, os
from sqlalchemy import select, text, update, func
from app.core.config import settings
from app.core.database import SessionLocal
from app.models.user import User
cfg = json.load(open(os.environ["E2E_CONFIG_PATH"]))
assert settings.postgres_db == cfg["database"] and settings.db_host in ("127.0.0.1", "localhost")
with SessionLocal.begin() as db:
    assert db.scalar(text("select current_database()")) == cfg["database"]
    assert db.scalar(text("select count(*) from users")) == 2
    user = db.scalar(select(User).where(User.email == cfg["admin_email"]).with_for_update())
    assert user is not None and user.role == "user" and user.is_active and not user.is_banned
    result = db.execute(update(User).where(User.id == user.id, User.role == "user", User.is_active.is_(True), User.is_banned.is_(False)).values(role="admin", updated_at=func.now()))
    assert result.rowcount == 1
`;
    runBackend(["-c", promote], { E2E_CONFIG_PATH: configPath });
    console.log("PASS single-row administrator promotion in verified isolated local database");
  } else if (phase === "seed") {
    const tab = await Tab.open(9223, "/login");
    try {
      const admin = await login(tab, config.admin, "/admin");
      assert.equal(admin.role, "admin");
      await tab.goto("/admin/settings");
      await tab.waitFor("!!document.querySelector('#rate')");
      await tab.fill("#rate", "100000");
      await tab.fill("#card", "0000000000000000");
      await tab.fill("#holder", "E2E Test Store");
      await tab.fill("#telegramUser", "irstore24_e2e_example");
      await tab.fill("#telegramUrl", "https://t.me/irstore24_e2e_example");
      await tab.fill("#instagramUrl", "https://www.instagram.com/irstore24_e2e_example/");
      await tab.click("form button[type=submit]");
      await tab.waitFor("document.body.innerText.includes('آخرین بروزرسانی:')");
      const settings = await tab.api("/api/admin/settings");
      assert.equal(settings.status, 200);
      assert.equal(settings.body.usdt_toman_rate, "100000.00000000");
      await tab.goto("/admin/cs2-items/new");
      await tab.fill("#name", "E2E AWP Test Skin");
      await tab.fill("#slug", `e2e-awp-${config.database.split("_").at(-1)}`);
      await tab.fill("#weapon", "AWP");
      await tab.fill("#float_value", "0.12345678");
      await tab.fill("#stock_quantity", "5");
      await tab.fill("#image_path", "/media/e2e/missing.webp");
      await chooseTestImage(tab, "#cs2-image-file");
      await tab.fill("#sell", "2.00500000");
      await tab.fill("#buy", "1.25000000");
      await tab.click("form button[type=submit]");
      await tab.waitFor("location.pathname === '/admin/cs2-items'");
      const cs2 = await tab.api("/api/admin/cs2-items");
      assert.equal(cs2.status, 200);
      assert.equal(cs2.body.total, 1);
      state.cs2 = cs2.body.items[0];
      assert.match(state.cs2.image_path, /^\/media\/cs2\/[a-f0-9]{32}\.webp$/);
      assert.equal((await tab.api(state.cs2.image_path)).status, 200);
      await tab.goto("/admin/tf2-keys/edit");
      await tab.fill("#stock", "10");
      await tab.fill("#sell", "1.25000000");
      await tab.fill("#buy", "0.75000000");
      await chooseTestImage(tab, "#tf2-image-file");
      await tab.click("form button[type=submit]");
      await tab.waitFor("location.pathname === '/admin/tf2-keys'");
      const tf2 = await tab.api("/api/admin/tf2-keys");
      assert.equal(tf2.status, 200);
      assert.equal(tf2.body.total, 1);
      state.tf2 = tf2.body.items[0];
      assert.match(state.tf2.image_path, /^\/media\/tf2\/[a-f0-9]{32}\.webp$/);
      assert.equal((await tab.api(state.tf2.image_path)).status, 200);
      saveState();
      console.log("PASS browser admin login, dashboard, settings, CS2 and TF2 product creation");
    } finally { await tab.close(); }
  } else if (phase === "payment-unconfigured") {
    assert(state.cs2, "Run seed phase first");
    const admin = await Tab.open(9223, "/admin/settings");
    const user = await Tab.open(9222, "/login");
    let prior;
    try {
      await login(user, config.user);
      const settings = await admin.api("/api/admin/settings");
      assert.equal(settings.status, 200);
      prior = settings.body;
      const cleared = await admin.api("/api/admin/settings", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card_number: null, card_holder_name: null, telegram_username: null, telegram_url: null }),
      });
      assert.equal(cleared.status, 200);
      const added = await user.api("/api/cart/cs2-items", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cs2_item_id: state.cs2.id, quantity: 1 }),
      });
      assert.equal(added.status, 200);
      assert.equal(added.body.payment_instructions_configured, false);
      await user.goto("/cart");
      await user.waitFor("document.body.innerText.includes('اطلاعات پرداخت فروشگاه هنوز تکمیل نشده است')");
      assert.equal(await user.eval("[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'خرید')?.disabled"), true);
      const rejected = await user.api("/api/orders/finalize", { method: "POST" });
      assert.equal(rejected.status, 503);
      assert.equal(rejected.body.detail, "Payment instructions are not configured");
      console.log("PASS browser cart explains missing payment setup and blocks checkout");
    } finally {
      if (prior) {
        const restored = await admin.api("/api/admin/settings", {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            card_number: prior.card_number, card_holder_name: prior.card_holder_name,
            telegram_username: prior.telegram_username, telegram_url: prior.telegram_url,
          }),
        });
        assert.equal(restored.status, 200);
      }
      await user.api(`/api/cart/cs2-items/${state.cs2.id}`, { method: "DELETE" });
      await user.close();
      await admin.close();
    }
  } else if (phase === "purchase") {
    assert(state.cs2 && state.tf2, "Run seed phase first");
    const tab = await Tab.open(9222, "/");
    try {
      const user = await login(tab, config.user);
      state.userId = user.id;
      const cookie = (await tab.cookies()).find(item => item.name.includes("session"));
      assert(cookie && cookie.httpOnly && cookie.sameSite === "Lax");
      assert.equal(cookie.secure, false, "HTTP is allowed only in local development");
      assert.equal(await tab.eval("Object.keys(localStorage).concat(Object.keys(sessionStorage)).filter(k => /token|session|auth/i.test(k)).length"), 0);
      await tab.goto("/account");
      assert.equal((await tab.api("/api/auth/me")).status, 200, "session survives refresh");
      assert.equal((await tab.api("/api/admin/users")).status, 403);
      const pending = await tab.api("/api/account/orders?status=pending");
      assert.equal(pending.status, 200);
      for (const order of pending.body.items) {
        const cancelled = await tab.api(`/api/account/orders/${order.order_number}/cancel`, { method: "POST" });
        assert.equal(cancelled.status, 200);
      }
      const existingCart = (await tab.api("/api/cart")).body;
      for (const line of existingCart.cs2_items) await tab.api(`/api/cart/cs2-items/${line.product.id}`, { method: "DELETE" });
      for (const line of existingCart.tf2_keys) await tab.api(`/api/cart/tf2-keys/${line.product.id}`, { method: "DELETE" });
      await tab.goto("/admin");
      assert(!(await tab.text()).includes("Dashboard"), "normal user cannot access admin navigation");
      const csrfHeaders = { Cookie: `${cookie.name}=${cookie.value}`, "Content-Type": "application/json" };
      const csrfMissing = await fetch(`http://127.0.0.1:${config.api_port}/api/cart/cs2-items`, { method: "POST", headers: csrfHeaders, body: JSON.stringify({ cs2_item_id: state.cs2.id, quantity: 1 }) });
      assert.equal(csrfMissing.status, 403);
      const csrfWrong = await fetch(`http://127.0.0.1:${config.api_port}/api/cart/cs2-items`, { method: "POST", headers: { ...csrfHeaders, Origin: "http://evil.example" }, body: JSON.stringify({ cs2_item_id: state.cs2.id, quantity: 1 }) });
      assert.equal(csrfWrong.status, 403);
      await tab.goto("/");
      assert((await tab.text()).includes("IRStore24"));
      await tab.goto("/support");
      await tab.waitFor("!!document.querySelector('a[href*=irstore24_e2e_example]')");
      const links = await tab.eval("[...document.querySelectorAll('a[href]')].map(a=>a.href).filter(h=>h.includes('irstore24_e2e_example'))");
      assert(links.some(link => link.startsWith("https://t.me/")));
      assert(links.some(link => link.startsWith("https://www.instagram.com/")));
      await tab.goto("/cs2-items");
      await tab.waitFor("document.body.innerText.includes('E2E AWP Test Skin')");
      await tab.fill("#search", "E2E AWP");
      await tab.waitFor("document.body.innerText.includes('1 آیتم')");
      await tab.fill("#weapon", "AWP");
      await tab.select("#exterior", "Field-Tested");
      await tab.waitFor("document.body.innerText.includes('E2E AWP Test Skin')");
      await tab.goto(`/cs2-items/${state.cs2.slug}`);
      await tab.waitFor("document.body.innerText.includes('E2E AWP Test Skin')");
      await tab.waitFor("!document.querySelector('img[alt=\\\"E2E AWP Test Skin\\\"]')");
      const cs2 = await tab.api(`/api/cs2-items/${state.cs2.slug}`);
      assert.equal(cs2.status, 200);
      assert.equal(cs2.body.stock_quantity, 5);
      assert.equal(cs2.body.sell_price.amount, "2.00500000");
      assert.equal(cs2.body.sell_price.toman, "200500");
      assert((await tab.text()).includes("200,500"));
      await tab.clickText("button", "افزودن به سبد خرید");
      await tab.waitFor("location.pathname === '/cart'");
      await tab.waitFor("document.body.innerText.includes('E2E AWP Test Skin')");
      await tab.goto("/tf2-keys");
      await tab.waitFor("document.body.innerText.includes('موجودی 10')");
      await tab.clickText("button", "افزودن به سبد خرید");
      await tab.waitFor("location.pathname === '/cart'");
      await tab.waitFor("document.body.innerText.includes('کلید TF2')");
      await clickArticleButton(tab, `/cs2-items/${state.cs2.slug}`, "+");
      await tab.waitFor("document.body.innerText.includes('526,000')");
      await clickArticleButton(tab, "/tf2-keys", "+");
      await tab.waitFor("document.body.innerText.includes('651,000')");
      await clickArticleButton(tab, "/tf2-keys", "حذف");
      await tab.waitFor("document.querySelectorAll('article:has(button)').length === 1");
      await tab.goto("/tf2-keys");
      await tab.waitFor("document.body.innerText.includes('موجودی 10')");
      await tab.clickText("button", "افزودن به سبد خرید");
      await tab.waitFor("location.pathname === '/cart'");
      await tab.goto("/cart");
      await tab.waitFor("document.body.innerText.includes('E2E AWP Test Skin')");
      let cart = await tab.api("/api/cart");
      assert.equal(cart.status, 200);
      assert.equal(cart.body.cs2_items[0].quantity, 2);
      assert.equal(cart.body.tf2_keys[0].quantity, 1);
      assertDecimal(cart.body.total_price_toman, "526000");
      assertDecimal(cart.body.total_price_usdt, "5.26");
      await tab.clickText("button", "خرید");
      await tab.waitFor("location.pathname.startsWith('/account/orders/')");
      state.cancelOrder = (await tab.eval("location.pathname.split('/').at(-1)"));
      await tab.waitFor("document.body.innerText.includes('شماره کارت: 0000000000000000')");
      await tab.waitFor("!!document.querySelector('strong[class*=countdownTime]') && !document.querySelector('strong[class*=countdownTime]').textContent.includes('--')");
      let order = await tab.api(`/api/account/orders/${state.cancelOrder}`);
      assert.equal(order.status, 200);
      assert.equal(order.body.status, "pending");
      assertDecimal(order.body.locked_usdt_toman_rate, "100000");
      assertDecimal(order.body.total_price_toman, "526000");
      assertDecimal(order.body.total_price_usdt, "5.26");
      assert.equal(order.body.payment.card_number, "0000000000000000");
      assert.equal((await getProduct(tab, "cs2-items", state.cs2.slug)).stock_quantity, 3);
      assert.equal((await getProduct(tab, "tf2-keys", state.tf2.id)).stock_quantity, 9);
      const forbiddenPrice = await tab.api("/api/orders/finalize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ total_price_toman: "1" }) });
      assert.equal(forbiddenPrice.status, 422, "client cannot send authoritative totals");
      globalThis.confirm = () => true;
      await tab.eval("window.confirm = () => true");
      await tab.clickText("button", "لغو سفارش");
      await tab.waitFor("document.body.innerText.includes('cancelled')");
      assert.equal((await getProduct(tab, "cs2-items", state.cs2.slug)).stock_quantity, 5);
      assert.equal((await getProduct(tab, "tf2-keys", state.tf2.id)).stock_quantity, 10);
      assert.equal((await tab.api(`/api/account/orders/${state.cancelOrder}/cancel`, { method: "POST" })).status, 409);
      assert.equal((await getProduct(tab, "cs2-items", state.cs2.slug)).stock_quantity, 5);
      assert.equal((await tab.api(`/api/account/orders/${state.cancelOrder}`)).body.payment, null);
      await tab.goto(`/cs2-items/${state.cs2.slug}`);
      await tab.waitFor("document.body.innerText.includes('E2E AWP Test Skin')");
      await tab.clickText("button", "افزودن به سبد خرید");
      await tab.waitFor("location.pathname === '/cart'");
      await tab.waitFor("document.body.innerText.includes('E2E AWP Test Skin')");
      await tab.clickText("button", "خرید");
      await tab.waitFor("location.pathname.startsWith('/account/orders/')");
      state.confirmOrder = await tab.eval("location.pathname.split('/').at(-1)");
      assert.equal((await getProduct(tab, "cs2-items", state.cs2.slug)).stock_quantity, 4);
      saveState();
      console.log("PASS browser public catalog, auth/CSRF, mixed cart, exact totals, pending order, inventory restore, second pending order");
    } finally { await tab.close(); }
  } else if (phase === "admin") {
    assert(state.confirmOrder && state.userId, "Run purchase phase first");
    const tab = await Tab.open(9223, "/admin");
    try {
      await tab.waitFor("document.body.innerText.includes('مدیریت فروشگاه')");
      assert.equal((await tab.api("/api/auth/me")).body.role, "admin");
      assert.equal((await tab.api(`/api/account/orders/${state.confirmOrder}`)).status, 404, "other account cannot read user's order");
      const priorProduct = await tab.api(`/api/admin/cs2-items/${state.cs2.id}`);
      if (priorProduct.body.deleted_at) {
        await tab.goto("/admin/cs2-items");
        await tab.select("label select", "true");
        await tab.waitFor("document.body.innerText.includes('بازیابی')");
        await tab.eval("window.confirm = () => true");
        await tab.clickText("button", "بازیابی");
        await tab.waitApiStatus(`/api/cs2-items/${state.cs2.slug}`, 200);
      }
      await tab.goto(`/admin/orders/${state.confirmOrder}`);
      const stockBeforeConfirm = (await getProduct(tab, "cs2-items", state.cs2.slug)).stock_quantity;
      if ((await tab.api(`/api/admin/orders/${state.confirmOrder}`)).body.status === "pending") {
        await tab.waitFor("document.body.innerText.includes('pending')");
        await tab.eval("window.confirm = () => true");
        await tab.clickText("button", "تأیید پرداخت");
      }
      await tab.waitFor("document.body.innerText.includes('confirmed')");
      assert.equal((await tab.api(`/api/admin/orders/${state.confirmOrder}/confirm`, { method: "POST" })).status, 409);
      const confirmed = await tab.api(`/api/admin/orders/${state.confirmOrder}`);
      assert.equal(confirmed.body.status, "confirmed");
      assert.equal(confirmed.body.payment, null);
      assertDecimal(confirmed.body.locked_usdt_toman_rate, "100000");
      assert.equal((await getProduct(tab, "cs2-items", state.cs2.slug)).stock_quantity, stockBeforeConfirm);
      await tab.goto("/admin/orders");
      await tab.waitFor(`document.body.innerText.includes(${JSON.stringify(state.confirmOrder)})`);
      await tab.goto(`/admin/cs2-items/${state.cs2.id}/edit`);
      await tab.waitFor("!!document.querySelector('#stock_quantity')");
      await tab.fill("#stock_quantity", "7");
      await tab.fill("#sell", "2.12500000");
      await tab.click("form button[type=submit]");
      await tab.waitFor("location.pathname === '/admin/cs2-items'");
      let cs2 = await tab.api(`/api/admin/cs2-items/${state.cs2.id}`);
      assert.equal(cs2.body.stock_quantity, 7);
      assertDecimal(cs2.body.sell_price.amount, "2.125");
      await tab.goto(`/admin/cs2-items/${state.cs2.id}/edit`);
      await tab.waitFor("!!document.querySelector('form input[type=checkbox]')");
      await tab.click("form input[type=checkbox]");
      await tab.click("form button[type=submit]");
      await tab.waitFor("location.pathname === '/admin/cs2-items'");
      assert.equal((await tab.api(`/api/cs2-items/${state.cs2.slug}`)).status, 404);
      assert.equal((await tab.api("/api/cs2-items")).body.total, 0);
      await tab.goto(`/admin/cs2-items/${state.cs2.id}/edit`);
      await tab.waitFor("!!document.querySelector('form input[type=checkbox]')");
      await tab.click("form input[type=checkbox]");
      await tab.click("form button[type=submit]");
      await tab.waitFor("location.pathname === '/admin/cs2-items'");
      assert.equal((await tab.api(`/api/cs2-items/${state.cs2.slug}`)).status, 200);
      await tab.eval("window.confirm = () => true");
      await tab.clickText("button", "حذف");
      await tab.waitApiStatus(`/api/cs2-items/${state.cs2.slug}`, 404);
      assert.equal((await tab.api(`/api/cs2-items/${state.cs2.slug}`)).status, 404);
      await tab.select("label select", "true");
      await tab.waitFor("document.body.innerText.includes('بازیابی')");
      await tab.eval("window.confirm = () => true");
      await tab.clickText("button", "بازیابی");
      await tab.waitApiStatus(`/api/cs2-items/${state.cs2.slug}`, 200);
      assert.equal((await tab.api(`/api/cs2-items/${state.cs2.slug}`)).status, 200);
      await tab.goto(`/admin/tf2-keys/edit?id=${state.tf2.id}`);
      await tab.waitFor("!!document.querySelector('#stock')");
      await tab.fill("#stock", "6");
      await tab.fill("#sell", "1.75000000");
      await tab.click("form button[type=submit]");
      await tab.waitFor("location.pathname === '/admin/tf2-keys'");
      assert.equal((await getProduct(tab, "tf2-keys", state.tf2.id)).stock_quantity, 6);
      await tab.goto(`/admin/tf2-keys/edit?id=${state.tf2.id}`);
      await tab.waitFor("!!document.querySelector('form input[type=checkbox]')");
      await tab.click("form input[type=checkbox]");
      await tab.click("form button[type=submit]");
      await tab.waitFor("location.pathname === '/admin/tf2-keys'");
      assert.equal((await tab.api("/api/tf2-keys")).body.total, 0);
      await tab.goto(`/admin/tf2-keys/edit?id=${state.tf2.id}`);
      await tab.waitFor("!!document.querySelector('form input[type=checkbox]')");
      await tab.click("form input[type=checkbox]");
      await tab.click("form button[type=submit]");
      await tab.waitFor("location.pathname === '/admin/tf2-keys'");
      assert.equal((await tab.api("/api/tf2-keys")).body.total, 1);
      await tab.goto("/admin/settings");
      await tab.waitFor("!!document.querySelector('#rate')");
      await tab.fill("#rate", "110000");
      await tab.click("form button[type=submit]");
      await tab.waitFor("document.body.innerText.includes('110,000')");
      assertDecimal((await tab.api("/api/admin/settings")).body.usdt_toman_rate, "110000");
      assertDecimal((await tab.api(`/api/admin/orders/${state.confirmOrder}`)).body.locked_usdt_toman_rate, "100000");
      await tab.goto("/admin/users");
      await tab.waitFor(`document.body.innerText.includes(${JSON.stringify(config.user.email)})`);
      await tab.goto(`/admin/users/${state.userId}`);
      await tab.waitFor(`document.body.innerText.includes(${JSON.stringify(config.user.email)})`);
      console.log("PASS browser admin confirmation, invalid transition, product edit/hide/delete/restore, TF2 management, settings update, user list/detail");
    } finally { await tab.close(); }
  } else if (phase === "remaining-orders") {
    assert(state.confirmOrder && state.cancelOrder, "Run purchase and admin phases first");
    const user = await Tab.open(9222, "/account/orders");
    const admin = await Tab.open(9223, "/admin/orders");
    try {
      await user.waitFor(`document.body.innerText.includes(${JSON.stringify(state.confirmOrder)})`);
      assert((await user.text()).includes(state.cancelOrder));
      await user.goto(`/account/orders/${state.confirmOrder}`);
      await user.waitFor("document.body.innerText.includes('confirmed')");
      assert(!(await user.text()).includes("شماره کارت:"));
      assert.equal((await user.api(`/api/account/orders/${state.confirmOrder}`)).body.payment, null);
      const stockBefore = (await getProduct(user, "cs2-items", state.cs2.slug)).stock_quantity;
      state.adminCancelOrder = await createPendingCS2(user);
      assert.equal((await getProduct(user, "cs2-items", state.cs2.slug)).stock_quantity, stockBefore - 1);
      await admin.goto(`/admin/orders/${state.adminCancelOrder}`);
      await admin.waitFor("document.body.innerText.includes('pending')");
      await admin.eval("window.confirm = () => true");
      await admin.clickText("button", "لغو سفارش");
      await admin.waitFor("document.body.innerText.includes('cancelled')");
      assert.equal((await getProduct(user, "cs2-items", state.cs2.slug)).stock_quantity, stockBefore);
      assert.equal((await admin.api(`/api/admin/orders/${state.adminCancelOrder}/cancel`, { method: "POST" })).status, 409);
      assert.equal((await getProduct(user, "cs2-items", state.cs2.slug)).stock_quantity, stockBefore);
      state.expireOrder = await createPendingCS2(user);
      assert.equal((await getProduct(user, "cs2-items", state.cs2.slug)).stock_quantity, stockBefore - 1);
      const update = `import os
from sqlalchemy import text
from app.core.config import settings
from app.core.database import engine
assert settings.postgres_db == "${config.database}" and settings.db_host in ("127.0.0.1", "localhost")
with engine.begin() as db:
    assert db.scalar(text("select current_database()")) == "${config.database}"
    result = db.execute(text("update orders set expires_at = now() - interval '1 minute' where order_number = :number and status = 'pending'"), {"number": os.environ["E2E_ORDER_NUMBER"]})
    assert result.rowcount == 1
`;
      runBackend(["-c", update], { E2E_ORDER_NUMBER: state.expireOrder });
      assert.equal(runBackend(["-m", "app.jobs.expire_orders", "--batch-size", "100"]), "Expired 1 order(s)");
      assert.equal((await user.api(`/api/account/orders/${state.expireOrder}`)).body.status, "expired");
      assert.equal((await user.api(`/api/account/orders/${state.expireOrder}`)).body.payment, null);
      assert.equal((await getProduct(user, "cs2-items", state.cs2.slug)).stock_quantity, stockBefore);
      assert.equal(runBackend(["-m", "app.jobs.expire_orders", "--batch-size", "100"]), "Expired 0 order(s)");
      assert.equal((await getProduct(user, "cs2-items", state.cs2.slug)).stock_quantity, stockBefore);
      assert.equal((await admin.api(`/api/admin/orders/${state.expireOrder}/confirm`, { method: "POST" })).status, 409);
      await user.goto("/account/orders");
      await user.waitFor(`document.body.innerText.includes(${JSON.stringify(state.expireOrder)})`);
      for (const number of [state.cancelOrder, state.confirmOrder, state.adminCancelOrder, state.expireOrder]) {
        assert((await user.text()).includes(number));
      }
      saveState();
      console.log("PASS browser admin cancellation, user order history, exact stock restoration, expiration job and idempotency");
    } finally { await user.close(); await admin.close(); }
  } else if (phase === "accounts") {
    assert(state.userId, "Run purchase phase first");
    const user = await Tab.open(9222, "/account");
    const admin = await Tab.open(9223, `/admin/users/${state.userId}`);
    try {
      assert.equal((await user.api("/api/auth/me")).status, 200);
      await admin.waitFor("!!document.querySelector('#banType')");
      await admin.select("#banType", "temporary");
      await admin.fill("#minutes", "30");
      await admin.fill("#reason", "E2E temporary test");
      await admin.eval("window.confirm = () => true");
      await admin.clickText("button", "Ban User");
      await admin.waitApiField(`/api/admin/users/${state.userId}`, "ban_status", "temporary");
      assert.equal((await user.api("/api/auth/me")).status, 401, "temporary ban revokes sessions");
      const bannedLogin = await user.api("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(config.user) });
      assert.equal(bannedLogin.status, 401);
      await admin.clickText("button", "Unban User");
      await admin.waitApiField(`/api/admin/users/${state.userId}`, "ban_status", "not_banned");
      await login(user, config.user);
      await admin.waitFor("!!document.querySelector('#banType')");
      await admin.select("#banType", "permanent");
      await admin.fill("#reason", "E2E permanent test");
      await admin.eval("window.confirm = () => true");
      await admin.clickText("button", "Ban User");
      await admin.waitApiField(`/api/admin/users/${state.userId}`, "ban_status", "permanent");
      assert.equal((await user.api("/api/auth/me")).status, 401, "permanent ban revokes sessions");
      await admin.clickText("button", "Unban User");
      await admin.waitApiField(`/api/admin/users/${state.userId}`, "ban_status", "not_banned");
      await login(user, config.user);
      await admin.eval("window.confirm = () => true");
      await admin.clickText("button", "غیرفعال‌سازی حساب");
      await admin.waitApiField(`/api/admin/users/${state.userId}`, "is_active", false);
      assert.equal((await user.api("/api/auth/me")).status, 401, "deactivation revokes sessions");
      const inactiveLogin = await user.api("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(config.user) });
      assert.equal(inactiveLogin.status, 401);
      await admin.clickText("button", "فعال‌سازی حساب");
      await admin.waitApiField(`/api/admin/users/${state.userId}`, "is_active", true);
      await login(user, config.user);
      await user.goto("/account");
      await user.waitFor("document.body.innerText.includes('خروج از حساب')");
      await user.clickText("button", "خروج از حساب");
      await user.waitFor("location.pathname === '/login'");
      assert.equal((await user.api("/api/auth/me")).status, 401);
      assert.equal((await user.api("/api/account/orders")).status, 401);
      assert(!(await user.cookies()).some(item => item.name.includes("session")));
      await user.fill("#email", config.user.email);
      await user.fill("#password", "invalid-password");
      await user.click("form button[type=submit]");
      await user.waitFor("!!document.querySelector('[role=alert]')");
      await login(user, config.user);
      await user.goto("/account");
      await user.waitFor("document.body.innerText.includes('خروج از حساب')");
      await user.clickText("button", "خروج از حساب");
      await user.waitFor("location.pathname === '/login'");
      console.log("PASS browser temporary/permanent ban, unban, deactivation, session revocation, failed login, logout and access restrictions");
    } finally { await user.close(); await admin.close(); }
  } else if (phase === "availability") {
    assert(state.cs2 && state.tf2 && state.userId, "Run earlier phases first");
    const user = await Tab.open(9222, "/cs2-items");
    const admin = await Tab.open(9223, `/admin/cs2-items/${state.cs2.id}/edit`);
    try {
      await admin.waitFor("!!document.querySelector('#stock_quantity')");
      await admin.fill("#stock_quantity", "0");
      await admin.click("form button[type=submit]");
      await admin.waitFor("location.pathname === '/admin/cs2-items'");
      await user.goto("/cs2-items");
      await user.waitFor("document.body.innerText.includes('E2E AWP Test Skin')");
      assert((await user.text()).includes("ناموجود"));
      await user.click("aside input[type=checkbox]");
      await user.waitFor("document.body.innerText.includes('آیتمی پیدا نشد')");
      await user.goto(`/cs2-items/${state.cs2.slug}`);
      await user.waitFor("document.body.innerText.includes('ناموجود')");
      assert.equal(await user.eval("[...document.querySelectorAll('button')].find(b => b.textContent.includes('ناموجود'))?.disabled"), true);
      assert.equal((await user.api(`/api/cs2-items/${state.cs2.slug}`)).body.available, false);
      await admin.goto(`/admin/cs2-items/${state.cs2.id}/edit`);
      await admin.waitFor("!!document.querySelector('#stock_quantity')");
      await admin.fill("#stock_quantity", "7");
      await admin.click("form button[type=submit]");
      await admin.waitFor("location.pathname === '/admin/cs2-items'");
      await admin.goto(`/admin/tf2-keys/edit?id=${state.tf2.id}`);
      await admin.waitFor("!!document.querySelector('#stock')");
      await admin.fill("#stock", "0");
      await admin.click("form button[type=submit]");
      await admin.waitFor("location.pathname === '/admin/tf2-keys'");
      await user.goto("/tf2-keys");
      await user.waitFor("document.body.innerText.includes('ناموجود')");
      assert.equal(await user.eval("[...document.querySelectorAll('button')].find(b => b.textContent.includes('افزودن به سبد خرید'))?.disabled"), true);
      assert.equal((await getProduct(user, "tf2-keys", state.tf2.id)).available, false);
      await admin.goto(`/admin/tf2-keys/edit?id=${state.tf2.id}`);
      await admin.waitFor("!!document.querySelector('#stock')");
      await admin.fill("#stock", "6");
      await admin.click("form button[type=submit]");
      await admin.waitFor("location.pathname === '/admin/tf2-keys'");
      await login(user, config.user);
      const expireSession = `import os
from sqlalchemy import text
from app.core.config import settings
from app.core.database import engine
assert settings.postgres_db == "${config.database}" and settings.db_host in ("127.0.0.1", "localhost")
with engine.begin() as db:
    assert db.scalar(text("select current_database()")) == "${config.database}"
    result = db.execute(text("update user_sessions set expires_at = now() - interval '1 minute' where user_id = (select id from users where email = :email) and revoked_at is null"), {"email": os.environ["E2E_USER_EMAIL"]})
    assert result.rowcount >= 1
`;
      runBackend(["-c", expireSession], { E2E_USER_EMAIL: config.user.email });
      assert.equal((await user.api("/api/auth/me")).status, 401);
      assert.equal((await user.api("/api/account/orders")).status, 401);
      console.log("PASS browser CS2/TF2 out-of-stock states, available filter, disabled purchases, and expired session rejection");
    } finally { await user.close(); await admin.close(); }
  } else if (phase === "settings-feedback") {
    const tab = await Tab.open(9223, "/admin/settings");
    try {
      await tab.waitFor("!!document.querySelector('#rate')");
      const rate = (await tab.api("/api/admin/settings")).body.usdt_toman_rate;
      await tab.fill("#rate", rate);
      await tab.click("form button[type=submit]");
      await tab.waitFor("document.querySelector('[role=status]')?.innerText.includes('تنظیمات ذخیره شد')");
      assertDecimal((await tab.api("/api/admin/settings")).body.usdt_toman_rate, rate);
      console.log("PASS browser admin settings successful-save feedback");
    } finally { await tab.close(); }
  } else {
    throw new Error(`Unknown phase: ${phase}`);
  }
}
run().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
