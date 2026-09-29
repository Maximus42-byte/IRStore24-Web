export type OrderStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "expired";

export type MockOrderItem = {
  id: number;
  type: "cs2" | "tf2";

  name: string;
  description: string;

  quantity: number;

  unitPriceToman: number;
  unitPriceUsdt: number;
};

export type MockOrder = {
  id: number;
  orderNumber: string;
  status: OrderStatus;

  totalPriceToman: number;
  totalPriceUsdt: number;

  lockedUsdtTomanRate: number;

  createdAt: string;
  expiresAt: string | null;

  itemCount: number;

  items: MockOrderItem[];
};

export const mockOrders: MockOrder[] = [
  {
    id: 1,
    orderNumber: "IR-10427",
    status: "pending",

    totalPriceToman: 9850000,
    totalPriceUsdt: 100,

    lockedUsdtTomanRate: 98500,

    createdAt: "2026-09-27T19:30:00+03:30",
    expiresAt: "2026-09-29T07:30:00+03:30",
    itemCount: 2,

    items: [
      {
        id: 1,
        type: "cs2",

        name: "AK-47 | Redline",
        description: "Field-Tested · Float 0.231284",

        quantity: 1,

        unitPriceToman: 8500000,
        unitPriceUsdt: 85,
      },
      {
        id: 2,
        type: "tf2",

        name: "Mann Co. Supply Crate Key",
        description: "TF2 Key",

        quantity: 1,

        unitPriceToman: 1350000,
        unitPriceUsdt: 15,
      },
    ],
  },

  {
    id: 2,
    orderNumber: "IR-10381",
    status: "confirmed",

    totalPriceToman: 21375000,
    totalPriceUsdt: 213.75,

    lockedUsdtTomanRate: 100000,

    createdAt: "2026-09-22T14:15:00+03:30",
    expiresAt: null,

    itemCount: 7,

    items: [
      {
        id: 3,
        type: "cs2",

        name: "AK-47 | Redline",
        description: "Field-Tested · Float 0.231284",

        quantity: 1,

        unitPriceToman: 8500000,
        unitPriceUsdt: 85,
      },
      {
        id: 4,
        type: "cs2",

        name: "AWP | Asiimov",
        description: "Field-Tested · Float 0.284901",

        quantity: 1,

        unitPriceToman: 12000000,
        unitPriceUsdt: 120,
      },
      {
        id: 5,
        type: "tf2",

        name: "Mann Co. Supply Crate Key",
        description: "TF2 Key",

        quantity: 5,

        unitPriceToman: 175000,
        unitPriceUsdt: 1.75,
      },
    ],
  },

  {
    id: 3,
    orderNumber: "IR-10294",
    status: "expired",

    totalPriceToman: 5200000,
    totalPriceUsdt: 52,

    lockedUsdtTomanRate: 100000,

    createdAt: "2026-09-15T18:00:00+03:30",
    expiresAt: null,

    itemCount: 1,

    items: [
      {
        id: 6,
        type: "cs2",

        name: "USP-S | Kill Confirmed",
        description: "Battle-Scarred · Float 0.612544",

        quantity: 1,

        unitPriceToman: 5200000,
        unitPriceUsdt: 52,
      },
    ],
  },
];

export function getMockOrderByNumber(
  orderNumber: string,
) {
  return mockOrders.find(
    (order) => order.orderNumber === orderNumber,
  );
}
