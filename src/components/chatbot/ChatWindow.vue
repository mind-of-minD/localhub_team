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

  width: 370px;
  height: min(580px, calc(100vh - 110px));
  overflow: hidden;

  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-large);
  box-shadow: 0 22px 60px rgb(65 53 39 / 22%);
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  min-height: 72px;
  padding: 13px 17px;

  color: #ffffff;
  background:
    linear-gradient(
      135deg,
      var(--color-primary) 0%,
      var(--color-primary-dark) 100%
    );
}

.chat-header strong {
  font-size: 17px;
}

.chat-header p {
  margin: 4px 0 0;
  font-size: 12px;
  opacity: 0.82;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.text-button,
.close-button {
  color: #ffffff;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.text-button {
  padding: 7px 9px;
  border-radius: var(--radius-pill);
  font-size: 12px;
  font-weight: 700;
}

.close-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;

  width: 34px;
  height: 34px;

  border-radius: 50%;
  font-size: 25px;
  line-height: 1;
}

.close-button:hover,
.text-button:hover {
  background: rgb(255 255 255 / 15%);
}

.messages {
  flex: 1;
  min-height: 0;
  padding: 17px;
  overflow-y: auto;

  background: var(--color-surface-muted);
}

.loading-message {
  display: flex;
  align-items: center;
  gap: 4px;

  width: fit-content;
  padding: 10px 14px;

  color: var(--color-text-muted);
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: 15px 15px 15px 5px;
  box-shadow: var(--shadow-small);
}

.loading-dot {
  width: 5px;
  height: 5px;

  background: var(--color-secondary);
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

  padding: 13px;

  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
}

.input-area input {
  flex: 1;
  min-width: 0;
  padding: 12px 14px;

  color: var(--color-text);
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-pill);

  font-size: 14px;
  outline: none;
}

.input-area input:focus {
  background: #ffffff;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgb(45 90 39 / 12%);
}

.input-area button {
  padding: 0 18px;

  color: #ffffff;
  background: var(--color-primary);
  border: 0;
  border-radius: var(--radius-pill);

  font-weight: 800;
  cursor: pointer;
}

.input-area button:hover:not(:disabled) {
  background: var(--color-primary-dark);
}

.input-area button:disabled {
  color: #8e877e;
  background: #ddd6cc;
  cursor: not-allowed;
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