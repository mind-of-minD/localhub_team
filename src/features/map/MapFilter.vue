<script setup>
defineProps({
  categories: {
    type: Array,
    required: true,
  },

  selectedCategory: {
    type: String,
    required: true,
  },

  categoryCounts: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(['update:selectedCategory'])

function changeCategory(event) {
  emit('update:selectedCategory', event.target.value)
}
</script>

<template>
  <section class="map-filter">
    <label for="map-category">시설 유형</label>

    <select
      id="map-category"
      :value="selectedCategory"
      @change="changeCategory"
    >
      <option
        v-for="category in categories"
        :key="category"
        :value="category"
      >
        {{ category }}
        <template v-if="categoryCounts[category] !== undefined">
          ({{ categoryCounts[category].toLocaleString() }})
        </template>
      </option>
    </select>
  </section>
</template>

<style scoped>
.map-filter {
  display: flex;
  align-items: center;
  gap: 10px;
}

.map-filter label {
  flex-shrink: 0;
  font-weight: 700;
}

.map-filter select {
  min-width: 180px;
  padding: 9px 12px;
  border: 1px solid #b8b8b8;
  border-radius: 7px;
  background: white;
}

@media (max-width: 600px) {
  .map-filter {
    width: 100%;
  }

  .map-filter select {
    width: 100%;
  }
}
</style>