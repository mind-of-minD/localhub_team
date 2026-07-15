import { SEOUL_DATA_FILES } from '@/constants/dataFiles'

const SEOUL_BOUNDS = {
  minLatitude: 37.41,
  maxLatitude: 37.72,
  minLongitude: 126.76,
  maxLongitude: 127.19,
}

function isInsideSeoul(latitude, longitude) {
  return (
    latitude >= SEOUL_BOUNDS.minLatitude &&
    latitude <= SEOUL_BOUNDS.maxLatitude &&
    longitude >= SEOUL_BOUNDS.minLongitude &&
    longitude <= SEOUL_BOUNDS.maxLongitude
  )
}

function normalizePlace(item, category) {
  const latitude = Number.parseFloat(item.mapy)
  const longitude = Number.parseFloat(item.mapx)

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null
  }

  if (!isInsideSeoul(latitude, longitude)) {
    return null
  }

  const address =
    [item.addr1, item.addr2]
      .map((value) => value?.trim())
      .filter(Boolean)
      .join(' ') || '주소 정보 없음'

  return {
    id: `${category}-${item.contentid}`,
    contentId: item.contentid,
    category,
    title: item.title?.trim() || '이름 없음',
    address,
    image: item.firstimage || item.firstimage2 || '',
    telephone: item.tel?.trim() || '',
    latitude,
    longitude,

    // 향후 상세 기능에서 활용할 수 있도록 원본 일부 보존
    zipcode: item.zipcode || '',
    contentTypeId: item.contenttypeid || '',
    modifiedTime: item.modifiedtime || '',
  }
}

async function loadDataFile(file) {
  const response = await fetch(file.path)

  if (!response.ok) {
    throw new Error(
      `${file.category} 데이터 로드 실패: HTTP ${response.status}`,
    )
  }

  const data = await response.json()

  if (!Array.isArray(data.items)) {
    throw new Error(`${file.category} JSON의 items가 배열이 아닙니다.`)
  }

  return data.items
    .map((item) => normalizePlace(item, file.category))
    .filter(Boolean)
}

export async function loadAllSeoulPlaces() {
  const results = await Promise.allSettled(
    SEOUL_DATA_FILES.map((file) => loadDataFile(file)),
  )

  const places = []
  const errors = []

  results.forEach((result, index) => {
    const file = SEOUL_DATA_FILES[index]

    if (result.status === 'fulfilled') {
      places.push(...result.value)
      return
    }

    errors.push({
      category: file.category,
      path: file.path,
      message: result.reason?.message || '알 수 없는 오류',
    })
  })

  return {
    places,
    errors,
  }
}