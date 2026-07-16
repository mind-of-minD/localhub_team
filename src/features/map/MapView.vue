<script setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue'

import {
  ALL_CATEGORIES,
  SEOUL_CATEGORIES,
} from '@/constants/dataFiles'

import { loadAllSeoulPlaces } from '@/services/seoulDataService'

import MapFilter from './MapFilter.vue'
import PlaceDetailCard from './PlaceDetailCard.vue'

import {
  createMap,
  createMarkerCluster,
  destroyMap,
  drawRoute,
  focusPlace,
  removeRoute,
  renderPlaceMarkers,
} from './mapService'

const mapContainer = ref(null)

const places = ref([])
const selectedCategory = ref(ALL_CATEGORIES)
const selectedPlace = ref(null)
const routePlaces = ref([])

const loading = ref(true)
const errorMessage = ref('')
const dataWarnings = ref([])
const routeErrorMessage = ref('')

let map = null
let markerCluster = null
let routingControl = null

const filteredPlaces = computed(() => {
  if (selectedCategory.value === ALL_CATEGORIES) {
    return places.value
  }

  return places.value.filter(
    (place) => place.category === selectedCategory.value,
  )
})

const categoryCounts = computed(() => {
  const counts = {
    [ALL_CATEGORIES]: places.value.length,
  }

  SEOUL_CATEGORIES
    .filter((category) => category !== ALL_CATEGORIES)
    .forEach((category) => {
      counts[category] = places.value.filter(
        (place) => place.category === category,
      ).length
    })

  return counts
})

const isSelectedPlaceInRoute = computed(() => {
  if (!selectedPlace.value) {
    return false
  }

  return routePlaces.value.some(
    (place) => place.id === selectedPlace.value.id,
  )
})

const isRouteFull = computed(() => routePlaces.value.length >= 5)

function selectPlace(place) {
  selectedPlace.value = place
  focusPlace(map, place)
}

function closePlaceDetail() {
  selectedPlace.value = null
}

function addPlaceToRoute(place) {
  const alreadyAdded = routePlaces.value.some(
    (routePlace) => routePlace.id === place.id,
  )

  if (alreadyAdded) {
    return
  }

  if (routePlaces.value.length >= 5) {
    routeErrorMessage.value =
      '여행 경로에는 최대 5개 시설까지 추가할 수 있습니다.'
    return
  }

  routePlaces.value.push(place)
  routeErrorMessage.value = ''

  clearDisplayedRoute()
}

function removePlaceFromRoute(placeId) {
  routePlaces.value = routePlaces.value.filter(
    (place) => place.id !== placeId,
  )

  clearDisplayedRoute()
}

function moveRoutePlace(index, direction) {
  const targetIndex = index + direction

  if (
    targetIndex < 0 ||
    targetIndex >= routePlaces.value.length
  ) {
    return
  }

  const copiedPlaces = [...routePlaces.value]

  const [movedPlace] = copiedPlaces.splice(index, 1)
  copiedPlaces.splice(targetIndex, 0, movedPlace)

  routePlaces.value = copiedPlaces

  clearDisplayedRoute()
}

function showRoute() {
  routeErrorMessage.value = ''

  try {
    routingControl = drawRoute(
      map,
      routePlaces.value,
      routingControl,
    )
  } catch (error) {
    console.error(error)
    routeErrorMessage.value = error.message
  }
}

function clearDisplayedRoute() {
  removeRoute(map, routingControl)
  routingControl = null
}

function clearRoute() {
  clearDisplayedRoute()

  routePlaces.value = []
  routeErrorMessage.value = ''
}

function renderCurrentMarkers() {
  if (!map || !markerCluster) {
    return
  }

  renderPlaceMarkers(
    map,
    markerCluster,
    filteredPlaces.value,
    selectPlace,
  )
}

async function initializeMapPage() {
  loading.value = true
  errorMessage.value = ''
  dataWarnings.value = []

  try {
    const result = await loadAllSeoulPlaces()

    places.value = result.places
    dataWarnings.value = result.errors

    await nextTick()

    map = await createMap(mapContainer.value)
    markerCluster = createMarkerCluster(map)

    renderCurrentMarkers()

    if (places.value.length === 0) {
      errorMessage.value =
        '표시 가능한 서울 시설 데이터를 찾지 못했습니다.'
    }
  } catch (error) {
    console.error(error)
    errorMessage.value =
      error.message || '지도를 초기화하지 못했습니다.'
  } finally {
    loading.value = false
  }
}

watch(selectedCategory, () => {
  selectedPlace.value = null
  renderCurrentMarkers()
})

onMounted(() => {
  initializeMapPage()
})

onBeforeUnmount(() => {
  clearDisplayedRoute()
  destroyMap(map)

  map = null
  markerCluster = null
  routingControl = null
})
</script>

<template>
  <main class="map-page">
    <header class="map-header">
      <div>
        <h1>서울 지역 시설 지도</h1>

        <p>
          현재 표시:
          {{ filteredPlaces.length.toLocaleString() }}개 /
          전체 {{ places.length.toLocaleString() }}개
        </p>
      </div>

      <MapFilter
        v-model:selected-category="selectedCategory"
        :categories="SEOUL_CATEGORIES"
        :category-counts="categoryCounts"
      />
    </header>

    <p
      v-if="loading"
      class="status-message"
    >
      서울 시설 데이터를 불러오는 중입니다.
    </p>

    <p
      v-if="errorMessage"
      class="error-message"
    >
      {{ errorMessage }}
    </p>

    <details
      v-if="dataWarnings.length > 0"
      class="warning-panel"
    >
      <summary>
        불러오지 못한 데이터 파일
        {{ dataWarnings.length }}개
      </summary>

      <ul>
        <li
          v-for="warning in dataWarnings"
          :key="warning.category"
        >
          {{ warning.category }}:
          {{ warning.message }}
        </li>
      </ul>
    </details>

    <section class="route-panel">
      <div class="route-panel-header">
        <div>
          <h2>여행 경로</h2>

          <p>
            시설을 선택한 후 상세 카드에서
            ‘경로에 추가’를 누르세요.
          </p>
        </div>

        <div class="route-actions">
          <button
            type="button"
            @click="showRoute"
          >
            경로 보기
          </button>

          <button
            type="button"
            @click="clearRoute"
          >
            전체 초기화
          </button>
        </div>
      </div>

      <ol
        v-if="routePlaces.length > 0"
        class="route-list"
      >
        <li
          v-for="(place, index) in routePlaces"
          :key="place.id"
          class="route-item"
        >
          <span class="route-number">
            {{ index + 1 }}
          </span>

          <div class="route-place-information">
            <strong>{{ place.title }}</strong>
            <small>{{ place.category }}</small>
          </div>

          <div class="route-item-actions">
            <button
              type="button"
              :disabled="index === 0"
              aria-label="순서를 위로 이동"
              @click="moveRoutePlace(index, -1)"
            >
              ↑
            </button>

            <button
              type="button"
              :disabled="index === routePlaces.length - 1"
              aria-label="순서를 아래로 이동"
              @click="moveRoutePlace(index, 1)"
            >
              ↓
            </button>

            <button
              type="button"
              @click="removePlaceFromRoute(place.id)"
            >
              삭제
            </button>
          </div>
        </li>
      </ol>

      <p
        v-else
        class="empty-route-message"
      >
        선택된 시설이 없습니다.
      </p>

      <p
        v-if="routeErrorMessage"
        class="error-message"
      >
        {{ routeErrorMessage }}
      </p>
    </section>

    <section class="map-layout">
      <div
        ref="mapContainer"
        class="map-container"
      />

      <PlaceDetailCard
        :place="selectedPlace"
        :is-in-route="isSelectedPlaceInRoute"
        :route-full="isRouteFull"
        @add-to-route="addPlaceToRoute"
        @close="closePlaceDetail"
      />
    </section>
  </main>
</template>

<style scoped>
.map-page {
  width: min(1180px, calc(100% - 32px));
  margin: 40px auto;
  padding: 32px;

  background:
    linear-gradient(
      145deg,
      #fdfbfa 0%,
      #f4f0e6 100%
    );

  border: 1px solid rgb(255 255 255 / 70%);
  border-radius: 28px;
  box-shadow:
    16px 16px 48px #e0dad0,
    -16px -16px 48px #ffffff;
}

.map-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;

  margin-bottom: 26px;
  padding-bottom: 22px;
  border-bottom: 2px dashed #d5cbbf;
}

.map-header h1 {
  margin: 0 0 8px;
  color: var(--color-primary);
  font-size: 32px;
  line-height: 1.25;
}

.map-header p {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 15px;
}

.status-message {
  margin: 14px 0;
  padding: 13px 16px;

  color: var(--color-primary);
  background: var(--color-primary-soft);
  border: 1px solid #cfdfcc;
  border-radius: var(--radius-medium);
}

.error-message {
  margin: 14px 0;
  padding: 13px 16px;

  color: var(--color-danger-dark);
  background: var(--color-danger-soft);
  border: 1px solid #efcaca;
  border-radius: var(--radius-medium);

  font-weight: 700;
}

.warning-panel {
  margin-bottom: 18px;
  padding: 14px 16px;

  color: #725329;
  background: #fff9ed;
  border: 1px solid #ead9b5;
  border-radius: var(--radius-medium);
}

.warning-panel summary {
  cursor: pointer;
  font-weight: 700;
}

.warning-panel ul {
  margin: 12px 0 0;
  padding-left: 22px;
}

.route-panel {
  margin-bottom: 20px;
  padding: 22px;

  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-large);
  box-shadow: var(--shadow-small);
}

.route-panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.route-panel-header h2 {
  margin: 0 0 6px;
  color: var(--color-primary);
  font-size: 21px;
}

.route-panel-header p {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 14px;
}

.route-actions {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
}

.route-actions button,
.route-item-actions button {
  padding: 9px 14px;

  color: var(--color-text);
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-pill);

  font-weight: 700;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease;
}

.route-actions button:first-child {
  color: #ffffff;
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.route-actions button:hover,
.route-item-actions button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: var(--shadow-small);
}

.route-actions button:first-child:hover {
  background: var(--color-primary-dark);
}

.route-actions button:disabled,
.route-item-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.route-list {
  display: grid;
  gap: 9px;

  margin: 18px 0 0;
  padding: 0;
  list-style: none;
}

.route-item {
  display: flex;
  align-items: center;
  gap: 11px;

  padding: 11px 12px;

  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-medium);
}

.route-number {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;

  width: 30px;
  height: 30px;

  color: #ffffff;
  background: var(--color-secondary);
  border-radius: 50%;

  font-size: 13px;
  font-weight: 800;
}

.route-place-information {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.route-place-information strong {
  overflow: hidden;
  color: var(--color-text);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.route-place-information small {
  margin-top: 3px;
  color: var(--color-text-muted);
}

.route-item-actions {
  display: flex;
  gap: 5px;
}

.route-item-actions button {
  padding: 6px 10px;
  font-size: 12px;
}

.empty-route-message {
  margin: 15px 0 0;
  color: var(--color-text-muted);
}

.map-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 18px;
  align-items: start;
}

.map-container {
  width: 100%;
  height: 70vh;
  min-height: 580px;

  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-large);
  box-shadow: var(--shadow-card);
}

:deep(.place-marker-wrapper) {
  border: 0;
  background: transparent;
}

:deep(.place-marker) {
  display: flex;
  align-items: center;
  justify-content: center;

  width: 34px;
  height: 34px;

  border: 3px solid #ffffff;
  border-radius: 50%;
  box-shadow: 0 3px 9px rgb(65 53 39 / 30%);

  font-size: 13px;
  font-weight: 800;
}

:deep(.category-tourism) {
  background: #e6b85c;
}

:deep(.category-leports) {
  background: #7aaa75;
}

:deep(.category-culture) {
  background: #b89ac4;
}

:deep(.category-shopping) {
  background: #d69d9d;
}

:deep(.category-accommodation) {
  background: #8baec2;
}

:deep(.category-course) {
  background: #88b5af;
}

:deep(.category-festival) {
  background: #d9935e;
}

:deep(.category-food) {
  background: #c97655;
}

:deep(.category-default) {
  background: #bcb4aa;
}

@media (max-width: 900px) {
  .map-page {
    width: min(100% - 24px, 760px);
    margin: 24px auto;
    padding: 22px;
  }

  .map-header,
  .route-panel-header {
    align-items: stretch;
    flex-direction: column;
  }

  .map-layout {
    grid-template-columns: 1fr;
  }

  .map-container {
    height: 62vh;
    min-height: 480px;
  }
}

@media (max-width: 600px) {
  .map-page {
    width: calc(100% - 16px);
    margin: 12px auto;
    padding: 15px;
    border-radius: 20px;
    box-shadow: var(--shadow-card);
  }

  .map-header h1 {
    font-size: 26px;
  }

  .route-actions {
    width: 100%;
  }

  .route-actions button {
    flex: 1;
  }

  .route-item {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .route-item-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>