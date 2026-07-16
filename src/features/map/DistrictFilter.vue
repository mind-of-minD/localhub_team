<template>
  <div class="district-filter">
    <label for="district-select">
      자치구
    </label>

    <select
      id="district-select"
      :value="selectedDistrict"
      @change="handleChange"
    >
      <option
        v-for="district in districts"
        :key="district.id"
        :value="district.name"
      >
        {{ district.name }}
      </option>
    </select>
  </div>
</template>

<script setup>
defineProps({
  selectedDistrict: {
    type: String,
    required: true,
  },

  districts: {
    type: Array,
    required: true,
  },
})

const emit = defineEmits([
  'update:selectedDistrict',
])

function handleChange(event) {
  emit(
    'update:selectedDistrict',
    event.target.value,
  )
}
</script>

<style scoped>
.district-filter {
  display: flex;
  align-items: center;
  gap: 10px;

  padding: 8px 10px 8px 15px;

  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  box-shadow: var(--shadow-small);
}

.district-filter label {
  flex-shrink: 0;

  color: var(--color-secondary);
  font-size: 14px;
  font-weight: 800;
}

.district-filter select {
  min-width: 150px;
  padding: 10px 35px 10px 13px;

  color: var(--color-text);
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);

  cursor: pointer;
}

@media (max-width: 600px) {
  .district-filter {
    width: 100%;
    border-radius: var(--radius-medium);
  }

  .district-filter select {
    width: 100%;
    min-width: 0;
  }
}
</style>