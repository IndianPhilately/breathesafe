export type CityDashboardData = {
  id: string
  city: string
  state: string
  weather: {
    temperatureC: number
    condition: string
    humidityPercent: number
    windKph: number
  }
  airQuality: {
    aqi: number
    pm25: number
    pm10: number
  }
}

export const cityDashboardData: CityDashboardData[] = [
  {
    id: 'ahmedabad',
    city: 'Ahmedabad',
    state: 'Gujarat',
    weather: {
      temperatureC: 31,
      condition: 'Partly cloudy',
      humidityPercent: 48,
      windKph: 12,
    },
    airQuality: { aqi: 112, pm25: 42, pm10: 76 },
  },
  {
    id: 'bengaluru',
    city: 'Bengaluru',
    state: 'Karnataka',
    weather: {
      temperatureC: 25,
      condition: 'Mostly sunny',
      humidityPercent: 62,
      windKph: 9,
    },
    airQuality: { aqi: 68, pm25: 24, pm10: 41 },
  },
  {
    id: 'chennai',
    city: 'Chennai',
    state: 'Tamil Nadu',
    weather: {
      temperatureC: 30,
      condition: 'Humid and cloudy',
      humidityPercent: 76,
      windKph: 16,
    },
    airQuality: { aqi: 91, pm25: 34, pm10: 58 },
  },
  {
    id: 'delhi',
    city: 'Delhi',
    state: 'Delhi',
    weather: {
      temperatureC: 28,
      condition: 'Hazy sunshine',
      humidityPercent: 44,
      windKph: 11,
    },
    airQuality: { aqi: 184, pm25: 78, pm10: 112 },
  },
  {
    id: 'hyderabad',
    city: 'Hyderabad',
    state: 'Telangana',
    weather: {
      temperatureC: 29,
      condition: 'Partly sunny',
      humidityPercent: 51,
      windKph: 13,
    },
    airQuality: { aqi: 86, pm25: 31, pm10: 53 },
  },
  {
    id: 'jaipur',
    city: 'Jaipur',
    state: 'Rajasthan',
    weather: {
      temperatureC: 30,
      condition: 'Clear skies',
      humidityPercent: 39,
      windKph: 10,
    },
    airQuality: { aqi: 126, pm25: 48, pm10: 84 },
  },
  {
    id: 'kolkata',
    city: 'Kolkata',
    state: 'West Bengal',
    weather: {
      temperatureC: 29,
      condition: 'Cloudy',
      humidityPercent: 72,
      windKph: 14,
    },
    airQuality: { aqi: 104, pm25: 39, pm10: 68 },
  },
  {
    id: 'lucknow',
    city: 'Lucknow',
    state: 'Uttar Pradesh',
    weather: {
      temperatureC: 27,
      condition: 'Partly cloudy',
      humidityPercent: 56,
      windKph: 8,
    },
    airQuality: { aqi: 138, pm25: 54, pm10: 93 },
  },
  {
    id: 'mumbai',
    city: 'Mumbai',
    state: 'Maharashtra',
    weather: {
      temperatureC: 30,
      condition: 'Warm and breezy',
      humidityPercent: 68,
      windKph: 18,
    },
    airQuality: { aqi: 79, pm25: 29, pm10: 49 },
  },
  {
    id: 'pune',
    city: 'Pune',
    state: 'Maharashtra',
    weather: {
      temperatureC: 27,
      condition: 'Mostly sunny',
      humidityPercent: 54,
      windKph: 10,
    },
    airQuality: { aqi: 72, pm25: 26, pm10: 45 },
  },
]

export function getAqiCategory(aqi: number): string {
  if (aqi <= 50) return 'Good'
  if (aqi <= 100) return 'Satisfactory'
  if (aqi <= 200) return 'Moderate'
  if (aqi <= 300) return 'Poor'
  if (aqi <= 400) return 'Very Poor'
  return 'Severe'
}
