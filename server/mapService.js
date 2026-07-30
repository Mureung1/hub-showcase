import { schoolLocations } from './schoolLocations.js'

const kakaoLocalBaseUrl = 'https://dapi.kakao.com/v2/local'
const kakaoRoutingBaseUrl = 'https://dapi.kakao.com/v2/routing'
const kakaoRequestTimeoutMs = 8000

function createUnavailableContext(reason) {
  return {
    status: 'unavailable',
    reason,
    school: null,
    listingLocation: null,
    routes: [],
    commuteCostEstimate: null,
    warnings: [reason],
  }
}

function createKakaoHeaders(apiKey) {
  return {
    Authorization: `KakaoAK ${apiKey}`,
  }
}

function readFirstDocument(data) {
  return Array.isArray(data?.documents) && data.documents.length > 0 ? data.documents[0] : null
}

function toCoordinate(document) {
  if (!document) {
    return null
  }

  const x = Number(document.x)
  const y = Number(document.y)
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null
  }

  return {
    address: document.address_name || document.place_name || '',
    x,
    y,
  }
}

async function fetchJson(url, apiKey) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), kakaoRequestTimeoutMs)

  try {
    const response = await fetch(url, {
      headers: createKakaoHeaders(apiKey),
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`Kakao API request failed: ${response.status}`)
    }

    return response.json()
  } finally {
    clearTimeout(timeout)
  }
}

async function geocodeListingAddress(address, apiKey) {
  const trimmedAddress = String(address || '').trim()
  if (!trimmedAddress) {
    return null
  }

  const addressUrl = new URL(`${kakaoLocalBaseUrl}/search/address.json`)
  addressUrl.searchParams.set('query', trimmedAddress)
  const addressResult = await fetchJson(addressUrl, apiKey)
  const addressCoordinate = toCoordinate(readFirstDocument(addressResult))
  if (addressCoordinate) {
    return addressCoordinate
  }

  const keywordUrl = new URL(`${kakaoLocalBaseUrl}/search/keyword.json`)
  keywordUrl.searchParams.set('query', trimmedAddress)
  const keywordResult = await fetchJson(keywordUrl, apiKey)
  return toCoordinate(readFirstDocument(keywordResult))
}

function secondsToMinutes(seconds) {
  return Math.round(seconds / 60)
}

function metersToKm(meters) {
  return Math.round((meters / 1000) * 10) / 10
}

function normalizePathPoints(points) {
  if (!Array.isArray(points)) {
    return []
  }

  return points
    .map((point) => {
      if (!Array.isArray(point) || point.length < 2) {
        return null
      }

      const x = Number(point[0])
      const y = Number(point[1])
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        return null
      }

      return { x, y }
    })
    .filter(Boolean)
}

function readStepsPathPoints(steps) {
  if (!Array.isArray(steps)) {
    return []
  }

  return steps.flatMap((step) => normalizePathPoints(step?.path?.points))
}

function readWalkPathPoints(data) {
  const legs = data?.route?.legs
  if (!Array.isArray(legs)) {
    return []
  }

  return legs.flatMap((leg) => readStepsPathPoints(leg.steps))
}

function readWalkRoute(data) {
  const properties = data?.route?.properties
  if (!properties?.totalDistance || !properties?.totalTime) {
    return null
  }

  return {
    mode: '도보',
    distanceMeters: properties.totalDistance,
    distanceKm: metersToKm(properties.totalDistance),
    durationSeconds: properties.totalTime,
    durationMinutes: secondsToMinutes(properties.totalTime),
    fareWon: 0,
    transfers: 0,
    steps: [],
    pathPoints: readWalkPathPoints(data),
    source: 'Kakao routing walk',
  }
}

function readVehicleNames(vehicles) {
  if (!Array.isArray(vehicles)) {
    return []
  }

  return vehicles
    .map((vehicle) => vehicle.name || vehicle.type)
    .filter(Boolean)
}

function readStopNames(stops) {
  if (!Array.isArray(stops)) {
    return []
  }

  return stops.map((stop) => stop.name).filter(Boolean)
}

function readPublicTransitSteps(route) {
  if (!Array.isArray(route?.steps)) {
    return []
  }

  return route.steps.map((step, index) => {
    const properties = step.properties || {}
    return {
      id: `${index}-${properties.guidance || properties.type || 'step'}`,
      guidance: properties.guidance || '',
      type: properties.type || '',
      distanceMeters: properties.distance || 0,
      distanceKm: properties.distance ? metersToKm(properties.distance) : 0,
      durationSeconds: properties.time || 0,
      durationMinutes: properties.time ? secondsToMinutes(properties.time) : 0,
      vehicles: readVehicleNames(properties.vehicles),
      stops: readStopNames(properties.stops),
      pathPoints: normalizePathPoints(step?.path?.points),
    }
  })
}

function readPublicTransitRoute(data) {
  const route = Array.isArray(data?.routes) ? data.routes[0] : null
  const properties = route?.properties
  if (!properties) {
    return null
  }

  const distanceMeters = properties.totalDistance
  const durationSeconds = properties.totalTime
  if (!distanceMeters || !durationSeconds) {
    return null
  }

  const fareWon = properties.fare?.value || properties.fare?.min || null
  const steps = readPublicTransitSteps(route)

  return {
    mode: '대중교통',
    type: properties.type || '',
    distanceMeters,
    distanceKm: metersToKm(distanceMeters),
    durationSeconds,
    durationMinutes: secondsToMinutes(durationSeconds),
    transfers: Number.isFinite(properties.transfers) ? properties.transfers : 0,
    fareWon: typeof fareWon === 'number' ? fareWon : null,
    fareRange: properties.fare
      ? {
          min: properties.fare.min || null,
          max: properties.fare.max || null,
        }
      : null,
    steps,
    pathPoints: steps.flatMap((step) => step.pathPoints),
    landingUrl: data?.properties?.landingURL || '',
    source: 'Kakao routing publictraffic',
  }
}

async function fetchWalkRoute(origin, destination, apiKey) {
  const url = new URL(`${kakaoRoutingBaseUrl}/walk`)
  url.searchParams.set('start_x', String(origin.x))
  url.searchParams.set('start_y', String(origin.y))
  url.searchParams.set('end_x', String(destination.x))
  url.searchParams.set('end_y', String(destination.y))

  const data = await fetchJson(url, apiKey)
  return readWalkRoute(data)
}

async function fetchPublicTransitRoute(origin, destination, apiKey) {
  const url = new URL(`${kakaoRoutingBaseUrl}/publictraffic`)
  url.searchParams.set('start_x', String(origin.x))
  url.searchParams.set('start_y', String(origin.y))
  url.searchParams.set('end_x', String(destination.x))
  url.searchParams.set('end_y', String(destination.y))

  const data = await fetchJson(url, apiKey)
  return readPublicTransitRoute(data)
}

function estimateCommuteCost(routes, commuteDaysPerWeek) {
  const days = Number(commuteDaysPerWeek)
  if (!Number.isFinite(days) || days <= 0) {
    return null
  }

  const publicTransit = routes.find((route) => route.mode === '대중교통')
  if (!publicTransit) {
    return null
  }

  const oneWayFare = publicTransit.fareWon || 1500
  const monthlyRoundTrips = days * 4.345
  return {
    oneWayFareWon: oneWayFare,
    monthlyEstimateWon: Math.round(oneWayFare * 2 * monthlyRoundTrips),
    basis: publicTransit.fareWon
      ? '카카오 경로 응답의 편도 요금을 기준으로 계산했습니다.'
      : '편도 1,500원 기준의 보수적 추정치입니다.',
  }
}

export async function createTravelContext({ listingInfo, userInfo }) {
  const apiKey = process.env.KAKAO_REST_API_KEY
  if (!apiKey) {
    return createUnavailableContext('KAKAO_REST_API_KEY가 설정되어 있지 않아 지도 기반 이동 계산을 건너뜁니다.')
  }

  const school = schoolLocations[userInfo.school]
  if (!school) {
    return createUnavailableContext('지원하는 학교 좌표를 찾지 못했습니다.')
  }

  const listingAddress = listingInfo?.fields?.address
  if (!listingAddress) {
    return createUnavailableContext('매물 주소가 없어 지도 기반 이동 계산을 건너뜁니다.')
  }

  const warnings = []

  try {
    const listingLocation = await geocodeListingAddress(listingAddress, apiKey)
    if (!listingLocation) {
      return createUnavailableContext('카카오 지도에서 매물 주소 좌표를 찾지 못했습니다.')
    }

    const routeResults = await Promise.allSettled([
      fetchWalkRoute(listingLocation, school, apiKey),
      fetchPublicTransitRoute(listingLocation, school, apiKey),
    ])

    const routes = routeResults
      .map((result) => {
        if (result.status === 'rejected') {
          warnings.push('일부 이동 경로 계산에 실패했습니다.')
          return null
        }

        return result.value
      })
      .filter(Boolean)

    if (!routes.length) {
      warnings.push('계산 가능한 이동 경로를 찾지 못했습니다.')
    }

    return {
      status: routes.length ? 'ok' : 'partial',
      reason: '',
      school,
      listingLocation,
      routes,
      commuteCostEstimate: estimateCommuteCost(routes, userInfo.commuteDaysPerWeek),
      warnings: [...new Set(warnings)],
    }
  } catch {
    return createUnavailableContext('카카오 지도 API 호출 중 오류가 발생해 지도 기반 이동 계산을 건너뜁니다.')
  }
}
