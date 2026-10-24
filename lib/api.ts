export type Currency = "USDT" | "TOMAN";
export type Exterior = "Factory New" | "Minimal Wear" | "Field-Tested" | "Well-Worn" | "Battle-Scarred";
export type Price = { amount: string; currency: Currency; toman: string | null; usdt: string | null };
export type Page<T> = { items: T[]; total: number; page: number; page_size: number };
export type User = { id: number; email: string; role: "user" | "admin"; is_active: boolean; created_at: string };
export type CS2Item = { id: number; slug: string; name: string; description: string | null; weapon: string; exterior: Exterior; float_value: string; stock_quantity: number; image_path: string | null; available: boolean; sell_price: Price; buy_price: Price };
export type AdminCS2Item = CS2Item & { is_active: boolean; deleted_at: string | null; created_at: string; updated_at: string };
export type TF2Key = { id: number; stock_quantity: number; available: boolean; sell_price: Price; buy_price: Price };
export type AdminTF2Key = TF2Key & { is_active: boolean; created_at: string; updated_at: string };
export type PublicSettings = { usdt_toman_rate: string | null; telegram_username: string | null; telegram_url: string | null; instagram_url: string | null };
export type AdminSettings = { id: number; usdt_toman_rate: string; card_number: string | null; card_holder_name: string | null; telegram_username: string | null; telegram_url: string | null; instagram_url: string | null; order_reservation_minutes: number; updated_at: string; updated_by: number | null };
export type Cart = { cs2_items: { quantity: number; purchasable: boolean; product: CS2Item }[]; tf2_keys: { quantity: number; purchasable: boolean; product: TF2Key }[]; total_price_toman: string | null; total_price_usdt: string | null; exchange_rate_configured: boolean };
export type OrderStatus = "pending" | "confirmed" | "cancelled" | "expired";
export type Order = { order_number: string; status: OrderStatus; locked_usdt_toman_rate: string; total_price_toman: string; total_price_usdt: string; created_at: string; expires_at: string; confirmed_at: string | null; cancelled_at: string | null; expired_at: string | null };
export type OrderDetail = Order & { cs2_items: { cs2_item_id: number | null; name: string; weapon: string; exterior: string; float_value: string; quantity: number; unit_price_toman: string; unit_price_usdt: string }[]; tf2_keys: { tf2_key_id: number | null; quantity: number; unit_price_toman: string; unit_price_usdt: string }[]; payment: { card_number: string | null; card_holder_name: string | null; telegram_username: string | null; telegram_url: string | null } | null };
export type AdminOrder = Order & { user_id: number; user_email: string };
export type AdminOrderDetail = OrderDetail & { user_id: number; user_email: string; confirmed_by: number | null; cancelled_by: number | null };
export type AdminUser = User & { ban_status: "not_banned" | "temporary" | "permanent"; banned_until: string | null; ban_reason: string | null; banned_at: string | null; banned_by: number | null };

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); this.name = "ApiError"; }
}

function detailMessage(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((part) => typeof part?.msg === "string" ? part.msg : "Invalid input").join("؛ ");
  return "درخواست انجام نشد.";
}

export async function api<T>(path: `/api/${string}`, options: { method?: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  try {
    const response = await fetch(path, {
      method: options.method ?? "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: options.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
    if (!response.ok) {
      let detail: unknown;
      try { detail = (await response.json()).detail; } catch { /* non JSON response */ }
      throw new ApiError(response.status, detailMessage(detail));
    }
    return response.status === 204 ? undefined as T : await response.json() as T;
  } catch (error) {
    if (error instanceof ApiError || (error instanceof Error && error.name === "AbortError")) throw error;
    throw new ApiError(0, "ارتباط با سرور برقرار نشد. دوباره تلاش کنید.");
  }
}

export function errorMessage(error: unknown): string { return error instanceof Error ? error.message : "درخواست انجام نشد."; }
export function money(value: string | null | undefined): string {
  if (value == null) return "—";
  const [whole, fraction] = value.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const trimmed = fraction?.replace(/0+$/, "");
  return trimmed ? `${grouped}.${trimmed}` : grouped;
}
export function priceText(price: Price): string {
  return `${money(price.amount)} ${price.currency}${price.toman !== null && price.currency !== "TOMAN" ? ` · ${money(price.toman)} تومان` : ""}${price.usdt !== null && price.currency !== "USDT" ? ` · ${money(price.usdt)} USDT` : ""}`;
}
export function dateText(value: string): string { return new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
export function query(values: Record<string, string | number | boolean | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) if (value !== undefined && value !== "") params.set(key, String(value));
  const result = params.toString();
  return result ? `?${result}` : "";
}
