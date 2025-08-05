const { GoogleGenerativeAI } = require('@google/generative-ai');

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
        // Initialize Google Gemini client
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Create a detailed prompt for cannabis bud image generation
        const prompt = `Studio photograph of a single cannabis bud still on its stem. Based on these physical characteristics: ${physicalCharacteristics}. The bud is set against a COMPLETELY BLACK, non-reflective background. The focus is sharp on the trichomes and pistils. The lighting should ensure the edges of the bud are crisp and clear, with absolutely no white border, halo, or outline. Professional cannabis photography style, high detail, realistic textures.`;

        // Generate content (text response for now since image generation requires special model)
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // For now, return a placeholder response since Gemini image generation 
        // requires specific model access that may not be available
        return res.status(200).json({ 
            success: true,
            message: "Image generation feature is being set up. Generated description:",
            description: text,
            image: null // Will be implemented when image model is available
        });

    } catch (error) {
        console.error('Error generating image:', error);
        return res.status(500).json({ 
            error: 'Failed to generate image',
            details: error.message 
        });
    }
}