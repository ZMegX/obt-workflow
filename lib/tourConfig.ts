export interface TourConfig {
  city: string
  period: 'AM' | 'PM'
  tour: string
}

export const ALL_TOURS: TourConfig[] = [
  { city: 'Berlin',              period: 'AM', tour: 'Walking Tour' },
  { city: 'Berlin Sachsenhausen', period: 'AM', tour: 'Sachsenhausen' },
  { city: 'Berlin Alternative',  period: 'AM', tour: 'Alternative' },
  { city: 'Berlin Beer Food',    period: 'AM', tour: 'Berlin Beer Food' },
  { city: 'Budapest',            period: 'PM', tour: 'Pub Crawl' },
  { city: 'Barcelona',           period: 'PM', tour: 'Pub Crawl' },
  { city: 'Berlin',              period: 'PM', tour: 'Pub Crawl' },
  { city: 'Stockholm',           period: 'PM', tour: 'Pub Crawl' },
  { city: 'Hamburg',             period: 'PM', tour: 'Pub Crawl' },
  { city: 'Paris',               period: 'PM', tour: 'Pub Crawl' },
  { city: 'Amsterdam',           period: 'PM', tour: 'Pub Crawl' },
]
