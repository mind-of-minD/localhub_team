<template>
  <section class="weather-panel">
    <header class="weather-header">
      <div>
        <p class="weather-eyebrow">
          기상청 초단기실황
        </p>

        <h2>
          {{ displayDistrictName }} 현재 날씨
        </h2>

        <p>
          선택한 자치구의 대표 기상 관측값입니다.
        </p>
      </div>

      <button
        type="button"
        :disabled="loading"
        @click="loadWeather(true)"
      >
        {{ loading ? '조회 중' : '새로고침' }}
      </button>
    </header>

    <p
      v-if="errorMessage"
      class="weather-error"
    >
      {{ errorMessage }}
    </p>

    <div
      v-else-if="loading && !weather"
      class="weather-loading"
    >
      날씨 정보를 불러오는 중입니다.
    </div>

    <article
      v-else-if="weather"
      class="weather-card"
    >
      <div class="weather-main">
        <span class="weather-icon">
          {{ weather.precipitation.icon }}
        </span>

        <div>
          <strong>
            {{ displayTemperature(weather.temperature) }}
          </strong>

          <p>
            {{ weather.precipitation.label }}
          </p>
        </div>
      </div>

      <dl class="weather-details">
        <div>
          <dt>습도</dt>
          <dd>
            {{ displayValue(weather.humidity, '%') }}
          </dd>
        </div>

        <div>
          <dt>풍속</dt>
          <dd>
            {{ displayValue(weather.windSpeed, 'm/s') }}
          </dd>
        </div>

        <div>
          <dt>강수량</dt>
          <dd>
            {{ displayValue(weather.rainAmount, 'mm') }}
          </dd>
        </div>
      </dl>

      <div
        class="travel-status"
        :class="`travel-${weather.travelSuitability.level}`"
      >
        <div>
          <strong>
            {{ weather.travelSuitability.label }}
          </strong>

          <span>
            {{ weather.travelSuitability.score }}점
          </span>
        </div>

        <p>
          {{ weather.travelSuitability.message }}
        </p>
      </div>
    </article>

    <p class="weather-notice">
      여행 적합도는 LocalHub 자체 판단 기준입니다.
    </p>
  </section>
</template>

<script setup>
import {
  computed,
  ref,
  watch,
} from 'vue'

import {
  ALL_DISTRICTS,
  SEOUL_DISTRICTS,
} from '../../constants/seoulDistricts'

import {
  clearWeatherCache,
  fetchRegionCurrentWeather,
} from '../../services/kmaWeatherService'

const props = defineProps({
  selectedDistrict: {
    type: String,
    required: true,
  },
})

const weather = ref(null)
const loading = ref(false)
const errorMessage = ref('')

const selectedDistrictInfo = computed(() => {
  if (props.selectedDistrict === ALL_DISTRICTS) {
    return SEOUL_DISTRICTS.find(
      district => district.name === '중구',
    )
  }

  return SEOUL_DISTRICTS.find(
    district =>
      district.name === props.selectedDistrict,
  )
})

const displayDistrictName = computed(() => {
  return props.selectedDistrict === ALL_DISTRICTS
    ? '서울'
    : props.selectedDistrict
})

watch(
  selectedDistrictInfo,
  () => {
    loadWeather()
  },
  {
    immediate: true,
  },
)

async function loadWeather(forceRefresh = false) {
  if (loading.value || !selectedDistrictInfo.value) {
    return
  }

  loading.value = true
  errorMessage.value = ''

  if (forceRefresh) {
    clearWeatherCache()
  }

  try {
    weather.value =
      await fetchRegionCurrentWeather(
        selectedDistrictInfo.value,
      )
  } catch (error) {
    console.error(
      '[WEATHER] 자치구 날씨 조회 실패',
      error,
    )

    weather.value = null
    errorMessage.value =
      error.message ||
      '날씨 정보를 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

function displayTemperature(value) {
  return Number.isFinite(value)
    ? `${value}℃`
    : '-'
}

function displayValue(value, unit) {
  return Number.isFinite(value)
    ? `${value}${unit}`
    : '-'
}
</script>

<style scoped>
.weather-panel {
  margin-bottom: 24px;
  padding: 22px;

  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-large);
  box-shadow: var(--shadow-small);
}

.weather-header {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 18px;
}

.weather-eyebrow {
  margin: 0 0 5px;

  color: var(--color-secondary);
  font-size: 12px;
  font-weight: 800;
}

.weather-header h2 {
  margin: 0;
  color: var(--color-primary);
}

.weather-header p {
  margin: 6px 0 0;
  color: var(--color-text-muted);
  font-size: 13px;
}

.weather-header button {
  align-self: flex-start;
  padding: 9px 15px;

  color: #ffffff;
  background: var(--color-primary);
  border: 0;
  border-radius: var(--radius-pill);

  font-weight: 800;
  cursor: pointer;
}

.weather-header button:disabled {
  cursor: wait;
  opacity: 0.5;
}

.weather-card {
  display: grid;
  grid-template-columns: 180px 1fr 1.4fr;
  gap: 18px;
  align-items: center;

  padding: 18px;

  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-medium);
}

.weather-main {
  display: flex;
  align-items: center;
  gap: 12px;
}

.weather-icon {
  font-size: 42px;
}

.weather-main strong {
  color: var(--color-primary);
  font-size: 30px;
}

.weather-main p {
  margin: 3px 0 0;
  color: var(--color-text-muted);
}

.weather-details {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 7px;
  margin: 0;
}

.weather-details div {
  padding: 10px 6px;

  background: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: 10px;

  text-align: center;
}

.weather-details dt {
  color: var(--color-text-muted);
  font-size: 10px;
}

.weather-details dd {
  margin: 4px 0 0;
  font-size: 13px;
  font-weight: 800;
}

.travel-status {
  padding: 13px;
  border-radius: 12px;
}

.travel-status > div {
  display: flex;
  justify-content: space-between;
}

.travel-status p {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.45;
}

.travel-good {
  color: #275c2c;
  background: #eaf6e9;
}

.travel-normal {
  color: #735420;
  background: #fff4d9;
}

.travel-bad {
  color: #8c3434;
  background: #fff0f0;
}

.weather-error,
.weather-loading {
  padding: 13px 15px;
  border-radius: 12px;
}

.weather-error {
  color: var(--color-danger-dark);
  background: var(--color-danger-soft);
}

.weather-loading {
  color: var(--color-primary);
  background: var(--color-primary-soft);
}

.weather-notice {
  margin: 12px 0 0;

  color: var(--color-text-muted);
  font-size: 11px;
  text-align: right;
}

@media (max-width: 900px) {
  .weather-card {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .weather-header {
    flex-direction: column;
  }

  .weather-header button {
    width: 100%;
  }
}
</style>