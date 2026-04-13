module.exports = async function handler(req, res) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=100`
  );
  const data = await response.json();

  // 只回傳支援 generateContent 的模型（即可生成內容的模型）
  const models = (data.models || [])
    .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
    .map((m) => ({
      id: m.name.replace("models/", ""),
      displayName: m.displayName,
      methods: m.supportedGenerationMethods,
    }));

  return res.status(200).json({ models, total: models.length });
};
