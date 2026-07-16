const OPENAI_API_URL =
  'https://api.openai.com/v1/chat/completions'

const DEFAULT_MODEL = 'gpt-5-mini'
const REQUEST_TIMEOUT_MS = 60000

function maskApiKey(apiKey) {
  if (!apiKey) {
    return '없음'
  }

  if (apiKey.length < 12) {
    return '형식 이상'
  }

  return `${apiKey.slice(0, 7)}...${apiKey.slice(-4)}`
}

function createChatError(message, details = {}) {
  const error = new Error(message)

  error.name = 'ChatApiError'
  error.stage = details.stage
  error.status = details.status
  error.code = details.code
  error.type = details.type
  error.requestId = details.requestId
  error.durationMs = details.durationMs
  error.responseBody = details.responseBody

  return error
}

function classifyHttpError(status, apiError) {
  const apiMessage =
    apiError?.message || 'OpenAI API 요청에 실패했습니다.'

  switch (status) {
    case 400:
      return `요청 형식 오류입니다. 프롬프트나 API 파라미터를 확인하세요. ${apiMessage}`

    case 401:
      return `API 키 인증에 실패했습니다. 키가 잘못됐거나 폐기됐을 수 있습니다. ${apiMessage}`

    case 403:
      return `현재 API 키 또는 프로젝트에 요청 권한이 없습니다. ${apiMessage}`

    case 404:
      return `요청한 모델이나 API 주소를 찾지 못했습니다. 모델명을 확인하세요. ${apiMessage}`

    case 429:
      return `요청 한도 또는 결제 한도를 초과했습니다. OpenAI 프로젝트의 사용량과 결제 상태를 확인하세요. ${apiMessage}`

    case 500:
    case 502:
    case 503:
      return `OpenAI 서버에서 일시적인 오류가 발생했습니다. ${apiMessage}`

    default:
      return `OpenAI API 오류 (${status})입니다. ${apiMessage}`
  }
}

export async function askGPT(messages) {
  const startedAt = performance.now()

  console.groupCollapsed(
    '%c[CHAT DEBUG] OpenAI 요청 시작',
    'color: #2d5a27; font-weight: bold;',
  )

  try {
    /*
     * 1. 프롬프트 검증
     */
    if (!Array.isArray(messages)) {
      throw createChatError(
        'messages가 배열이 아닙니다.',
        {
          stage: 'validate_messages',
        },
      )
    }

    if (messages.length === 0) {
      throw createChatError(
        '전송할 대화 내용이 없습니다.',
        {
          stage: 'validate_messages',
        },
      )
    }

    const invalidMessage = messages.find(message => {
      return (
        !message ||
        !['system', 'user', 'assistant'].includes(
          message.role,
        ) ||
        typeof message.content !== 'string' ||
        !message.content.trim()
      )
    })

    if (invalidMessage) {
      console.error(
        '[CHAT DEBUG] 잘못된 메시지:',
        invalidMessage,
      )

      throw createChatError(
        'OpenAI에 전달할 메시지 형식이 올바르지 않습니다.',
        {
          stage: 'validate_messages',
        },
      )
    }

    /*
     * 2. 환경변수 검증
     */
    const apiKey =
      import.meta.env.VITE_OPENAI_API_KEY?.trim()

    const model =
      import.meta.env.VITE_OPENAI_MODEL?.trim() ||
      DEFAULT_MODEL

    console.table({
      model,
      apiKeyExists: Boolean(apiKey),
      maskedApiKey: maskApiKey(apiKey),
      mockMode: import.meta.env.VITE_USE_MOCK_API,
      messageCount: messages.length,
    })

    if (!apiKey) {
      throw createChatError(
        '.env에 VITE_OPENAI_API_KEY가 설정되지 않았습니다.',
        {
          stage: 'validate_api_key',
        },
      )
    }

    /*
     * 키 전체를 출력하면 안 됩니다.
     * 형태만 대략 확인합니다.
     */
    if (
      !apiKey.startsWith('sk-') &&
      !apiKey.startsWith('sk-proj-')
    ) {
      console.warn(
        '[CHAT DEBUG] API 키가 일반적인 OpenAI 키 형식과 다릅니다.',
      )
    }

    /*
     * 3. 요청 크기 확인
     */
    const totalCharacters = messages.reduce(
      (sum, message) => sum + message.content.length,
      0,
    )

    const payload = {
      model,
      messages,
      max_completion_tokens: 700,
    }

    const payloadText = JSON.stringify(payload)
    const payloadBytes = new Blob([payloadText]).size

    console.table({
      totalCharacters,
      payloadBytes,
      approximateKilobytes:
        Math.round((payloadBytes / 1024) * 100) / 100,
    })

    console.log(
      '[CHAT DEBUG] 전달 메시지 요약:',
      messages.map((message, index) => ({
        index,
        role: message.role,
        length: message.content.length,
        preview: message.content.slice(0, 150),
      })),
    )

    /*
     * 4. 시간 제한 설정
     */
    const controller = new AbortController()

    const timeoutId = setTimeout(() => {
      controller.abort()
    }, REQUEST_TIMEOUT_MS)

    let response

    try {
      response = await fetch(OPENAI_API_URL, {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },

        body: payloadText,
        signal: controller.signal,
      })
    } catch (error) {
      const durationMs = Math.round(
        performance.now() - startedAt,
      )

      if (error.name === 'AbortError') {
        throw createChatError(
          `OpenAI 응답이 ${REQUEST_TIMEOUT_MS / 1000}초 안에 오지 않아 요청을 중단했습니다.`,
          {
            stage: 'request_timeout',
            durationMs,
          },
        )
      }

      throw createChatError(
        `OpenAI 서버에 연결하지 못했습니다. ${error.message}`,
        {
          stage: 'network_request',
          durationMs,
        },
      )
    } finally {
      clearTimeout(timeoutId)
    }

    /*
     * 5. HTTP 응답 확인
     */
    const durationMs = Math.round(
      performance.now() - startedAt,
    )

    const requestId =
      response.headers.get('x-request-id')

    console.table({
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      durationMs,
      requestId: requestId || '없음',
      contentType:
        response.headers.get('content-type') || '없음',
    })

    /*
     * 먼저 text로 읽은 뒤 JSON 변환을 시도해야
     * JSON이 아닌 오류 응답도 확인할 수 있습니다.
     */
    const rawResponse = await response.text()

    let result

    try {
      result = rawResponse
        ? JSON.parse(rawResponse)
        : {}
    } catch {
      result = {
        raw: rawResponse,
      }
    }

    if (!response.ok) {
      const apiError = result?.error || result

      console.error(
        '[CHAT DEBUG] OpenAI 오류 응답 전체:',
        result,
      )

      throw createChatError(
        classifyHttpError(
          response.status,
          apiError,
        ),
        {
          stage: 'openai_response',
          status: response.status,
          code: apiError?.code,
          type: apiError?.type,
          requestId,
          durationMs,
          responseBody: result,
        },
      )
    }

    /*
     * 6. 정상 응답 구조 확인
     */
    const answer =
      result?.choices?.[0]?.message?.content

    console.log(
      '[CHAT DEBUG] choices 개수:',
      result?.choices?.length ?? 0,
    )

    console.log(
      '[CHAT DEBUG] 사용량:',
      result?.usage || '사용량 정보 없음',
    )

    if (
      typeof answer !== 'string' ||
      !answer.trim()
    ) {
      console.error(
        '[CHAT DEBUG] 예상하지 못한 정상 응답 구조:',
        result,
      )

      throw createChatError(
        'OpenAI 요청은 성공했지만 답변 문자열이 없습니다.',
        {
          stage: 'parse_answer',
          status: response.status,
          requestId,
          durationMs,
          responseBody: result,
        },
      )
    }

    console.log(
      `[CHAT DEBUG] 응답 성공: ${durationMs}ms`,
    )

    return answer.trim()
  } finally {
    console.groupEnd()
  }
}