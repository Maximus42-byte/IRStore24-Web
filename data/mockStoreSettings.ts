export type MockStoreSettings = {
  usdtTomanRate: number;

  cardNumber: string;
  cardHolderName: string;

  telegramUsername: string;
  telegramUrl: string;
  instagramUrl: string;

  orderReservationMinutes: number;

  updatedAt: string;
  updatedBy: string;
};

export const mockStoreSettings: MockStoreSettings = {
  usdtTomanRate: 100000,

  // Real payment information has not been configured yet.
  cardNumber: "",
  cardHolderName: "",

  telegramUsername: "IRStoore",
  telegramUrl: "https://t.me/IRStoore",

  instagramUrl:
    "https://www.instagram.com/irstore_community?igsh=MTZjYzk2bWFqNTdsbg%3D%3D&utm_source=qr",

  orderReservationMinutes: 120,

  updatedAt: "2026-09-29T07:30:00+03:30",
  updatedBy: "admin@example.com",
};
