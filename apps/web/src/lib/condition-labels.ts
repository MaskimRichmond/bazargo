export const CONDITION_LABELS: Record<string, string> = {
  "NEW": "Новое",
  "USED_LIKE_NEW": "Б/у (идеальное)",
  "USED_GOOD": "Б/у (хорошее)",
  "USED_FAIR": "Б/у (нормальное)",
  "FOR_PARTS": "На запчасти",
  "ANY": "Любое"
}

export function getConditionLabel(condition: string | null | undefined): string {
  if (!condition) return "Не указано"
  return CONDITION_LABELS[condition] || condition
}
