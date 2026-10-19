export const REGIONS = [
  "Бишкек",
  "Ош",
  "Баткенская область",
  "Джалал-Абадская область",
  "Иссык-Кульская область",
  "Нарынская область",
  "Ошская область",
  "Таласская область",
  "Чуйская область"
] as const;

export type Region = typeof REGIONS[number];

export const CITIES_BY_REGION: Record<Region, string[]> = {
  "Бишкек": ["Бишкек"],
  "Ош": ["Ош"],
  "Баткенская область": ["Баткен", "Кызыл-Кия", "Сулюкта", "Исфана", "Кадамжай"],
  "Джалал-Абадская область": ["Джалал-Абад", "Таш-Кумыр", "Майлуу-Суу", "Кара-Куль", "Кочкор-Ата", "Кербен"],
  "Иссык-Кульская область": ["Каракол", "Балыкчы", "Чолпон-Ата"],
  "Нарынская область": ["Нарын"],
  "Ошская область": ["Узген", "Кара-Суу", "Ноокат"],
  "Таласская область": ["Талас"],
  "Чуйская область": ["Токмок", "Кант", "Кара-Балта", "Шопоков"]
};

// Helper for guessing region based on existing city name
export function guessRegionByCity(city: string): string | null {
  for (const [region, cities] of Object.entries(CITIES_BY_REGION)) {
    if (cities.includes(city) || city === region) {
      return region;
    }
  }
  return null;
}
