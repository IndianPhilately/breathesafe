export type IpLocationResult = {
  latitude: number
  longitude: number
  city?: string
}

/**
 * Fetch approximate user location via IP address without triggering any browser permission prompts.
 * Falls back through public CORS-enabled endpoints.
 */
export async function fetchIpLocation(
  signal?: AbortSignal,
): Promise<IpLocationResult | null> {
  // Primary endpoint: ipwho.is (fast, HTTPS, CORS-enabled, no key needed)
  try {
    const res = await fetch('https://ipwho.is/', { signal })
    if (res.ok) {
      const data = (await res.json()) as {
        latitude?: unknown
        longitude?: unknown
        city?: unknown
        success?: unknown
      }
      if (
        data.success !== false &&
        typeof data.latitude === 'number' &&
        typeof data.longitude === 'number'
      ) {
        return {
          latitude: data.latitude,
          longitude: data.longitude,
          city: typeof data.city === 'string' ? data.city : undefined,
        }
      }
    }
  } catch {
    // Try secondary endpoint
  }

  // Secondary fallback endpoint: freeipapi.com
  try {
    const res = await fetch('https://freeipapi.com/api/json', { signal })
    if (res.ok) {
      const data = (await res.json()) as {
        latitude?: unknown
        longitude?: unknown
        cityName?: unknown
      }
      if (
        typeof data.latitude === 'number' &&
        typeof data.longitude === 'number'
      ) {
        return {
          latitude: data.latitude,
          longitude: data.longitude,
          city: typeof data.cityName === 'string' ? data.cityName : undefined,
        }
      }
    }
  } catch {
    // Both endpoints unavailable or aborted
  }

  return null
}
