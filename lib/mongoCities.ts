export const MONGO_CITY_MAP: Record<string, { city: string; tour: string }> = {
  'Budapest Pub Crawl':     { city: 'Budapest', tour: 'Pub Crawl' },
  'Stockholm Uppsala Tour': { city: 'Stockholm', tour: 'Uppsala Tour' },
  'Berlin Beer Food':       { city: 'Berlin Beer Food', tour: 'Berlin Beer Food' },
}

export function isMongoCity(city: string): boolean {
  return city in MONGO_CITY_MAP
}
