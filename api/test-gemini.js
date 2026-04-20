module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
  }

  const { test, prompt = "Hello, reply in one sentence.", model = "gemini-2.5-flash" } = req.body || {};

  const BASE = "https://generativelanguage.googleapis.com/v1beta";

  try {
    // 1. 文字生成
    if (test === "text") {
      const r = await fetch(`${BASE}/models/${model}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      });
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json({ error: data });
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "(no text)";
      return res.status(200).json({ ok: true, text, raw: data });
    }

    // 2. Token 計數
    if (test === "count-tokens") {
      const r = await fetch(`${BASE}/models/${model}:countTokens?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      });
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json({ error: data });
      return res.status(200).json({ ok: true, totalTokens: data.totalTokens, raw: data });
    }

    // 3. Embedding
    if (test === "embed") {
      const embedModel = "gemini-embedding-001";
      const r = await fetch(
        `${BASE}/models/${embedModel}:embedContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: `models/${embedModel}`,
            content: { parts: [{ text: prompt }] },
          }),
        }
      );
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json({ error: data });
      const values = data.embedding?.values ?? [];
      return res.status(200).json({
        ok: true,
        dimensions: values.length,
        preview: values.slice(0, 8),
        raw: data,
      });
    }

    // 4. 列出可用模型
    if (test === "list-models") {
      const r = await fetch(`${BASE}/models?key=${apiKey}&pageSize=100`);
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json({ error: data });
      const models = (data.models || []).map((m) => ({
        id: m.name.replace("models/", ""),
        displayName: m.displayName,
        methods: m.supportedGenerationMethods,
      }));
      return res.status(200).json({ ok: true, total: models.length, models });
    }

    return res.status(400).json({ error: "Unknown test. Use: text | count-tokens | embed | list-models" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
