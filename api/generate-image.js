// /api/generateCannabisImage.js (Next.js API route or similar)
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { physicalCharacteristics } = req.body || {};
  if (!physicalCharacteristics) {
    return res.status(400).json({ error: 'Physical characteristics are required' });
  }

  // API key
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'API key not configured',
      details: 'Set GEMINI_API_KEY (or GOOGLE_API_KEY) in your environment'
    });
  }

  try {
    // Build prompt (kept from your original requirements)
    const prompt = `Studio photograph of a single cannabis bud still on its stem.
Based on these physical characteristics: ${physicalCharacteristics}.
The bud is set against a COMPLETELY BLACK, non-reflective background.
Focus is tack-sharp on trichomes and pistils. Edges of the bud are crisp and clear,
with absolutely no white border, halo, or outline. There shouldn't be ANY white color in the image.`;

    // Lazy-import to avoid ESM/CJS hassles
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });

    // Call Gemini 2.5 Flash Image Preview
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: prompt
      // You can add generationConfig here if needed
    });

    // Extract the first image (inline base64 data)
    const parts = response?.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find(p => p.inlineData);
    if (imagePart?.inlineData?.data) {
      return res.status(200).json({
        success: true,
        image: imagePart.inlineData.data,            // base64 (no data: prefix)
        mime: imagePart.inlineData.mimeType || 'image/png'
      });
    }

    // If the model returned only text (e.g., guidance), surface it
    const textPart = parts.find(p => p.text)?.text;
    return res.status(500).json({
      error: 'Unexpected response format',
      details: textPart || 'No image data returned',
      success: false
    });
  } catch (err) {
    console.error('Gemini image error:', err);
    return res.status(500).json({
      error: 'Failed to generate image',
      details: err?.message || String(err),
      success: false
    });
  }
}