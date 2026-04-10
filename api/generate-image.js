module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { prompt, model = "imagen-3.0-generate-002" } = req.body || {};

  if (!prompt) {
    return res.status(400).json({ error: "Missing prompt" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
  }

  try {
    if (model === "imagen-3.0-generate-002") {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instances: [{ prompt }],
            parameters: { sampleCount: 1 },
          }),
        }
      );

      if (!geminiRes.ok) {
        const text = await geminiRes.text();
        return res.status(geminiRes.status).json({ error: text });
      }

      const data = await geminiRes.json();
      const b64 = data.predictions?.[0]?.bytesBase64Encoded;
      if (!b64) return res.status(500).json({ error: "No image returned" });
      return res.status(200).json({ image: "data:image/jpeg;base64," + b64 });

    } else {
      // gemini-2.0-flash-exp-image-generation
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
          }),
        }
      );

      if (!geminiRes.ok) {
        const text = await geminiRes.text();
        return res.status(geminiRes.status).json({ error: text });
      }

      const data = await geminiRes.json();
      const parts = data.candidates?.[0]?.content?.parts || [];
      const imagePart = parts.find((p) => p.inlineData);
      if (!imagePart) return res.status(500).json({ error: "No image returned" });
      const { mimeType, data: b64 } = imagePart.inlineData;
      return res.status(200).json({ image: `data:${mimeType};base64,${b64}` });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
