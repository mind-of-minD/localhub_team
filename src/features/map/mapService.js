import L from 'leaflet'

import 'leaflet/dist/leaflet.css'

import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'

import 'leaflet-routing-machine'
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css'

import markerIconUrl from 'leaflet/dist/images/marker-icon.png'
import markerIconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png'

const defaultMarkerIcon = L.icon({
  iconUrl: markerIconUrl,
  iconRetinaUrl: markerIconRetinaUrl,
  shadowUrl: markerShadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

L.Marker.prototype.options.icon = defaultMarkerIcon

const SEOUL_BOUNDS = L.latLngBounds(
  [37.41, 126.76],
  [37.72, 127.19],
)

const categoryMarkerClasses = {
  관광지: 'category-tourism',
  레포츠: 'category-leports',
  문화시설: 'category-culture',
  쇼핑: 'category-shopping',
  숙박: 'category-accommodation',
  여행코스: 'category-course',
  축제공연행사: 'category-festival',
  음식점: 'category-food',
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function createCategoryIcon(category) {
  const categoryClass =
    categoryMarkerClasses[category] || 'category-default'

  return L.divIcon({
    className: 'place-marker-wrapper',
    html: `
      <span class="place-marker ${categoryClass}">
        ${escapeHtml(category.slice(0, 1))}
      </span>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  })
}

function createPopupContent(place) {
  return `
    <div style="width:220px;line-height:1.5;">
      <strong style="display:block;margin-bottom:5px;font-size:15px;">
        ${escapeHtml(place.title)}
      </strong>

      <div style="margin-bottom:4px;font-size:12px;font-weight:700;">
        ${escapeHtml(place.category)}
      </div>

      <div style="font-size:13px;">
        ${escapeHtml(place.address)}
      </div>
    </div>
  `
}

export function createMap(container) {
  if (!container) {
    throw new Error('지도를 표시할 요소를 찾지 못했습니다.')
  }

  const map = L.map(container, {
    center: [37.5665, 126.978],
    zoom: 11,
    minZoom: 10,
    maxZoom: 18,
    maxBounds: SEOUL_BOUNDS,
    maxBoundsViscosity: 1,
  })

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    minZoom: 10,
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map)

  return map
}

export function createMarkerCluster(map) {
  const markerCluster = L.markerClusterGroup({
    chunkedLoading: true,
    removeOutsideVisibleBounds: true,
    showCoverageOnHover: false,
  })

  map.addLayer(markerCluster)

  return markerCluster
}

export function renderPlaceMarkers(
  map,
  markerCluster,
  places,
  onSelectPlace,
) {
  markerCluster.clearLayers()

  const markers = places.map((place) => {
    const marker = L.marker(
      [place.latitude, place.longitude],
      {
        title: place.title,
        icon: createCategoryIcon(place.category),
      },
    )

    marker.bindPopup(createPopupContent(place))

    marker.on('click', () => {
      if (typeof onSelectPlace === 'function') {
        onSelectPlace(place)
      }
    })

    return marker
  })

  markerCluster.addLayers(markers)

  if (places.length > 0) {
    const bounds = markerCluster.getBounds()

    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [20, 20],
        maxZoom: 13,
      })
    }
  } else {
    map.setView([37.5665, 126.978], 11)
  }
}

export function focusPlace(map, place) {
  if (!map || !place) {
    return
  }

  map.setView(
    [place.latitude, place.longitude],
    15,
    {
      animate: true,
    },
  )
}

export function drawRoute(
  map,
  places,
  previousRoutingControl = null,
) {
  if (!map) {
    throw new Error('지도 객체가 준비되지 않았습니다.')
  }

  if (places.length < 2) {
    throw new Error('경로를 표시하려면 시설을 2개 이상 선택하세요.')
  }

  if (previousRoutingControl) {
    map.removeControl(previousRoutingControl)
  }

  const waypoints = places.map((place) =>
    L.latLng(place.latitude, place.longitude),
  )

  const routingControl = L.Routing.control({
    waypoints,

    router: L.Routing.osrmv1({
      serviceUrl: 'https://router.project-osrm.org/route/v1',
      profile: 'driving',
    }),

    routeWhileDragging: false,
    addWaypoints: false,
    draggableWaypoints: false,
    fitSelectedRoutes: true,
    showAlternatives: false,

    // 기존 시설 마커와 중복되는 출발·도착 마커를 만들지 않음
    createMarker: () => null,

    lineOptions: {
      styles: [
        {
          weight: 6,
          opacity: 0.85,
        },
      ],
      extendToWaypoints: true,
      missingRouteTolerance: 0,
    },
  })

  routingControl.addTo(map)

  return routingControl
}

export function removeRoute(map, routingControl) {
  if (!map || !routingControl) {
    return
  }

  map.removeControl(routingControl)
}

export function destroyMap(map) {
  if (map) {
    map.remove()
  }
}