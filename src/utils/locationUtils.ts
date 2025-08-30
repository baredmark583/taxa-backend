// A simple utility to map major Ukrainian cities to their respective oblasts (regions).
// This is a simplified approach. A more robust solution would involve a proper geocoding service or a database of locations.

const cityToRegionMap: { [key: string]: string } = {
    'Київ': "Київська область",
    'Харків': "Харківська область",
    'Одеса': "Одеська область",
    'Дніпро': "Дніпропетровська область",
    'Львів': "Львівська область",
    'Запоріжжя': "Запорізька область",
    'Кривий Ріг': "Дніпропетровська область",
    'Миколаїв': "Миколаївська область",
    'Вінниця': "Вінницька область",
    'Херсон': "Херсонська область",
    'Полтава': "Полтавська область",
    'Чернігів': "Чернігівська область",
    'Черкаси': "Черкаська область",
    'Суми': "Сумська область",
    'Житомир': "Житомирська область",
    'Хмельницький': "Хмельницька область",
    'Рівне': "Рівненська область",
    'Кропивницький': "Кіровоградська область",
    'Івано-Франківськ': "Івано-Франківська область",
    'Тернопіль': "Тернопільська область",
    'Луцьк': "Волинська область",
    'Ужгород': "Закарпатська область",
    'Чернівці': "Чернівецька область",
    // Add more cities as needed
};

/**
 * Returns the region (oblast) for a given city name.
 * @param city The name of the city.
 * @returns The name of the region or null if not found.
 */
export const getRegionFromCity = (city: string): string | null => {
    // Try for an exact match first
    if (cityToRegionMap[city]) {
        return cityToRegionMap[city];
    }
    // Try a case-insensitive match
    const lowerCity = city.toLowerCase();
    for (const key in cityToRegionMap) {
        if (key.toLowerCase() === lowerCity) {
            return cityToRegionMap[key];
        }
    }
    return null;
};