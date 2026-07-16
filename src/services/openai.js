const OPENAI_API_URL =
  'https://api.openai.com/v1/chat/completions'

const MODEL_NAME =
  import.meta.env.VITE_OPENAI_MODEL || 'gpt-5-mini'

export async function askGPT(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('전송할 대화 내용이 없습니다.')
  }

  const apiKey = import.meta.env.VITE_OPENAI_API_KEY

  if (!apiKey) {
    throw new Error(
      '.env에 VITE_OPENAI_API_KEY가 설정되지 않았습니다.',
    )
  }

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',

    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },

    body: JSON.stringify({
      model: MODEL_NAME,
      messages,
      max_completion_tokens: 700,
    }),
  })

  const contentType =
    response.headers.get('content-type') || ''

  const result = contentType.includes('application/json')
    ? await response.json()
    : {
        error: {
          message: await response.text(),
        },
      }

  if (!response.ok) {
    throw new Error(
      result?.error?.message ||
        result?.message ||
        `OpenAI API 요청에 실패했습니다. (${response.status})`,
    )
  }

  const answer =
    result?.choices?.[0]?.message?.content

  if (
    typeof answer !== 'string' ||
    !answer.trim()
  ) {
    throw new Error('챗봇 응답 내용이 없습니다.')
  }

  return answer.trim()
}