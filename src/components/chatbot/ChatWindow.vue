<template>
  <section class="chat-window" aria-label="LocalHub 챗봇">
    <header class="chat-header">
      <div>
        <strong>LocalHub 챗봇</strong>
        <p>서울 지역 정보를 물어보세요.</p>
      </div>

      <div class="header-actions">
        <button
          type="button"
          class="text-button"
          title="대화 내용 삭제"
          @click="$emit('clear')"
        >
          초기화
        </button>

        <button
          type="button"
          class="close-button"
          aria-label="챗봇 닫기"
          @click="$emit('close')"
        >
          ×
        </button>
      </div>
    </header>

    <main ref="messageContainer" class="messages">
      <ChatMessage
        v-for="(message, index) in messages"
        :key="`${index}-${message.role}`"
        :role="message.role"
        :content="message.content"
      />

      <div v-if="loading" class="loading-message">
        <span class="loading-dot"></span>
        <span class="loading-dot"></span>
        <span class="loading-dot"></span>
        <span class="loading-text">답변을 작성하고 있습니다.</span>
      </div>
    </main>

    <form class="input-area" @submit.prevent="submitMessage">
      <input
        :value="modelValue"
        type="text"
        placeholder="관광지, 축제, 숙박 등을 질문하세요."
        autocomplete="off"
        :disabled="loading"
        @input="updateInput"
      />

      <button
        type="submit"
        :disabled="loading || !modelValue.trim()"
      >
        전송
      </button>
    </form>
  </section>
</template>

<script setup>
import { nextTick, ref, watch } from 'vue'
import ChatMessage from './ChatMessage.vue'

const props = defineProps({
  messages: {
    type: Array,
    required: true,
  },

  modelValue: {
    type: String,
    default: '',
  },

  loading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits([
  'update:modelValue',
  'send',
  'close',
  'clear',
])

const messageContainer = ref(null)

function updateInput(event) {
  emit('update:modelValue', event.target.value)
}

function submitMessage() {
  const value = props.modelValue.trim()

  if (!value || props.loading) return

  emit('send')
}

async function scrollToBottom() {
  await nextTick()

  const container = messageContainer.value

  if (!container) return

  container.scrollTop = container.scrollHeight
}

watch(
  () => props.messages.length,
  scrollToBottom,
)

watch(
  () => props.loading,
  scrollToBottom,
)
</script>

<style scoped>
.chat-window {
  display: flex;
  flex-direction: column;
  width: 360px;
  height: min(560px, calc(100vh - 110px));
  overflow: hidden;
  background: #ffffff;
  border: 1px solid #dbe3ef;
  border-radius: 18px;
  box-shadow: 0 18px 50px rgb(15 23 42 / 20%);
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 68px;
  padding: 12px 16px;
  color: #ffffff;
  background: #2563eb;
}

.chat-header strong {
  font-size: 16px;
}

.chat-header p {
  margin: 3px 0 0;
  font-size: 12px;
  opacity: 0.85;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.text-button,
.close-button {
  border: 0;
  color: #ffffff;
  background: transparent;
  cursor: pointer;
}

.text-button {
  padding: 6px;
  font-size: 12px;
}

.close-button {
  width: 34px;
  height: 34px;
  font-size: 25px;
  line-height: 1;
  border-radius: 50%;
}

.close-button:hover,
.text-button:hover {
  background: rgb(255 255 255 / 15%);
}

.messages {
  flex: 1;
  min-height: 0;
  padding: 16px;
  overflow-y: auto;
  background: #ffffff;
}

.loading-message {
  display: flex;
  align-items: center;
  gap: 4px;
  width: fit-content;
  padding: 10px 13px;
  color: #475569;
  background: #f1f5f9;
  border-radius: 14px;
}

.loading-dot {
  width: 5px;
  height: 5px;
  background: #64748b;
  border-radius: 50%;
  animation: blink 1.2s infinite;
}

.loading-dot:nth-child(2) {
  animation-delay: 0.15s;
}

.loading-dot:nth-child(3) {
  animation-delay: 0.3s;
}

.loading-text {
  margin-left: 5px;
  font-size: 12px;
}

.input-area {
  display: flex;
  gap: 8px;
  padding: 12px;
  background: #ffffff;
  border-top: 1px solid #e5e7eb;
}

.input-area input {
  flex: 1;
  min-width: 0;
  padding: 11px 12px;
  font-size: 14px;
  outline: none;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
}

.input-area input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgb(37 99 235 / 12%);
}

.input-area button {
  padding: 0 16px;
  color: #ffffff;
  font-weight: 700;
  background: #2563eb;
  border: 0;
  border-radius: 10px;
  cursor: pointer;
}

.input-area button:disabled {
  cursor: not-allowed;
  background: #94a3b8;
}

@keyframes blink {
  0%,
  80%,
  100% {
    opacity: 0.25;
  }

  40% {
    opacity: 1;
  }
}

@media (max-width: 600px) {
  .chat-window {
    width: 100%;
    height: 100%;
    border: 0;
    border-radius: 0;
  }

  .chat-header {
    min-height: 64px;
  }
}
</style>