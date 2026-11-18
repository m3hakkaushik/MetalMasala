// [L43] Integrating AI Services: Google Gemini Provider Adapter

export const geminiAdapter = {
  name: 'gemini',

  async generate({ system, messages, apiKey, model = 'gemini-1.5-flash', timeoutMs = 10000 }) {
    if (!apiKey) {
      throw new Error('Gemini API key is missing');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const contents = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: system ? { parts: [{ text: system }] } : undefined,
          contents,
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 600,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return { text };
    } finally {
      clearTimeout(timer);
    }
  },
};

export default geminiAdapter;
