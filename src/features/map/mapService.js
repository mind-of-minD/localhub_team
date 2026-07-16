import { loadKakaoMapSdk } from './kakaoMapLoader'

const SEOUL_CENTER = {
  latitude: 37.5665,
  longitude: 126.978,
}

let kakao = null
let activeInfoWindow = null

function isValidCoordinate(place) {
  const latitude = Number(place?.latitude)
  const longitude = Number(place?.longitude)

  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= 37.41 &&
    latitude <= 37.72 &&
    longitude >= 126.76 &&
    longitude <= 127.19
  )
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function createInfoWindowContent(place) {
  return `
    <div
      style="
        width: 220px;
        padding: 12px;
        line-height: 1.5;
        box-sizing: border-box;
        overflow-wrap: anywhere;
      "
    >
      <strong
        style="
          display: block;
          margin-bottom: 5px;
          font-size: 15px;
        "
      >
        ${escapeHtml(place.title)}
      </strong>

      <div
        style="
          margin-bottom: 4px;
          font-size: 12px;
          font-weight: 700;
        "
      >
        ${escapeHtml(place.category)}
      </div>

      <div style="font-size: 13px;">
        ${escapeHtml(place.address)}
      </div>
    </div>
  `
}

/**
 * 카카오맵을 생성합니다.
 */
export async function createMap(container) {
  if (!container) {
    throw new Error('지도를 표시할 요소를 찾지 못했습니다.')
  }

  kakao = await loadKakaoMapSdk()

  const center = new kakao.maps.LatLng(
    SEOUL_CENTER.latitude,
    SEOUL_CENTER.longitude,
  )

  const map = new kakao.maps.Map(container, {
    center,
    level: 8,
  })

  // 지도 확대/축소 컨트롤
  const zoomControl = new kakao.maps.ZoomControl()

  map.addControl(
    zoomControl,
    kakao.maps.ControlPosition.RIGHT,
  )

  return map
}

/**
 * 카카오맵 마커 클러스터를 생성합니다.
 */
export function createMarkerCluster(map) {
  if (!kakao?.maps) {
    throw new Error('카카오맵 SDK가 준비되지 않았습니다.')
  }

  return new kakao.maps.MarkerClusterer({
    map,
    averageCenter: true,
    minLevel: 7,
    disableClickZoom: false,
  })
}

/**
 * 시설 마커를 지도에 표시합니다.
 */
export function renderPlaceMarkers(
  map,
  markerCluster,
  places,
  onSelectPlace,
) {
  if (!map || !markerCluster) {
    return
  }

  markerCluster.clear()

  if (activeInfoWindow) {
    activeInfoWindow.close()
    activeInfoWindow = null
  }

  const validPlaces = places.filter(isValidCoordinate)
  const bounds = new kakao.maps.LatLngBounds()

  const markers = validPlaces.map((place) => {
    const position = new kakao.maps.LatLng(
      Number(place.latitude),
      Number(place.longitude),
    )

    const marker = new kakao.maps.Marker({
      position,
      title: place.title,
      clickable: true,
    })

    bounds.extend(position)

    kakao.maps.event.addListener(marker, 'click', () => {
      if (activeInfoWindow) {
        activeInfoWindow.close()
      }

      activeInfoWindow = new kakao.maps.InfoWindow({
        content: createInfoWindowContent(place),
        removable: true,
      })

      activeInfoWindow.open(map, marker)

      if (typeof onSelectPlace === 'function') {
        onSelectPlace(place)
      }
    })

    return marker
  })

  markerCluster.addMarkers(markers)

  if (markers.length === 0) {
    map.setCenter(
      new kakao.maps.LatLng(
        SEOUL_CENTER.latitude,
        SEOUL_CENTER.longitude,
      ),
    )

    map.setLevel(8)
    return
  }

  if (markers.length === 1) {
    map.setCenter(markers[0].getPosition())
    map.setLevel(5)
    return
  }

  map.setBounds(bounds)

  // 시설이 적을 때 지나치게 확대되는 것을 방지
  if (map.getLevel() < 4) {
    map.setLevel(4)
  }
}

/**
 * 선택한 시설로 지도를 이동합니다.
 */
export function focusPlace(map, place) {
  if (!map || !place || !isValidCoordinate(place)) {
    return
  }

  const position = new kakao.maps.LatLng(
    Number(place.latitude),
    Number(place.longitude),
  )

  map.panTo(position)
  map.setLevel(4)
}

/**
 * 선택된 시설들을 직선으로 연결합니다.
 *
 * 카카오맵 JavaScript SDK 자체는 자동차 도로 경로를 계산하지 않으므로
 * 현재 단계에서는 선택 순서에 따라 Polyline으로 연결합니다.
 */
export function drawRoute(
  map,
  places,
  previousPolyline = null,
) {
  if (!map) {
    throw new Error('지도 객체가 준비되지 않았습니다.')
  }

  const validPlaces = places.filter(isValidCoordinate)

  if (validPlaces.length < 2) {
    throw new Error(
      '경로를 표시하려면 시설을 2개 이상 선택하세요.',
    )
  }

  if (previousPolyline) {
    previousPolyline.setMap(null)
  }

  const path = validPlaces.map(
    (place) =>
      new kakao.maps.LatLng(
        Number(place.latitude),
        Number(place.longitude),
      ),
  )

  const polyline = new kakao.maps.Polyline({
    path,
    strokeWeight: 6,
    strokeColor: '#2563eb',
    strokeOpacity: 0.85,
    strokeStyle: 'solid',
  })

  polyline.setMap(map)

  const bounds = new kakao.maps.LatLngBounds()

  path.forEach((position) => {
    bounds.extend(position)
  })

  map.setBounds(bounds)

  return polyline
}

/**
 * 지도에서 경로선을 제거합니다.
 */
export function removeRoute(map, polyline) {
  if (!map || !polyline) {
    return
  }

  polyline.setMap(null)
}

/**
 * 지도 관련 객체를 정리합니다.
 */
export function destroyMap(map) {
  if (activeInfoWindow) {
    activeInfoWindow.close()
    activeInfoWindow = null
  }

  const container = map?.getNode?.()

  if (container) {
    container.innerHTML = ''
  }

  kakao = null
}