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
import { askGPT } from '../../services/openai'
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

/**
 * localStorage에 저장된 기존 대화 기록을 불러옵니다.
 */
function loadHistory() {
  try {
    const savedHistory = localStorage.getItem(STORAGE_KEY)

    if (!savedHistory) {
      return [{ ...DEFAULT_MESSAGE }]
    }

    const parsedHistory = JSON.parse(savedHistory)

    if (
      !Array.isArray(parsedHistory) ||
      parsedHistory.length === 0
    ) {
      return [{ ...DEFAULT_MESSAGE }]
    }

    return parsedHistory.filter(message => {
      return (
        message &&
        ['user', 'assistant', 'system'].includes(
          message.role,
        ) &&
        typeof message.content === 'string'
      )
    })
  } catch (error) {
    console.error(
      '채팅 기록을 불러오지 못했습니다.',
      error,
    )

    return [{ ...DEFAULT_MESSAGE }]
  }
}

/**
 * public/data/seoul 아래의 서울 공공데이터를 불러옵니다.
 */
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

    dataLoaded.value = false

    addMessage(
      'system',
      `지역 데이터를 불러오지 못했습니다. ${error.message}`,
    )
  }
}

/**
 * JSON 파일마다 다른 배열 구조를 하나로 처리합니다.
 */
function extractItems(json) {
  if (Array.isArray(json)) {
    return json
  }

  if (Array.isArray(json?.items)) {
    return json.items
  }

  if (Array.isArray(json?.data)) {
    return json.data
  }

  if (Array.isArray(json?.response?.body?.items?.item)) {
    return json.response.body.items.item
  }

  return []
}

/**
 * 검색 비교를 위해 문자열을 정규화합니다.
 */
function normalizeText(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * 데이터 한 건에서 검색에 사용할 문자열을 생성합니다.
 */
function getSearchableText(item) {
  return normalizeText(
    [
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
    ].join(' '),
  )
}

/**
 * 사용자 질문과 관련성이 높은 지역 데이터를 찾습니다.
 */
function rankDocuments(query, topK = 7) {
  const normalizedQuery = normalizeText(query)

  if (!normalizedQuery) {
    return []
  }

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
      const title = normalizeText(
        item.title || item.name,
      )
      const address = normalizeText(
        [item.addr1, item.addr2].join(' '),
      )
      const category = normalizeText(item._category)

      let score = 0

      if (text.includes(normalizedQuery)) {
        score += 10
      }

      for (const token of queryTokens) {
        if (text.includes(token)) {
          score += 2
        }

        if (title.includes(token)) {
          score += 4
        }

        if (address.includes(token)) {
          score += 3
        }

        if (category.includes(token)) {
          score += 3
        }
      }

      return {
        item,
        score,
      }
    })
    .filter(result => result.score > 0)
    .sort((first, second) => second.score - first.score)
    .slice(0, topK)
    .map(result => result.item)
}

/**
 * YYYYMMDD 형식 날짜를 YYYY-MM-DD로 변환합니다.
 */
function formatDate(value) {
  const date = String(value ?? '')

  if (!/^\d{8}$/.test(date)) {
    return date
  }

  return [
    date.slice(0, 4),
    date.slice(4, 6),
    date.slice(6, 8),
  ].join('-')
}

/**
 * 검색된 지역 데이터를 AI에 전달할 텍스트로 변환합니다.
 */
function buildContext(documents) {
  if (documents.length === 0) {
    return '사용자 질문과 직접 일치하는 제공 데이터가 없습니다.'
  }

  return documents
    .map((item, index) => {
      const title =
        item.title || item.name || '이름 없음'

      const address =
        [item.addr1, item.addr2]
          .filter(Boolean)
          .join(' ') || '주소 정보 없음'

      const description =
        item.overview ||
        item.summary ||
        item.description ||
        '상세 설명 없음'

      const startDate = formatDate(
        item.eventstartdate,
      )

      const endDate = formatDate(
        item.eventenddate,
      )

      const telephone = item.tel
        ? `전화번호: ${item.tel}`
        : ''

      return [
        `[${index + 1}]`,
        `이름: ${title}`,
        `분류: ${item._category || '분류 없음'}`,
        `주소: ${address}`,
        telephone,
        startDate ? `시작일: ${startDate}` : '',
        endDate ? `종료일: ${endDate}` : '',
        `설명: ${String(description).slice(0, 500)}`,
      ]
        .filter(Boolean)
        .join('\n')
    })
    .join('\n\n')
}

/**
 * 현재 질문을 제외한 최근 대화 기록을 가져옵니다.
 */
function getRecentHistory() {
  const conversation = messages.value.filter(
    message =>
      ['user', 'assistant'].includes(message.role),
  )

  // sendMessage에서 현재 사용자 질문을 먼저 추가하므로,
  // 마지막 사용자 메시지는 기존 기록에서 제외합니다.
  return conversation
    .slice(0, -1)
    .slice(-8)
    .map(message => ({
      role: message.role,
      content: message.content,
    }))
}

/**
 * OpenAI에 전달할 대화 메시지를 생성합니다.
 */
function createApiMessages(question, documents) {
  const recentHistory = getRecentHistory()

  return [
    {
      role: 'system',
      content: `
당신은 서울 지역 정보 공유 서비스 LocalHub의 안내 챗봇입니다.

규칙:
1. 제공된 LocalHub 지역 데이터에 근거하여 답변하세요.
2. 데이터에 없는 구체적인 사실을 임의로 만들지 마세요.
3. 장소를 추천할 때 장소 이름, 분류, 주소를 명확하게 표시하세요.
4. 사용자의 조건에 맞는 장소가 여러 개라면 최대 5개까지만 추천하세요.
5. 질문과 일치하는 데이터가 없으면 제공 데이터에서 확인되지 않는다고 안내하세요.
6. 사용자가 추가 질문을 하면 이전 대화 맥락을 참고하세요.
7. 답변은 이해하기 쉬운 한국어로 작성하세요.
8. 답변은 지나치게 길게 작성하지 말고 핵심 내용을 정리하세요.
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

/**
 * 모의 API 또는 실제 백엔드 챗봇 API를 호출합니다.
 */
async function callOpenAI(
  apiMessages,
  originalQuestion,
) {
  const useMock =
    import.meta.env.VITE_USE_MOCK_API === 'true'

  if (useMock) {
    return createMockResponse(
      originalQuestion,
      apiMessages,
    )
  }

  return askGPT(apiMessages)
}

/**
 * OpenAI API를 사용하지 않고 UI를 시험할 때 반환할 답변입니다.
 */
function createMockResponse(question, apiMessages) {
  const contextMessage = apiMessages.find(
    message =>
      message.role === 'user' &&
      message.content.includes('<지역 데이터>'),
  )

  const hasSearchResult =
    contextMessage &&
    !contextMessage.content.includes(
      '사용자 질문과 직접 일치하는 제공 데이터가 없습니다.',
    )

  if (!hasSearchResult) {
    return [
      '현재 모의 API 모드입니다.',
      '',
      `"${question}"과 직접 일치하는 지역 데이터를 찾지 못했습니다.`,
      '',
      '실제 AI 답변을 사용하려면 .env에서',
      'VITE_USE_MOCK_API=false로 변경하세요.',
    ].join('\n')
  }

  return [
    '현재 모의 API 모드입니다.',
    '',
    `입력한 질문: ${question}`,
    '',
    '질문과 관련된 서울 지역 데이터를 찾았습니다.',
    '실제 AI 답변을 사용하려면 .env에서',
    'VITE_USE_MOCK_API=false로 변경하세요.',
  ].join('\n')
}

/**
 * 사용자가 입력한 질문을 처리합니다.
 */
async function sendMessage() {
  const question = userInput.value.trim()

  if (!question || loading.value) {
    return
  }

  if (!dataLoaded.value) {
    addMessage(
      'system',
      '지역 데이터를 아직 불러오지 못했습니다. 잠시 후 다시 질문해 주세요.',
    )

    return
  }

  addMessage('user', question)

  userInput.value = ''
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
    console.error(
      '챗봇 요청 중 오류가 발생했습니다.',
      error,
    )

    addMessage(
      'system',
      `챗봇 요청 중 오류가 발생했습니다. ${error.message}`,
    )
  } finally {
    loading.value = false
  }
}

/**
 * 새 메시지를 추가하고 localStorage에 저장합니다.
 */
function addMessage(role, content) {
  if (
    !['user', 'assistant', 'system'].includes(role)
  ) {
    console.error(
      `지원하지 않는 메시지 역할입니다: ${role}`,
    )

    return
  }

  const normalizedContent = String(content ?? '').trim()

  if (!normalizedContent) {
    return
  }

  messages.value.push({
    role,
    content: normalizedContent,
  })

  saveHistory()
}

/**
 * 대화 기록을 localStorage에 저장합니다.
 */
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

/**
 * 대화를 초기 상태로 되돌립니다.
 */
function clearHistory() {
  messages.value = [{ ...DEFAULT_MESSAGE }]
  userInput.value = ''

  saveHistory()
}
</script>

<style scoped>
.chatbot {
  position: fixed;
  right: 22px;
  bottom: 22px;
  z-index: 2000;
}

.floating-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  width: 66px;
  height: 66px;

  color: #ffffff;
  background: var(--color-primary);
  border: 3px solid #ffffff;
  border-radius: 50%;

  box-shadow: var(--shadow-floating);
  cursor: pointer;

  transition:
    transform 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease;
}

.floating-button:hover {
  background: var(--color-primary-dark);
  transform: translateY(-3px);
  box-shadow: 0 18px 42px rgb(45 90 39 / 30%);
}

.floating-button:focus-visible {
  outline: 3px solid rgb(45 90 39 / 24%);
  outline-offset: 3px;
}

.chat-icon {
  font-size: 22px;
  line-height: 1;
}

.button-label {
  margin-top: 3px;
  font-size: 10px;
  font-weight: 800;
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