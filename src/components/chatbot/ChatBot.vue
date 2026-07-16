<template>
  <div class="chatbot">
    <Transition name="chat-panel">
      <ChatWindow
        v-if="isOpen"
        v-model="userInput"
        :messages="messages"
        :loading="loading"
        @send="sendMessage"
        @close="isOpen = false"
        @clear="clearHistory"
      />
    </Transition>

    <button
      v-if="!isOpen"
      type="button"
      class="floating-button"
      aria-label="LocalHub 챗봇 열기"
      @click="isOpen = true"
    >
      <span class="chat-icon">💬</span>
      <span class="button-label">챗봇</span>
    </button>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import ChatWindow from './ChatWindow.vue'

const STORAGE_KEY = 'localhub_chat_history'

const DATA_FILES = [
  {
    path: '서울_관광지.json',
    category: '관광지',
  },
  {
    path: '서울_레포츠.json',
    category: '레포츠',
  },
  {
    path: '서울_문화시설.json',
    category: '문화시설',
  },
  {
    path: '서울_쇼핑.json',
    category: '쇼핑',
  },
  {
    path: '서울_숙박.json',
    category: '숙박',
  },
  {
    path: '서울_여행코스.json',
    category: '여행코스',
  },
  {
    path: '서울_축제공연행사.json',
    category: '축제·공연·행사',
  },
]

const DEFAULT_MESSAGE = {
  role: 'assistant',
  content:
    '안녕하세요. 서울의 관광지, 문화시설, 축제, 숙박, 쇼핑 정보를 안내해 드립니다.',
}

const isOpen = ref(false)
const userInput = ref('')
const loading = ref(false)
const localData = ref([])
const dataLoaded = ref(false)
const messages = ref(loadHistory())

onMounted(loadLocalData)

function loadHistory() {
  try {
    const savedHistory = localStorage.getItem(STORAGE_KEY)

    if (!savedHistory) {
      return [{ ...DEFAULT_MESSAGE }]
    }

    const parsedHistory = JSON.parse(savedHistory)

    return Array.isArray(parsedHistory) && parsedHistory.length > 0
      ? parsedHistory
      : [{ ...DEFAULT_MESSAGE }]
  } catch (error) {
    console.error('채팅 기록을 불러오지 못했습니다.', error)
    return [{ ...DEFAULT_MESSAGE }]
  }
}

async function loadLocalData() {
  try {
    const loadedFiles = await Promise.all(
      DATA_FILES.map(async file => {
        const encodedFileName = encodeURIComponent(file.path)
        const response = await fetch(
          `/data/seoul/${encodedFileName}`,
        )

        if (!response.ok) {
          throw new Error(
            `${file.path} 로드 실패 (${response.status})`,
          )
        }

        const json = await response.json()
        const items = extractItems(json)

        return items.map(item => ({
          ...item,
          _category: file.category,
        }))
      }),
    )

    localData.value = loadedFiles.flat()
    dataLoaded.value = true

    console.log(
      `LocalHub 데이터 ${localData.value.length}건 로드 완료`,
    )
  } catch (error) {
    console.error(error)

    addMessage(
      'system',
      `지역 데이터를 불러오지 못했습니다. ${error.message}`,
    )
  }
}

function extractItems(json) {
  if (Array.isArray(json)) {
    return json
  }

  if (Array.isArray(json.items)) {
    return json.items
  }

  if (Array.isArray(json.data)) {
    return json.data
  }

  if (Array.isArray(json.response?.body?.items?.item)) {
    return json.response.body.items.item
  }

  return []
}

function normalizeText(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getSearchableText(item) {
  return normalizeText([
    item.title,
    item.name,
    item.addr1,
    item.addr2,
    item.overview,
    item.summary,
    item.description,
    item.tel,
    item.eventstartdate,
    item.eventenddate,
    item._category,
  ].join(' '))
}

function rankDocuments(query, topK = 7) {
  const normalizedQuery = normalizeText(query)

  if (!normalizedQuery) return []

  const queryTokens = [
    ...new Set(
      normalizedQuery
        .split(' ')
        .filter(token => token.length >= 2),
    ),
  ]

  return localData.value
    .map(item => {
      const text = getSearchableText(item)
      let score = 0

      if (text.includes(normalizedQuery)) {
        score += 10
      }

      for (const token of queryTokens) {
        if (text.includes(token)) {
          score += 2
        }

        if (
          normalizeText(item.title || item.name).includes(token)
        ) {
          score += 4
        }

        if (normalizeText(item.addr1).includes(token)) {
          score += 3
        }

        if (normalizeText(item._category).includes(token)) {
          score += 3
        }
      }

      return {
        item,
        score,
      }
    })
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(result => result.item)
}

function formatDate(value) {
  const date = String(value ?? '')

  if (!/^\d{8}$/.test(date)) return date

  return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`
}

function buildContext(documents) {
  if (documents.length === 0) {
    return '사용자 질문과 직접 일치하는 제공 데이터가 없습니다.'
  }

  return documents
    .map((item, index) => {
      const title = item.title || item.name || '이름 없음'
      const address = item.addr1 || item.addr2 || '주소 정보 없음'
      const description =
        item.overview ||
        item.summary ||
        item.description ||
        '상세 설명 없음'

      const startDate = formatDate(item.eventstartdate)
      const endDate = formatDate(item.eventenddate)

      return [
        `[${index + 1}]`,
        `이름: ${title}`,
        `분류: ${item._category || '분류 없음'}`,
        `주소: ${address}`,
        startDate ? `시작일: ${startDate}` : '',
        endDate ? `종료일: ${endDate}` : '',
        `설명: ${String(description).slice(0, 500)}`,
      ]
        .filter(Boolean)
        .join('\n')
    })
    .join('\n\n')
}

function createApiMessages(question, documents) {
  const recentHistory = messages.value
    .filter(message =>
      ['user', 'assistant'].includes(message.role),
    )
    .slice(-8)

  return [
    {
      role: 'system',
      content: `
당신은 서울 지역 정보 공유 서비스 LocalHub의 안내 챗봇입니다.

규칙:
1. 아래에 제공된 지역 데이터에 근거하여 답변하세요.
2. 제공된 데이터에 없는 구체적인 사실을 임의로 만들지 마세요.
3. 장소를 추천할 때 이름, 분류, 주소를 명확하게 표시하세요.
4. 질문과 일치하는 데이터가 없으면 제공 데이터에서 확인되지 않는다고 안내하세요.
5. 답변은 한국어로 작성하세요.
6. 너무 길지 않게 핵심 내용을 정리하세요.
      `.trim(),
    },

    ...recentHistory,

    {
      role: 'user',
      content: `
다음은 사용자 질문과 관련성이 높은 LocalHub 지역 데이터입니다.

<지역 데이터>
${buildContext(documents)}
</지역 데이터>

<사용자 질문>
${question}
</사용자 질문>
      `.trim(),
    },
  ]
}

async function callOpenAI(apiMessages, originalQuestion) {
  const useMock =
    import.meta.env.VITE_USE_MOCK_API === 'true'

  if (useMock) {
    return createMockResponse(originalQuestion)
  }

  const apiKey = import.meta.env.VITE_OPENAI_API_KEY

  if (!apiKey) {
    throw new Error(
      'VITE_OPENAI_API_KEY가 설정되지 않았습니다.',
    )
  }

  const response = await fetch(
    'https://api.openai.com/v1/chat/completions',
    {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },

      body: JSON.stringify({
        model: 'gpt-5-mini',
        messages: apiMessages,
        max_completion_tokens: 700,
      }),
    },
  )

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => null)

    const errorMessage =
      errorData?.error?.message ||
      `OpenAI API 요청 실패 (${response.status})`

    throw new Error(errorMessage)
  }

  const data = await response.json()

  return (
    data.choices?.[0]?.message?.content ||
    '응답 내용을 확인할 수 없습니다.'
  )
}

function createMockResponse(question) {
  return [
    '현재 모의 API 모드입니다.',
    '',
    `입력한 질문: ${question}`,
    '',
    '실제 OpenAI 응답을 사용하려면 .env에서',
    'VITE_USE_MOCK_API=false로 변경하세요.',
  ].join('\n')
}

async function sendMessage() {
  const question = userInput.value.trim()

  if (!question || loading.value) return

  addMessage('user', question)
  userInput.value = ''

  if (!dataLoaded.value) {
    addMessage(
      'system',
      '지역 데이터를 아직 불러오는 중입니다. 잠시 후 다시 질문해 주세요.',
    )
    return
  }

  loading.value = true

  try {
    const documents = rankDocuments(question)
    const apiMessages = createApiMessages(
      question,
      documents,
    )

    const answer = await callOpenAI(
      apiMessages,
      question,
    )

    addMessage('assistant', answer)
  } catch (error) {
    console.error(error)

    addMessage(
      'system',
      `챗봇 요청 중 오류가 발생했습니다. ${error.message}`,
    )
  } finally {
    loading.value = false
  }
}

function addMessage(role, content) {
  messages.value.push({
    role,
    content,
  })

  saveHistory()
}

function saveHistory() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(messages.value),
    )
  } catch (error) {
    console.error('채팅 기록 저장 실패', error)
  }
}

function clearHistory() {
  messages.value = [{ ...DEFAULT_MESSAGE }]
  saveHistory()
}
</script>

<style scoped>
.chatbot {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 2000;
}

.floating-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  color: #ffffff;
  background: #2563eb;
  border: 0;
  border-radius: 50%;
  box-shadow: 0 10px 28px rgb(37 99 235 / 35%);
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.floating-button:hover {
  transform: translateY(-3px);
  box-shadow: 0 14px 32px rgb(37 99 235 / 42%);
}

.chat-icon {
  font-size: 22px;
  line-height: 1;
}

.button-label {
  margin-top: 2px;
  font-size: 10px;
  font-weight: 700;
}

.chat-panel-enter-active,
.chat-panel-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.chat-panel-enter-from,
.chat-panel-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}

@media (max-width: 600px) {
  .chatbot {
    right: 0;
    bottom: 0;
  }

  .floating-button {
    position: fixed;
    right: 16px;
    bottom: 16px;
  }
}
</style>