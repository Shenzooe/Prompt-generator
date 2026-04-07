exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  const { prompt, negative_prompt, model = "black-forest-labs/FLUX.1-schnell" } = body;
  if (!prompt) {
    return { statusCode: 400, body: "Missing prompt" };
  }

  const token = process.env.HF_TOKEN;
  if (!token) {
    return { statusCode: 500, body: "HF_TOKEN not configured" };
  }

  const res = await fetch(
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

  if (!res.ok) {
    const text = await res.text();
    return {
      statusCode: res.status,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: text }),
    };
  }

  const buffer = await res.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: "data:image/png;base64," + base64 }),
  };
};
