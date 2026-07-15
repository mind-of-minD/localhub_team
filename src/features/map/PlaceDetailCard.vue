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
  border: 1px solid #d4d4d4;
  border-radius: 10px;
  background: white;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px 0;
}

.category-badge {
  padding: 4px 9px;
  border: 1px solid #aaa;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.close-button {
  border: 0;
  background: transparent;
  font-size: 24px;
  cursor: pointer;
}

.place-image,
.image-placeholder {
  width: calc(100% - 28px);
  height: 180px;
  margin: 12px 14px 0;
  border-radius: 8px;
}

.place-image {
  object-fit: cover;
}

.image-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #ddd;
}

.place-card h2 {
  margin: 16px 14px 12px;
  font-size: 20px;
}

.place-information {
  margin: 0 14px;
}

.place-information div {
  margin-bottom: 11px;
}

.place-information dt {
  margin-bottom: 3px;
  font-size: 12px;
  font-weight: 700;
}

.place-information dd {
  margin: 0;
  line-height: 1.5;
}

.route-add-button {
  width: calc(100% - 28px);
  margin: 6px 14px 14px;
  padding: 11px;
  border: 1px solid #888;
  border-radius: 7px;
  cursor: pointer;
}

.route-add-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.empty-detail {
  display: flex;
  min-height: 200px;
  align-items: center;
  justify-content: center;
  padding: 20px;
  text-align: center;
}

@media (max-width: 900px) {
  .place-card {
    width: 100%;
  }
}
</style>