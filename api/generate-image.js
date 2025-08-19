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
  
  // Check for API key (support both OpenAI and custom API keys)
  const apiKey = process.env.GPT_IMAGE_API_KEY; // Vercel uses GPT_IMAGE_API_KEY
  if (!apiKey) {
    return res.status(500).json({ 
      error: 'API key not configured',
      details: 'Please set GPT_IMAGE_API_KEY environment variable'
    });
  }
  
  try {
    // Create prompt based on physical characteristics
    const prompt = `Studio photograph of a single cannabis bud still on its stem. Based on these physical characteristics: ${physicalCharacteristics}. The bud is set against a COMPLETELY BLACK, non-reflective background. The focus is sharp on the trichomes and pistils. The lighting should ensure the edges of the bud are crisp and clear, with absolutely no white border, halo, or outline. There shouldn't be ANY white color on the image.`;
    
    // Use custom or OpenAI API URL
    const apiUrl = process.env.CUSTOM_IMAGE_API_URL || 'https://api.openai.com/v1/images/generations';
    
    console.log('Generating image with prompt:', prompt);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-image-1", // Ensure this is the correct model identifier
        prompt: prompt,
        size: "1024x1024",
        quality: "hd",
        response_format: "b64_json"
      })
    });
    
    console.log('API Response status:', response.status);
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: { message: 'Failed to parse error response' } };
      }
      console.error('Image API error:', errorData);
      
      return res.status(500).json({
        error: 'Image generation failed',
        details: `API returned ${response.status}: ${errorData.error?.message || 'Unknown error'}`,
        success: false
      });
    }
    
    const data = await response.json();
    console.log('API Response keys:', Object.keys(data));
    
    // Extract image data from response
    if (data.data && data.data[0] && data.data[0].b64_json) {
      return res.status(200).json({
        success: true,
        image: data.data[0].b64_json
      });
    }
    
    // If URL format instead of base64
    if (data.data && data.data[0] && data.data[0].url) {
      // Convert URL to base64
      try {
        const imageResponse = await fetch(data.data[0].url);
        const arrayBuffer = await imageResponse.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        
        return res.status(200).json({
          success: true,
          image: base64
        });
      } catch (urlError) {
        console.error('Error converting URL to base64:', urlError);
        return res.status(500).json({
          error: 'Failed to process generated image',
          details: urlError.message,
          success: false
        });
      }
    }
    
    console.error('Unexpected API response format:', data);
    return res.status(500).json({
      error: 'Unexpected response format',
      details: 'API did not return image in expected format',
      success: false
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
