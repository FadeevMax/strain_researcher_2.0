import { genai } from '@google/generative-ai';

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

    try {
        // Initialize Google Gemini client
        const client = new genai.Client({
            apiKey: process.env.GOOGLE_API_KEY
        });

        // Create a detailed prompt for cannabis bud image generation
        const prompt = `Studio photograph of a single cannabis bud still on its stem. Based on these physical characteristics: ${physicalCharacteristics}. The bud is set against a COMPLETELY BLACK, non-reflective background. The focus is sharp on the trichomes and pistils. The lighting should ensure the edges of the bud are crisp and clear, with absolutely no white border, halo, or outline. Professional cannabis photography style, high detail, realistic textures.`;

        // Generate the image using Gemini
        const response = await client.models.generateContent({
            model: "gemini-2.0-flash-preview-image-generation",
            contents: prompt,
            config: {
                responseModalities: ['IMAGE']
            }
        });

        // Extract the image data
        let imageData = null;
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.data) {
                imageData = part.inlineData.data;
                break;
            }
        }

        if (!imageData) {
            throw new Error('No image generated from Gemini API');
        }

        // Return base64 encoded image
        return res.status(200).json({ 
            image: imageData,
            success: true 
        });

    } catch (error) {
        console.error('Error generating image:', error);
        return res.status(500).json({ 
            error: 'Failed to generate image',
            details: error.message 
        });
    }
}