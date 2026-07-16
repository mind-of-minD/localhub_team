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

  padding: 8px 10px 8px 15px;

  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  box-shadow: var(--shadow-small);
}

.map-filter label {
  flex-shrink: 0;
  color: var(--color-secondary);
  font-size: 14px;
  font-weight: 800;
}

.map-filter select {
  min-width: 190px;
  padding: 10px 36px 10px 13px;

  color: var(--color-text);
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);

  cursor: pointer;
}

.map-filter select:focus {
  border-color: var(--color-primary);
}

@media (max-width: 600px) {
  .map-filter {
    width: 100%;
    border-radius: var(--radius-medium);
  }

  .map-filter select {
    width: 100%;
    min-width: 0;
  }
}
</style>