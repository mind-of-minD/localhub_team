import OpenAI from 'openai'

const ALLOWED_ROLES = new Set([
  'system',
  'user',
  'assistant',
])

function createJsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(body),
  }
}

function validateMessages(messages) {
  if (!Array.isArray(messages)) {
    return false
  }

  if (messages.length === 0 || messages.length > 20) {
    return false
  }

  return messages.every(message => {
    return (
      message &&
      ALLOWED_ROLES.has(message.role) &&
      typeof message.content === 'string' &&
      message.content.trim().length > 0 &&
      message.content.length <= 10000
    )
  })
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return createJsonResponse(405, {
      error: 'POST 요청만 허용됩니다.',
    })
  }

  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    return createJsonResponse(500, {
      error:
        'Netlify 환경변수 OPENAI_API_KEY가 설정되지 않았습니다.',
    })
  }

  let body

  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return createJsonResponse(400, {
      error: '요청 본문이 올바른 JSON 형식이 아닙니다.',
    })
  }

  const messages = body.messages

  if (!validateMessages(messages)) {
    return createJsonResponse(400, {
      error: '대화 메시지 형식이 올바르지 않습니다.',
    })
  }

  try {
    const client = new OpenAI({
      apiKey,
    })

    const response = await client.responses.create({
      model:
        process.env.OPENAI_MODEL || 'gpt-5-mini',

      input: messages.map(message => ({
        role: message.role,
        content: [
          {
            type: 'input_text',
            text: message.content,
          },
        ],
      })),

      max_output_tokens: 700,
    })

    const answer = response.output_text?.trim()

    if (!answer) {
      return createJsonResponse(502, {
        error: 'AI가 빈 응답을 반환했습니다.',
      })
    }

    return createJsonResponse(200, {
      answer,
    })
  } catch (error) {
    console.error('OpenAI API error:', error)

    return createJsonResponse(502, {
      error: 'AI 답변을 생성하지 못했습니다.',
    })
  }
}