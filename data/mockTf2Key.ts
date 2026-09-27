export type TF2Key = {
  id: number;
  name: string;
  description: string;

  stockQuantity: number;

  sellPriceToman: number;
  sellPriceUsdt: number;

  buyPriceToman: number;
  buyPriceUsdt: number;

  isActive: boolean;
};

export const mockTf2Key: TF2Key = {
  id: 1,

  name: "Mann Co. Supply Crate Key",

  description:
    "کلید TF2 برای خرید و فروش در IRStore24. قیمت خرید و فروش به تومان و USDT نمایش داده می‌شود.",

  stockQuantity: 150,

  sellPriceToman: 175000,
  sellPriceUsdt: 1.75,

  buyPriceToman: 155000,
  buyPriceUsdt: 1.55,

  isActive: true,
};
