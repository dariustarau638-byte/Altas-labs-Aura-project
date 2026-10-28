/**
 * Unified streaming client (including Vision / Multimodal for screenshots)
 * for Cloud AI providers:
 * - OpenAI (ChatGPT: gpt-4o-mini, gpt-4o, o3-mini)
 * - Anthropic (Claude: claude-sonnet-4-20250514, claude-3-5-haiku-latest)
 * - Google Gemini (gemini-4-argon, gemini-3.8-pro, gemini-3.8-flash)
 */

async function* parseSseDataLines(body) {
  const decoder = new TextDecoder();
  let buffer = '';
  for await (const chunk of body) {
    buffer += decoder.decode(chunk, { stream: true });
    let idx;
    while ((idx = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (line.startsWith('data:')) {
        const payload = line.slice(5).trim();
        if (payload && payload !== '[DONE]') yield payload;
      }
    }
  }
}

function splitDataUrl(dataUrl) {
  const match = String(dataUrl || '').match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], base64: match[2] };
}

/** 1. OpenAI (ChatGPT) Streaming + Vision */
export async function* streamOpenAi({
  apiKey,
  model = 'gpt-4o-mini',
  messages,
  temperature = 0.7,
  signal,
}) {
  if (!apiKey?.trim()) {
    throw new Error('OpenAI API key is missing. Add it in Control Center → Connectors & Cloud.');
  }

  const formattedMessages = messages.map((m) => {
    if (m.role === 'user' && m.imageDataUrl) {
      return {
        role: 'user',
        content: [
          { type: 'text', text: m.content || 'Analyze this screen capture.' },
          { type: 'image_url', image_url: { url: m.imageDataUrl } },
        ],
      };
    }
    return { role: m.role, content: m.content };
  });

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify({
      model,
      messages: formattedMessages,
      temperature,
      stream: true,
    }),
    signal,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`OpenAI (${res.status}): ${errText || res.statusText}`);
  }

  for await (const dataStr of parseSseDataLines(res.body)) {
    try {
      const parsed = JSON.parse(dataStr);
      const delta = parsed.choices?.[0]?.delta?.content;
      if (delta) yield delta;
    } catch {}
  }
}

/** 2. Anthropic (Claude) Streaming + Vision */
export async function* streamAnthropic({
  apiKey,
  model = 'claude-sonnet-4-20250514',
  messages,
  temperature = 0.7,
  signal,
}) {
  if (!apiKey?.trim()) {
    throw new Error(
      'Anthropic (Claude) API key is missing. Add it in Control Center → Connectors & Cloud.',
    );
  }

  const systemMsg = messages.find((m) => m.role === 'system')?.content || '';
  const chatMessages = messages
    .filter((m) => m.role !== 'system')
    .map((m) => {
      if (m.role === 'user' && m.imageDataUrl) {
        const img = splitDataUrl(m.imageDataUrl);
        if (img) {
          return {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: img.mimeType,
                  data: img.base64,
                },
              },
              { type: 'text', text: m.content || 'Analyze this screen capture.' },
            ],
          };
        }
      }
      return { role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content };
    });

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey.trim(),
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      temperature: Math.min(1, temperature),
      ...(systemMsg ? { system: systemMsg } : {}),
      messages: chatMessages,
      stream: true,
    }),
    signal,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Claude API (${res.status}): ${errText || res.statusText}`);
  }

  for await (const dataStr of parseSseDataLines(res.body)) {
    try {
      const parsed = JSON.parse(dataStr);
      if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
        yield parsed.delta.text;
      } else if (parsed.type === 'error') {
        throw new Error(parsed.error?.message || 'Claude stream error');
      }
    } catch (e) {
      if (e.message?.includes('Claude')) throw e;
    }
  }
}

/** 3. Google Gemini Streaming (SSE) + Vision */
export async function* streamGemini({
  apiKey,
  model = 'gemini-4-argon',
  messages,
  temperature = 0.7,
  signal,
}) {
  if (!apiKey?.trim()) {
    throw new Error(
      'Google Gemini API key is missing. Add it in Control Center → Connectors & Cloud.',
    );
  }

  const systemMsg = messages.find((m) => m.role === 'system')?.content || '';
  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => {
      const parts = [{ text: m.content || 'Analyze this image.' }];
      if (m.role === 'user' && m.imageDataUrl) {
        const img = splitDataUrl(m.imageDataUrl);
        if (img) {
          parts.push({
            inlineData: {
              mimeType: img.mimeType,
              data: img.base64,
            },
          });
        }
      }
      return {
        role: m.role === 'assistant' ? 'model' : 'user',
        parts,
      };
    });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model,
  )}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey.trim())}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...(systemMsg ? { systemInstruction: { parts: [{ text: systemMsg }] } } : {}),
      contents,
      generationConfig: { temperature },
    }),
    signal,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Gemini API (${res.status}): ${errText || res.statusText}`);
  }

  for await (const dataStr of parseSseDataLines(res.body)) {
    try {
      const parsed = JSON.parse(dataStr);
      const parts = parsed.candidates?.[0]?.content?.parts ?? [];
      for (const p of parts) {
        if (p.text) yield p.text;
      }
    } catch {}
  }
}

/** Tests if a cloud provider key is valid by sending a minimal ping. */
export async function testCloudProvider(providerId, aiSettings) {
  const testMessages = [
    { role: 'system', content: 'Reply with a single short greeting.' },
    { role: 'user', content: 'Hello!' },
  ];

  const signal = AbortSignal.timeout(10000);
  let gen;
  let usedModel = '';
  if (providerId === 'openai') {
    usedModel = aiSettings.openaiModel || 'gpt-4o-mini';
    gen = streamOpenAi({
      apiKey: aiSettings.openaiKey,
      model: usedModel,
      messages: testMessages,
      signal,
    });
  } else if (providerId === 'anthropic') {
    usedModel = aiSettings.anthropicModel || 'claude-sonnet-4-20250514';
    gen = streamAnthropic({
      apiKey: aiSettings.anthropicKey,
      model: usedModel,
      messages: testMessages,
      signal,
    });
  } else if (providerId === 'gemini') {
    usedModel = aiSettings.geminiModel || 'gemini-4-argon';
    gen = streamGemini({
      apiKey: aiSettings.geminiKey,
      model: usedModel,
      messages: testMessages,
      signal,
    });
  } else {
    throw new Error(`Unknown provider: ${providerId}`);
  }

  let sample = '';
  for await (const chunk of gen) {
    sample += chunk;
    if (sample.length > 40) break;
  }
  return { ok: true, model: usedModel, sample: sample.trim() || 'Connection successful!' };
}
