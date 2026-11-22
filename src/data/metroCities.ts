// Major metro cities to feature in the tiles and top heading
export const METRO_CITY_IDS = [
  'mumbai',
  'delhi',
  'bengaluru',
  'hyderabad',
  'chennai',
  'ahmedabad',
  'kolkata',
  'pune',
] as const

export function hasCityLandmark(cityId: string): boolean {
  return (METRO_CITY_IDS as readonly string[]).includes(cityId)
}
