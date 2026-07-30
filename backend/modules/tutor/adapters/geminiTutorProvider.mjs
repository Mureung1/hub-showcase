export async function runTutorAgent({
  question,
  code,
  fileName,
  missionTitle,
  missionDetail,
  history,
  knowledgeContext = [],
  config,
  fetchImpl = globalThis.fetch,
}) {
  if (config.provider !== 'developer') {
    throw new Error(`Unsupported tutor agent provider: ${config.provider}. Supported provider: developer`)
  }

  if (!config.apiKey) {
    throw new Error('GEMINI_API_KEY is missing. Put it in .env or src/.env for local CLI runs.')
  }

  if (typeof fetchImpl !== 'function') {
    throw new Error('A fetch implementation is required to call the Gemini API.')
  }

  return callDeveloperGemini({
    apiKey: config.apiKey,
    model: config.model,
    question,
    code,
    fileName,
    missionTitle,
    missionDetail,
    history,
    knowledgeContext,
    fetchImpl,
  })
}

export function createSystemInstruction() {
  return [
    'You are ICU Workspace Tutor.',
    'Explain the given code or answer the learner question about it, in Korean, concisely (roughly 3-6 sentences).',
    'Use currentFile and missionContext to ground your explanation in what the learner is actually looking at.',
    'Use knowledgeContext only as official-doc grounding when relevant. If it is empty or unrelated to the question, answer from general knowledge instead.',
    'Use conversationHistory to keep continuity with earlier turns; do not repeat earlier explanations verbatim.',
    'Answer in plain text only. Do not wrap the answer in JSON, and only use markdown code fences when quoting a short code snippet.',
  ].join('\n')
}

export function createPrompt({ question, code, fileName, missionTitle, missionDetail, history, knowledgeContext = [] }) {
  return JSON.stringify({
    learnerQuestion: question,
    currentFile: { fileName, code },
    missionContext: { title: missionTitle, detail: missionDetail },
    conversationHistory: history,
    knowledgeContext: createKnowledgeContext(knowledgeContext),
  })
}

export function createKnowledgeContext(chunks) {
  return chunks.slice(0, 3).map((chunk) => ({
    topic: chunk.topic,
    docTitle: chunk.docTitle,
    sectionHeading: chunk.sectionHeading,
    url: chunk.url,
    chunkText: String(chunk.chunkText ?? '').slice(0, 500),
  }))
}

async function callDeveloperGemini({ apiKey, model, question, code, fileName, missionTitle, missionDetail, history, knowledgeContext, fetchImpl }) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`
  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: createSystemInstruction() }] },
      contents: [
        {
          role: 'user',
          parts: [{ text: createPrompt({ question, code, fileName, missionTitle, missionDetail, history, knowledgeContext }) }],
        },
      ],
      generationConfig: { temperature: 0.3 },
    }),
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`Gemini API request failed (${response.status}): ${text}`)

  const body = JSON.parse(text)
  const answer = extractOutputText(body)
  if (!answer) throw new Error('Gemini API response did not include output text')

  return answer.trim()
}

function extractOutputText(body) {
  const blocks = []

  for (const candidate of body.candidates ?? []) {
    for (const part of candidate.content?.parts ?? []) {
      if (typeof part.text === 'string') blocks.push(part.text)
    }
  }

  return blocks.join('\n').trim()
}
