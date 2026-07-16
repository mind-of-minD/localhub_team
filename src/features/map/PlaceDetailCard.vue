<script setup>
defineProps({
  place: {
    type: Object,
    default: null,
  },

  isInRoute: {
    type: Boolean,
    default: false,
  },

  routeFull: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['add-to-route', 'close'])
</script>

<template>
  <aside class="place-card">
    <template v-if="place">
      <div class="card-header">
        <span class="category-badge">
          {{ place.category }}
        </span>

        <button
          type="button"
          class="close-button"
          aria-label="상세 정보 닫기"
          @click="emit('close')"
        >
          ×
        </button>
      </div>

      <img
        v-if="place.image"
        :src="place.image"
        :alt="place.title"
        class="place-image"
      />

      <div v-else class="image-placeholder">
        이미지 없음
      </div>

      <h2>{{ place.title }}</h2>

      <dl class="place-information">
        <div>
          <dt>주소</dt>
          <dd>{{ place.address }}</dd>
        </div>

        <div v-if="place.telephone">
          <dt>전화</dt>
          <dd>{{ place.telephone }}</dd>
        </div>

        <div v-if="place.zipcode">
          <dt>우편번호</dt>
          <dd>{{ place.zipcode }}</dd>
        </div>
      </dl>

      <button
        type="button"
        class="route-add-button"
        :disabled="isInRoute || routeFull"
        @click="emit('add-to-route', place)"
      >
        <template v-if="isInRoute">
          경로에 추가됨
        </template>

        <template v-else-if="routeFull">
          최대 5개까지 선택 가능
        </template>

        <template v-else>
          경로에 추가
        </template>
      </button>
    </template>

    <template v-else>
      <div class="empty-detail">
        지도에서 시설 마커를 선택하세요.
      </div>
    </template>
  </aside>
</template>

<style scoped>
.place-card {
  overflow: hidden;
  width: 320px;

  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-large);
  box-shadow: var(--shadow-card);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  padding: 15px 16px 0;
}

.category-badge {
  padding: 5px 11px;

  color: var(--color-secondary-dark);
  background: var(--color-secondary-soft);
  border: 1px solid #e0cbb6;
  border-radius: var(--radius-pill);

  font-size: 12px;
  font-weight: 800;
}

.close-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;

  width: 34px;
  height: 34px;

  color: var(--color-text-muted);
  background: var(--color-surface-muted);
  border: 0;
  border-radius: 50%;

  font-size: 24px;
  cursor: pointer;
}

.close-button:hover {
  color: var(--color-primary);
  background: var(--color-primary-soft);
}

.place-image,
.image-placeholder {
  width: calc(100% - 32px);
  height: 180px;
  margin: 13px 16px 0;

  border-radius: var(--radius-medium);
}

.place-image {
  object-fit: cover;
}

.image-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;

  color: var(--color-text-muted);
  background: var(--color-surface-muted);
  border: 1px dashed var(--color-border-strong);
}

.place-card h2 {
  margin: 17px 16px 13px;
  color: var(--color-primary);
  font-size: 21px;
  line-height: 1.4;
}

.place-information {
  margin: 0 16px;
}

.place-information div {
  margin-bottom: 12px;
  padding-bottom: 11px;
  border-bottom: 1px solid #f0ece6;
}

.place-information div:last-child {
  border-bottom: 0;
}

.place-information dt {
  margin-bottom: 4px;
  color: var(--color-secondary);
  font-size: 12px;
  font-weight: 800;
}

.place-information dd {
  margin: 0;
  color: var(--color-text);
  line-height: 1.55;
}

.route-add-button {
  width: calc(100% - 32px);
  margin: 7px 16px 16px;
  padding: 12px;

  color: #ffffff;
  background: var(--color-primary);
  border: 0;
  border-radius: var(--radius-pill);

  font-weight: 800;
  cursor: pointer;
  transition:
    background 0.2s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.route-add-button:hover:not(:disabled) {
  background: var(--color-primary-dark);
  transform: translateY(-1px);
  box-shadow: var(--shadow-small);
}

.route-add-button:disabled {
  color: #8e877e;
  background: #e7e1d8;
  cursor: not-allowed;
}

.empty-detail {
  display: flex;
  min-height: 220px;
  align-items: center;
  justify-content: center;

  padding: 24px;

  color: var(--color-text-muted);
  text-align: center;
}

@media (max-width: 900px) {
  .place-card {
    width: 100%;
  }
}
</style>