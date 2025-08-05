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
        // Create a detailed prompt for cannabis bud image generation
        const prompt = `Studio photograph of a single cannabis bud still on its stem. Based on these physical characteristics: ${physicalCharacteristics}. The bud is set against a COMPLETELY BLACK, non-reflective background. The focus is sharp on the trichomes and pistils. The lighting should ensure the edges of the bud are crisp and clear, with absolutely no white border, halo, or outline. Professional cannabis photography style, high detail, realistic textures.`;

        // Try OpenAI DALL-E 3 first
        if (process.env.OPENAI_API_KEY) {
            try {
                const openaiResponse = await fetch('https://api.openai.com/v1/images/generations', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: "dall-e-3",
                        prompt: prompt,
                        n: 1,
                        size: "1024x1024",
                        quality: "standard",
                        response_format: "b64_json"
                    })
                });

                if (openaiResponse.ok) {
                    const data = await openaiResponse.json();
                    const imageData = data.data[0].b64_json;
                    
                    return res.status(200).json({ 
                        success: true,
                        image: imageData
                    });
                } else {
                    console.log('OpenAI API failed:', await openaiResponse.text());
                }
            } catch (openaiError) {
                console.error('OpenAI error:', openaiError);
            }
        }

        // Try Hugging Face as fallback
        if (process.env.HUGGINGFACE_API_KEY) {
            try {
                const hfResponse = await fetch(
                    "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0",
                    {
                        headers: {
                            Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
                            "Content-Type": "application/json",
                        },
                        method: "POST",
                        body: JSON.stringify({
                            inputs: prompt,
                            parameters: {
                                negative_prompt: "blurry, low quality, cartoon, anime, painting, drawing, white background, white border, halo, outline",
                                num_inference_steps: 30,
                                guidance_scale: 7.5,
                                width: 1024,
                                height: 1024
                            }
                        }),
                    }
                );

                if (hfResponse.ok) {
                    const buffer = await hfResponse.arrayBuffer();
                    const base64 = Buffer.from(buffer).toString('base64');
                    
                    return res.status(200).json({ 
                        success: true,
                        image: base64
                    });
                } else {
                    console.log('Hugging Face API failed:', await hfResponse.text());
                }
            } catch (hfError) {
                console.error('Hugging Face error:', hfError);
            }
        }

        // Return informative error if no API keys are configured
        return res.status(200).json({ 
            success: false,
            error: 'Image generation requires an API key. Please add OPENAI_API_KEY or HUGGINGFACE_API_KEY to your Vercel environment variables.',
            demo: true
        });

    } catch (error) {
        console.error('Error generating image:', error);
        return res.status(500).json({ 
            error: 'Failed to generate image',
            details: error.message,
            success: false
        });
    }
}