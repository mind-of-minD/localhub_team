const KMA_CURRENT_WEATHER_URL =
  '/kma-api/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst'

const CACHE_DURATION_MS = 10 * 60 * 1000

const weatherCache = new Map()

/**
 * 한국 표준시 기준 날짜와 시각을 반환합니다.
 */
function getKoreaDate(date = new Date()) {
  return new Date(
    date.getTime() + 9 * 60 * 60 * 1000,
  )
}

function padNumber(value) {
  return String(value).padStart(2, '0')
}

function formatBaseDate(date) {
  return [
    date.getUTCFullYear(),
    padNumber(date.getUTCMonth() + 1),
    padNumber(date.getUTCDate()),
  ].join('')
}

function formatBaseTime(date) {
  return `${padNumber(date.getUTCHours())}00`
}

/**
 * 초단기실황은 매 정시 기준 데이터입니다.
 * 아직 갱신되지 않은 최신 시각을 피하기 위해
 * 현재 시각보다 약 70분 이전의 발표시각을 사용합니다.
 */
function getCurrentObservationBaseTime() {
  const koreaNow = getKoreaDate()

  const safeObservationTime = new Date(
    koreaNow.getTime() - 70 * 60 * 1000,
  )

  return {
    baseDate: formatBaseDate(safeObservationTime),
    baseTime: formatBaseTime(safeObservationTime),
  }
}

function parseNumber(value, fallback = null) {
  const number = Number(value)

  return Number.isFinite(number)
    ? number
    : fallback
}

/**
 * 기상청 응답 배열을 category 기준 객체로 변환합니다.
 */
function convertItemsToObject(items) {
  return items.reduce((result, item) => {
    result[item.category] = item.obsrValue
    return result
  }, {})
}

/**
 * 기상청 강수형태 코드를 화면 표시용 정보로 변환합니다.
 *
 * 0: 없음
 * 1: 비
 * 2: 비/눈
 * 3: 눈
 * 5: 빗방울
 * 6: 빗방울/눈날림
 * 7: 눈날림
 */
export function getPrecipitationDisplay(precipitationType) {
  switch (Number(precipitationType)) {
    case 1:
      return {
        type: 'rain',
        icon: '🌧️',
        label: '비',
      }

    case 2:
      return {
        type: 'rain-snow',
        icon: '🌨️',
        label: '비 또는 눈',
      }

    case 3:
      return {
        type: 'snow',
        icon: '❄️',
        label: '눈',
      }

    case 5:
      return {
        type: 'drizzle',
        icon: '🌦️',
        label: '빗방울',
      }

    case 6:
      return {
        type: 'rain-snow',
        icon: '🌨️',
        label: '빗방울 또는 눈날림',
      }

    case 7:
      return {
        type: 'snow',
        icon: '🌨️',
        label: '눈날림',
      }

    default:
      return {
        type: 'clear',
        icon: '🌤️',
        label: '강수 없음',
      }
  }
}

/**
 * LocalHub 자체 여행 적합도를 계산합니다.
 *
 * 공식 기상청 지수가 아니라 프로젝트 내부 기준입니다.
 */
export function evaluateTravelSuitability(weather) {
  let score = 100
  const reasons = []

  const temperature = weather.temperature
  const humidity = weather.humidity
  const windSpeed = weather.windSpeed
  const rainAmount = weather.rainAmount
  const precipitationType = weather.precipitationType

  if ([1, 2, 5, 6].includes(precipitationType)) {
    score -= 30
    reasons.push('비로 인해 야외 이동이 불편할 수 있습니다.')
  }

  if ([3, 7].includes(precipitationType)) {
    score -= 45
    reasons.push('눈길 미끄럼에 주의해야 합니다.')
  }

  if (rainAmount >= 10) {
    score -= 25
    reasons.push('강수량이 많은 편입니다.')
  } else if (rainAmount >= 3) {
    score -= 10
    reasons.push('강수량을 확인하고 우산을 준비하세요.')
  }

  if (temperature !== null) {
    if (temperature >= 35) {
      score -= 40
      reasons.push('기온이 매우 높습니다.')
    } else if (temperature >= 30) {
      score -= 18
      reasons.push('더운 날씨이므로 수분 섭취가 필요합니다.')
    } else if (temperature <= -5) {
      score -= 40
      reasons.push('기온이 매우 낮습니다.')
    } else if (temperature <= 5) {
      score -= 18
      reasons.push('추운 날씨이므로 보온에 유의하세요.')
    }
  }

  if (windSpeed !== null) {
    if (windSpeed >= 14) {
      score -= 35
      reasons.push('바람이 매우 강합니다.')
    } else if (windSpeed >= 8) {
      score -= 15
      reasons.push('바람이 강한 편입니다.')
    }
  }

  if (humidity !== null && humidity >= 85) {
    score -= 8
    reasons.push('습도가 높습니다.')
  }

  score = Math.max(0, Math.min(100, score))

  if (score >= 80) {
    return {
      score,
      level: 'good',
      label: '여행하기 좋음',
      message:
        reasons[0] ||
        '현재 야외 여행을 즐기기 좋은 상태입니다.',
    }
  }

  if (score >= 55) {
    return {
      score,
      level: 'normal',
      label: '여행 가능',
      message:
        reasons.join(' ') ||
        '준비물을 챙기면 여행할 수 있습니다.',
    }
  }

  return {
    score,
    level: 'bad',
    label: '야외 활동 주의',
    message:
      reasons.join(' ') ||
      '출발 전에 날씨를 다시 확인하세요.',
  }
}

/**
 * 한 권역의 초단기실황을 조회합니다.
 */
export async function fetchRegionCurrentWeather(region) {
  const serviceKey =
    import.meta.env.VITE_KMA_SERVICE_KEY?.trim()

  if (!serviceKey) {
    throw new Error(
      '.env에 VITE_KMA_SERVICE_KEY가 설정되지 않았습니다.',
    )
  }

  if (
    !region?.id ||
    !Number.isFinite(region.nx) ||
    !Number.isFinite(region.ny)
  ) {
    throw new Error('권역 격자좌표가 올바르지 않습니다.')
  }

  const cachedData = weatherCache.get(region.id)

  if (
    cachedData &&
    Date.now() - cachedData.cachedAt <
      CACHE_DURATION_MS
  ) {
    return cachedData.weather
  }

  const { baseDate, baseTime } =
    getCurrentObservationBaseTime()

  const params = new URLSearchParams({
    ServiceKey: serviceKey,
    pageNo: '1',
    numOfRows: '1000',
    dataType: 'JSON',
    base_date: baseDate,
    base_time: baseTime,
    nx: String(region.nx),
    ny: String(region.ny),
  })

  const requestUrl =
    `${KMA_CURRENT_WEATHER_URL}?${params.toString()}`

  const response = await fetch(requestUrl)

  const rawResponse = await response.text()

  let result

  try {
    result = JSON.parse(rawResponse)
  } catch {
    throw new Error(
      `기상청 API가 JSON이 아닌 응답을 반환했습니다. (${response.status})`,
    )
  }

  if (!response.ok) {
    throw new Error(
      `기상청 API 요청에 실패했습니다. (${response.status})`,
    )
  }

  const header = result?.response?.header

  if (header?.resultCode !== '00') {
    throw new Error(
      header?.resultMsg ||
        `기상청 API 오류 (${header?.resultCode || '알 수 없음'})`,
    )
  }

  const items =
    result?.response?.body?.items?.item

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error(
      `${region.name}의 기상 관측값이 없습니다.`,
    )
  }

  const observation = convertItemsToObject(items)

  const weather = {
    regionId: region.id,
    regionName: region.name,
    regionDescription: region.description,

    baseDate,
    baseTime,

    temperature: parseNumber(observation.T1H),
    rainAmount: parseNumber(observation.RN1, 0),
    humidity: parseNumber(observation.REH),
    windSpeed: parseNumber(observation.WSD),

    precipitationType:
      parseNumber(observation.PTY, 0),

    observedAt: `${baseDate} ${baseTime}`,
  }

  weather.precipitation =
    getPrecipitationDisplay(
      weather.precipitationType,
    )

  weather.travelSuitability =
    evaluateTravelSuitability(weather)

  weatherCache.set(region.id, {
    cachedAt: Date.now(),
    weather,
  })

  return weather
}

/**
 * 전체 권역 날씨를 조회합니다.
 *
 * 한 권역이 실패해도 나머지는 표시합니다.
 */
export async function fetchAllRegionCurrentWeather(
  regions,
) {
  return Promise.all(
    regions.map(async region => {
      try {
        return await fetchRegionCurrentWeather(region)
      } catch (error) {
        console.error(
          `[WEATHER] ${region.name} 조회 실패`,
          error,
        )

        return {
          regionId: region.id,
          regionName: region.name,
          regionDescription: region.description,
          error: error.message,
        }
      }
    }),
  )
}

/**
 * 새로고침 버튼에서 캐시를 제거할 때 사용합니다.
 */
export function clearWeatherCache() {
  weatherCache.clear()
}