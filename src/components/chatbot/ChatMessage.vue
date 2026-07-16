<template>
  <div class="message-row" :class="role">
    <div class="message-bubble">
      <span class="message-label">{{ roleLabel }}</span>
      <p class="message-content">{{ content }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  role: {
    type: String,
    required: true,
    validator: value =>
      ['user', 'assistant', 'system'].includes(value),
  },

  content: {
    type: String,
    required: true,
  },
})

const roleLabel = computed(() => {
  if (props.role === 'user') return '나'
  if (props.role === 'assistant') return 'LocalHub'
  return '안내'
})
</script>

<style scoped>
.message-row {
  display: flex;
  width: 100%;
  margin-bottom: 12px;
}

.message-row.user {
  justify-content: flex-end;
}

.message-row.assistant,
.message-row.system {
  justify-content: flex-start;
}

.message-bubble {
  max-width: 84%;
  padding: 11px 14px;

  border-radius: 16px;
  line-height: 1.55;
  overflow-wrap: anywhere;

  box-shadow: 0 3px 10px rgb(83 70 55 / 6%);
}

.user .message-bubble {
  color: #ffffff;
  background: var(--color-primary);
  border-bottom-right-radius: 5px;
}

.assistant .message-bubble {
  color: var(--color-text);
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-bottom-left-radius: 5px;
}

.system .message-bubble {
  color: var(--color-danger-dark);
  background: var(--color-danger-soft);
  border: 1px solid #edcaca;
}

.message-label {
  display: block;
  margin-bottom: 4px;

  font-size: 11px;
  font-weight: 800;
  opacity: 0.75;
}

.message-content {
  margin: 0;
  font-size: 14px;
  white-space: pre-wrap;
}
</style>