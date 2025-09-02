// /api/generateCannabisImage.js (Next.js API route or similar)
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { strainName = '', hybridization = '', physicalCharacteristics } = req.body || {};
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
    // Build prompt with new ultra-macro style
    const prompt = `Ultra-macro photograph of a ${strainName} ${hybridization} cannabis bud, taken with a 100mm lens at f/8. The bud is asymmetrical with irregular shape and imperfect hand trim. ${physicalCharacteristics}. Some visible trimming flaws. Texture is uneven, slightly rough. Background is plain white, standard for ecommerce. Avoid excessive symmetry, over-sharpening, and unnatural density of pistils or trichomes. 1:1 (square ratio).

### Rules:
- **NO** large orange pistils
- **NO** smooth looking surfaces anywhere, the outer textures must be rough from leaves 
- **NO** symmetry, the shape must always be distinctly different on the left and right side
- **NO** visible stem on the bottom (especially NO long stem)`;

    // Lazy-import to avoid ESM/CJS hassles
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });

    // Call Gemini 2.5 Flash Image Preview
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
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