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
  console.groupCollapsed(
    '[CHAT DEBUG] 지역 데이터 로딩',
  )

  try {
    const loadedFiles = await Promise.all(
      DATA_FILES.map(async file => {
        const encodedFileName =
          encodeURIComponent(file.path)

        const url =
          `/data/seoul/${encodedFileName}`

        const startedAt = performance.now()

        console.log(
          `[CHAT DEBUG] 파일 요청: ${url}`,
        )

        const response = await fetch(url)

        if (!response.ok) {
          throw new Error(
            `${file.path} 로드 실패 (${response.status})`,
          )
        }

        const json = await response.json()
        const items = extractItems(json)

        console.table({
          file: file.path,
          category: file.category,
          itemCount: items.length,
          durationMs: Math.round(
            performance.now() - startedAt,
          ),
        })

        if (items.length === 0) {
          console.warn(
            `[CHAT DEBUG] ${file.path}에서 배열 데이터를 찾지 못했습니다.`,
            json,
          )
        }

        return items.map(item => ({
          ...item,
          _category: file.category,
        }))
      }),
    )

    localData.value = loadedFiles.flat()
    dataLoaded.value = true

    console.log(
      `[CHAT DEBUG] 전체 데이터 ${localData.value.length}건 로드 완료`,
    )
  } catch (error) {
    console.error(
      '[CHAT DEBUG] 데이터 로딩 실패:',
      error,
    )

    dataLoaded.value = false

    addMessage(
      'system',
      `지역 데이터를 불러오지 못했습니다. ${error.message}`,
    )
  } finally {
    console.groupEnd()
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

  console.groupCollapsed(
    `%c[CHAT DEBUG] 질문 처리: ${question}`,
    'color: #8b5a2b; font-weight: bold;',
  )

  const totalStartedAt = performance.now()

  try {
    /*
     * 1. 지역 데이터 상태
     */
    console.table({
      dataLoaded: dataLoaded.value,
      totalLocalData: localData.value.length,
      mockMode:
        import.meta.env.VITE_USE_MOCK_API,
      model:
        import.meta.env.VITE_OPENAI_MODEL ||
        'gpt-5-mini',
    })

    if (!dataLoaded.value) {
      throw new Error(
        '지역 데이터가 아직 준비되지 않았습니다.',
      )
    }

    if (localData.value.length === 0) {
      throw new Error(
        '데이터 로딩 상태는 완료됐지만 localData가 비어 있습니다.',
      )
    }

    addMessage('user', question)

    userInput.value = ''
    loading.value = true

    /*
     * 2. 검색 결과 확인
     */
    const searchStartedAt = performance.now()
    const documents = rankDocuments(question)
    const searchDurationMs = Math.round(
      performance.now() - searchStartedAt,
    )

    console.table({
      query: question,
      matchedDocumentCount: documents.length,
      searchDurationMs,
    })

    console.log(
      '[CHAT DEBUG] 검색된 문서:',
      documents.map((document, index) => ({
        index,
        title:
          document.title ||
          document.name ||
          '제목 없음',
        category: document._category,
        address: [
          document.addr1,
          document.addr2,
        ]
          .filter(Boolean)
          .join(' '),
      })),
    )

    /*
     * 3. 프롬프트 확인
     */
    const apiMessages = createApiMessages(
      question,
      documents,
    )

    const promptCharacters = apiMessages.reduce(
      (sum, message) =>
        sum + message.content.length,
      0,
    )

    console.table({
      apiMessageCount: apiMessages.length,
      promptCharacters,
    })

    console.log(
      '[CHAT DEBUG] API 메시지:',
      apiMessages.map((message, index) => ({
        index,
        role: message.role,
        length: message.content.length,
        preview: message.content.slice(0, 300),
      })),
    )

    /*
     * 개발 중에 전체 프롬프트가 필요하면 펼쳐서 확인
     */
    console.debug(
      '[CHAT DEBUG] 전체 API payload:',
      structuredClone(apiMessages),
    )

    /*
     * 4. API 호출
     */
    const apiStartedAt = performance.now()

    const answer = await callOpenAI(
      apiMessages,
      question,
    )

    const apiDurationMs = Math.round(
      performance.now() - apiStartedAt,
    )

    console.table({
      apiDurationMs,
      answerLength: answer.length,
      totalDurationMs: Math.round(
        performance.now() - totalStartedAt,
      ),
    })

    addMessage('assistant', answer)
  } catch (error) {
    const debugInfo = {
      name: error.name,
      message: error.message,
      stage: error.stage || 'chatbot_flow',
      status: error.status,
      code: error.code,
      type: error.type,
      requestId: error.requestId,
      durationMs: error.durationMs,
      responseBody: error.responseBody,
      stack: error.stack,
    }

    console.error(
      '[CHAT DEBUG] 최종 오류 정보:',
      debugInfo,
    )

    const errorDetails = [
      `단계: ${debugInfo.stage}`,
      debugInfo.status
        ? `HTTP 상태: ${debugInfo.status}`
        : '',
      debugInfo.code
        ? `오류 코드: ${debugInfo.code}`
        : '',
      debugInfo.requestId
        ? `요청 ID: ${debugInfo.requestId}`
        : '',
      debugInfo.durationMs
        ? `소요 시간: ${debugInfo.durationMs}ms`
        : '',
    ]
      .filter(Boolean)
      .join(' / ')

    addMessage(
      'system',
      [
        `챗봇 오류: ${error.message}`,
        errorDetails,
      ]
        .filter(Boolean)
        .join('\n'),
    )
  } finally {
    loading.value = false
    console.groupEnd()
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