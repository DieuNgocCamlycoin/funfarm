export type QuantityUnit =
  | "kg"
  | "g"
  | "ton"
  | "piece"
  | "box"
  | "pack"
  | "bunch"
  | "dozen"
  | "liter"
  | "tray";

export const UNIT_LABELS: Record<QuantityUnit, string> = {
  kg: "kg",
  g: "g",
  ton: "tấn",
  piece: "cái",
  box: "hộp",
  pack: "gói",
  bunch: "bó",
  dozen: "chục",
  liter: "lít",
  tray: "khay",
};

export function formatQuantity(value: number, unit: QuantityUnit | string): string {
  const label = UNIT_LABELS[unit as QuantityUnit] || unit;
  return `${value.toLocaleString("vi-VN")} ${label}`;
}

export function normalizeKg(value: number, unit: QuantityUnit | string): number {
  switch (unit) {
    case "kg":
      return value;
    case "g":
      return value / 1000;
    case "ton":
      return value * 1000;
    default:
      return value;
  }
}
