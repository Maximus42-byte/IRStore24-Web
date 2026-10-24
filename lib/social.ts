// Existing public store contact links; admin settings override these when configured.
export const TELEGRAM_URL = "https://t.me/IRStoore";
export const INSTAGRAM_URL = "https://www.instagram.com/irstore_community?igsh=MTZjYzk2bWFqNTdsbg%3D%3D&utm_source=qr";
export function safeExternalUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" ? parsed.href : null;
  } catch {
    return null;
  }
}
