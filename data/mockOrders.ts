export type OrderStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "expired";

export type MockOrder = {
  id: number;
  orderNumber: string;
  status: OrderStatus;

  totalPriceToman: number;
  totalPriceUsdt: number;

  createdAt: string;
  expiresAt: string | null;

  itemCount: number;
};

export const mockOrders: MockOrder[] = [
  {
    id: 1,
    orderNumber: "IR-10427",
    status: "pending",

    totalPriceToman: 9850000,
    totalPriceUsdt: 100,

    createdAt: "2026-09-27T19:30:00+03:30",
    expiresAt: "2026-09-27T21:30:00+03:30",

    itemCount: 2,
  },
  {
    id: 2,
    orderNumber: "IR-10381",
    status: "confirmed",

    totalPriceToman: 21375000,
    totalPriceUsdt: 213.75,

    createdAt: "2026-09-22T14:15:00+03:30",
    expiresAt: null,

    itemCount: 7,
  },
  {
    id: 3,
    orderNumber: "IR-10294",
    status: "expired",

    totalPriceToman: 5200000,
    totalPriceUsdt: 52,

    createdAt: "2026-09-15T18:00:00+03:30",
    expiresAt: null,

    itemCount: 1,
  },
];

export function getMockOrderByNumber(
  orderNumber: string,
) {
  return mockOrders.find(
    (order) => order.orderNumber === orderNumber,
  );
}
