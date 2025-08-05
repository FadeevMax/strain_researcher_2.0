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
        // Create prompt based on physical characteristics
        const prompt = `Studio photograph of a single cannabis bud still on its stem. Based on these physical characteristics: ${physicalCharacteristics}. The bud is set against a COMPLETELY BLACK, non-reflective background. The focus is sharp on the trichomes and pistils. The lighting should ensure the edges of the bud are crisp and clear, with absolutely no white border, halo, or outline. There shouldn't be ANY white color on the image.`;

        // Use direct REST API call to Google Gemini (since Node.js client may not support image generation yet)
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${process.env.GOOGLE_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    responseModalities: ['TEXT', 'IMAGE']
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Google API error:', errorText);
            throw new Error(`Google API error: ${response.status}`);
        }

        const data = await response.json();
        
        // Extract image data from response
        if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
            for (const part of data.candidates[0].content.parts) {
                if (part.inlineData && part.inlineData.data) {
                    return res.status(200).json({ 
                        success: true,
                        image: part.inlineData.data
                    });
                }
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