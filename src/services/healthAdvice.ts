export type SolutionItem = {
  id: string
  title: string
  status: 'Must' | 'Recommended' | 'Optional' | 'Not needed'
  detail: string
  icon: string
}

export type HealthImpactData = {
  dailyCigarettes: number
  weeklyCigarettes: number
  monthlyCigarettes: number
  summary: string
  solutions: SolutionItem[]
}

/**
 * Berkeley Earth methodology:
 * 1 cigarette per day is roughly equivalent to continuous exposure to 22 µg/m³ of PM2.5.
 * Source: Richard A. Muller & Elizabeth A. Muller (Berkeley Earth)
 */
export function calculateCigaretteEquivalency(pm25: number): {
  daily: number
  weekly: number
  monthly: number
} {
  const safePm25 = Math.max(0, pm25)
  const daily = safePm25 / 22
  const roundedDaily = Math.round(daily * 10) / 10
  const weekly = Math.round(roundedDaily * 7 * 10) / 10
  const monthly = Math.round(roundedDaily * 30)

  return {
    daily: roundedDaily,
    weekly,
    monthly,
  }
}

export function getHealthSolutions(usAqi: number, pm25: number): HealthImpactData {
  const { daily, weekly, monthly } = calculateCigaretteEquivalency(pm25)

  let summary = ''
  let solutions: SolutionItem[] = []

  if (usAqi <= 50) {
    summary = 'Air quality is clean and satisfactory. Air pollution poses little to no health risk.'
    solutions = [
      {
        id: 'outdoor',
        title: 'Outdoor Activities',
        status: 'Optional',
        detail: 'Great time for outdoor sports, walking, jogging, and recreational activities.',
        icon: '🏃',
      },
      {
        id: 'ventilation',
        title: 'Ventilation',
        status: 'Recommended',
        detail: 'Open windows to bring clean, fresh natural air into your living spaces.',
        icon: '🪟',
      },
      {
        id: 'purifier',
        title: 'Air Purifier',
        status: 'Not needed',
        detail: 'Ambient air is clean; indoor air purifier is not needed.',
        icon: '🍃',
      },
      {
        id: 'mask',
        title: 'N95 Mask',
        status: 'Not needed',
        detail: 'No protective mask required under current conditions.',
        icon: '🙂',
      },
    ]
  } else if (usAqi <= 100) {
    summary = 'Air quality is acceptable. Extremely sensitive individuals may notice mild respiratory irritation.'
    solutions = [
      {
        id: 'purifier',
        title: 'Air Purifier',
        status: 'Optional',
        detail: 'Helpful for sensitive individuals or homes near busy traffic corridors.',
        icon: '💨',
      },
      {
        id: 'outdoor',
        title: 'Outdoor Activities',
        status: 'Recommended',
        detail: 'Normal outdoor activities are safe for the vast majority of people.',
        icon: '🚶',
      },
      {
        id: 'ventilation',
        title: 'Ventilation',
        status: 'Recommended',
        detail: 'Ventilate during midday when dispersion is typically best.',
        icon: '🪟',
      },
      {
        id: 'mask',
        title: 'N95 Mask',
        status: 'Optional',
        detail: 'Sensitive groups with asthma or respiratory concerns may consider light protection.',
        icon: '😷',
      },
    ]
  } else if (usAqi <= 150) {
    summary = 'Members of sensitive groups may experience health effects. General public is less likely to be affected.'
    solutions = [
      {
        id: 'purifier',
        title: 'Air Purifier',
        status: 'Recommended',
        detail: 'Run indoor air purifiers, especially in bedrooms and living rooms.',
        icon: '💨',
      },
      {
        id: 'mask',
        title: 'N95 Mask',
        status: 'Recommended',
        detail: 'Children, elders, and individuals with respiratory issues should wear an N95 mask outdoors.',
        icon: '😷',
      },
      {
        id: 'outdoor',
        title: 'Outdoor Exertion',
        status: 'Optional',
        detail: 'Reduce intense outdoor workouts or shift physical training indoors.',
        icon: '🧘',
      },
      {
        id: 'ventilation',
        title: 'Windows',
        status: 'Must',
        detail: 'Keep windows and doors closed during early morning and late evening rush hours.',
        icon: '🚪',
      },
    ]
  } else if (usAqi <= 200) {
    summary = 'Everyone may begin to experience health effects. Sensitive groups may experience more serious effects.'
    solutions = [
      {
        id: 'purifier',
        title: 'Air Purifier',
        status: 'Must',
        detail: 'Keep HEPA air purifiers continuously running indoors.',
        icon: '⚡',
      },
      {
        id: 'mask',
        title: 'N95 Mask',
        status: 'Must',
        detail: 'Wear a well-fitted N95 or KN95 mask whenever going outside.',
        icon: '😷',
      },
      {
        id: 'stay-indoor',
        title: 'Stay Indoors',
        status: 'Recommended',
        detail: 'Avoid prolonged outdoor exposure and strenuous cardio activities.',
        icon: '🏠',
      },
      {
        id: 'windows',
        title: 'Close Windows',
        status: 'Must',
        detail: 'Keep windows tightly closed to prevent outdoor smoke and particulate intrusion.',
        icon: '🚪',
      },
    ]
  } else {
    // 201+ (Very Unhealthy & Hazardous)
    summary = 'Health alert: Risk of health effects is heightened for everyone. Continuous outdoor breathing causes severe particulate accumulation.'
    solutions = [
      {
        id: 'purifier',
        title: 'Air Purifier',
        status: 'Must',
        detail: 'Operate indoor air purifiers at high filtration settings. Create a clean room.',
        icon: '⚡',
      },
      {
        id: 'mask',
        title: 'N95 Mask',
        status: 'Must',
        detail: 'Fit-tested N95 / FFP2 mask is essential for any brief outdoor travel.',
        icon: '😷',
      },
      {
        id: 'stay-indoor',
        title: 'Stay Indoors',
        status: 'Must',
        detail: 'Remain indoors. Keep children, seniors, and vulnerable individuals inside.',
        icon: '🏠',
      },
      {
        id: 'windows',
        title: 'Seal Living Area',
        status: 'Must',
        detail: 'Keep all doors, windows, and gaps sealed against heavy smog infiltration.',
        icon: '🚪',
      },
    ]
  }

  return {
    dailyCigarettes: daily,
    weeklyCigarettes: weekly,
    monthlyCigarettes: monthly,
    summary,
    solutions,
  }
}
