import { Prisma } from "@prisma/client";

export function calculatePricePerMillionTokens(coefficient: number): Prisma.Decimal {
  const basePriceRubles = 5;
  const priceMultiplier = 2;

  return new Prisma.Decimal(basePriceRubles)
    .mul(coefficient)
    .mul(priceMultiplier)
    .toDecimalPlaces(8);
}
