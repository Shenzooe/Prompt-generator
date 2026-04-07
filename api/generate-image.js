module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { prompt, negative_prompt, model = "black-forest-labs/FLUX.1-schnell" } = req.body || {};

  if (!prompt) {
    return res.status(400).json({ error: "Missing prompt" });
  }

  const token = process.env.HF_TOKEN;
  if (!token) {
    return res.status(500).json({ error: "HF_TOKEN not configured" });
  }

  try {
    const hfRes = await fetch(
      `https://router.huggingface.co/hf-inference/models/${model}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: prompt,
          ...(negative_prompt && { parameters: { negative_prompt } }),
        }),
      }
    );

    if (!hfRes.ok) {
      const text = await hfRes.text();
      return res.status(hfRes.status).json({ error: text });
    }

    const buffer = await hfRes.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    return res.status(200).json({ image: "data:image/png;base64," + base64 });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
