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
  max-width: 82%;
  padding: 10px 13px;
  border-radius: 14px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.user .message-bubble {
  color: #ffffff;
  background: #2563eb;
  border-bottom-right-radius: 4px;
}

.assistant .message-bubble {
  color: #1f2937;
  background: #f1f5f9;
  border-bottom-left-radius: 4px;
}

.system .message-bubble {
  color: #991b1b;
  background: #fee2e2;
  border: 1px solid #fecaca;
}

.message-label {
  display: block;
  margin-bottom: 3px;
  font-size: 11px;
  font-weight: 700;
  opacity: 0.75;
}

.message-content {
  margin: 0;
  font-size: 14px;
  white-space: pre-wrap;
}
</style>