const balanceFormatter = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatBalance(value: number | string) {
  return balanceFormatter.format(Number(value));
}
