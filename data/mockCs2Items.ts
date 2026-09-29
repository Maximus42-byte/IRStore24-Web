export type CS2Item = {
  id: number;
  slug: string;
  name: string;
  description: string;
  weapon: string;
  exterior: string;
  floatValue: number;
  stockQuantity: number;
  isActive: boolean;

  sellPriceToman: number;
  sellPriceUsdt: number;

  buyPriceToman: number;
  buyPriceUsdt: number;
};

export const mockCs2Items: CS2Item[] = [
  {
    id: 1,
    slug: "ak47-redline-ft",
    name: "AK-47 | Redline",
    description:
      "آیتم AK-47 | Redline با Exterior نوع Field-Tested. مناسب برای کاربرانی که به طراحی کلاسیک Redline علاقه دارند.",
    weapon: "AK-47",
    exterior: "Field-Tested",
    floatValue: 0.231284,
    stockQuantity: 3,
    isActive: true,

    sellPriceToman: 8500000,
    sellPriceUsdt: 85,

    buyPriceToman: 7500000,
    buyPriceUsdt: 75,
  },
  {
    id: 2,
    slug: "awp-asiimov-ft",
    name: "AWP | Asiimov",
    description:
      "آیتم AWP | Asiimov با Exterior نوع Field-Tested و طراحی شناخته‌شده Asiimov.",
    weapon: "AWP",
    exterior: "Field-Tested",
    floatValue: 0.284901,
    stockQuantity: 2,
    isActive: true,

    sellPriceToman: 12000000,
    sellPriceUsdt: 120,

    buyPriceToman: 10500000,
    buyPriceUsdt: 105,
  },
  {
    id: 3,
    slug: "m4a1s-printstream-mw",
    name: "M4A1-S | Printstream",
    description:
      "آیتم M4A1-S | Printstream با Exterior نوع Minimal Wear و Float پایین.",
    weapon: "M4A1-S",
    exterior: "Minimal Wear",
    floatValue: 0.094815,
    stockQuantity: 1,
    isActive: true,

    sellPriceToman: 10200000,
    sellPriceUsdt: 102,

    buyPriceToman: 9000000,
    buyPriceUsdt: 90,
  },
  {
    id: 4,
    slug: "glock-vogue-fn",
    name: "Glock-18 | Vogue",
    description:
      "آیتم Glock-18 | Vogue با Exterior نوع Factory New و وضعیت ظاهری بسیار تمیز.",
    weapon: "Glock-18",
    exterior: "Factory New",
    floatValue: 0.047321,
    stockQuantity: 4,
    isActive: true,

    sellPriceToman: 3100000,
    sellPriceUsdt: 31,

    buyPriceToman: 2700000,
    buyPriceUsdt: 27,
  },
  {
    id: 5,
    slug: "usp-s-kill-confirmed-bs",
    name: "USP-S | Kill Confirmed",
    description:
      "آیتم USP-S | Kill Confirmed با Exterior نوع Battle-Scarred. این نمونه فعلاً در فروشگاه موجود نیست.",
    weapon: "USP-S",
    exterior: "Battle-Scarred",
    floatValue: 0.612544,
    stockQuantity: 0,
    isActive: true,

    sellPriceToman: 5200000,
    sellPriceUsdt: 52,

    buyPriceToman: 4400000,
    buyPriceUsdt: 44,
  },
  {
    id: 6,
    slug: "desert-eagle-printstream-ww",
    name: "Desert Eagle | Printstream",
    description:
      "آیتم Desert Eagle | Printstream با Exterior نوع Well-Worn.",
    weapon: "Desert Eagle",
    exterior: "Well-Worn",
    floatValue: 0.417831,
    stockQuantity: 2,
    isActive: true,

    sellPriceToman: 6800000,
    sellPriceUsdt: 68,

    buyPriceToman: 5900000,
    buyPriceUsdt: 59,
  },
];

export const publicMockCs2Items =
  mockCs2Items.filter((item) => item.isActive);

export function getMockCs2ItemBySlug(
  slug: string,
) {
  return mockCs2Items.find(
    (item) => item.slug === slug,
  );
}
