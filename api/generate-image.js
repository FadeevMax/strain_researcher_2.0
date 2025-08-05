const { genai } = require('@google/generative-ai');

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { physicalCharacteristics } = req.body;

    if (!physicalCharacteristics) {
        return res.status(400).json({ error: 'Physical characteristics are required' });
    }

    if (!process.env.GOOGLE_API_KEY) {
        return res.status(500).json({ error: 'Google API key not configured' });
    }

    try {
        // Initialize Google Gemini client (exactly like your Python code)
        const client = new genai.Client({ apiKey: process.env.GOOGLE_API_KEY });

        // Create prompt based on physical characteristics
        const prompt = `Studio photograph of a single cannabis bud still on its stem. Based on these physical characteristics: ${physicalCharacteristics}. The bud is set against a COMPLETELY BLACK, non-reflective background. The focus is sharp on the trichomes and pistils. The lighting should ensure the edges of the bud are crisp and clear, with absolutely no white border, halo, or outline. There shouldn't be ANY white color on the image.`;

        // Generate content using Gemini 2.0 Flash image generation (exactly like your Python code)
        const response = await client.models.generateContent({
            model: "gemini-2.0-flash-preview-image-generation",
            contents: prompt,
            config: {
                responseModalities: ['TEXT', 'IMAGE']
            }
        });

        // Extract image data (like your Python code)
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.data) {
                // Return the base64 image data
                return res.status(200).json({ 
                    success: true,
                    image: part.inlineData.data
                });
            }
        }

        throw new Error('No image generated from Gemini API');

    } catch (error) {
        console.error('Error generating image:', error);
        return res.status(500).json({ 
            error: 'Failed to generate image',
            details: error.message,
            success: false
        });
    }
}