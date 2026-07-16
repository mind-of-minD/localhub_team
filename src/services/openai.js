const API_KEY = import.meta.env.VITE_OPENAI_API_KEY

export async function askGPT(message) {
  const res = await fetch(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "user",
            content: message,
          },
        ],
      }),
    }
  )

  const data = await res.json()
  return data.choices[0].message.content
}