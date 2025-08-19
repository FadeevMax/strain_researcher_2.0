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
  
  if (!process.env.GPT_IMAGE_API_KEY) {
    return res.status(500).json({ error: 'GPT-Image-1 API key not configured' });
  }
  
  try {
    // Create prompt based on physical characteristics
    const prompt = `Studio photograph of a single cannabis bud still on its stem. Based on these physical characteristics: ${physicalCharacteristics}. The bud is set against a COMPLETELY BLACK, non-reflective background. The focus is sharp on the trichomes and pistils. The lighting should ensure the edges of the bud are crisp and clear, with absolutely no white border, halo, or outline. There shouldn't be ANY white color on the image.`;
    
    // Use GPT-Image-1 API (Replace with actual API URL for GPT-Image-1)
    const response = await fetch('https://api.gpt-image-1.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GPT_IMAGE_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-image-1', // Replace with the actual model name if different
        prompt: prompt,
        n: 1,
        size: '1024x1024', // Adjust size based on GPT-Image-1's supported sizes
        quality: 'hd', // Use the appropriate quality setting for GPT-Image-1
        response_format: 'b64_json' // Assuming GPT-Image-1 returns the image in base64
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('GPT-Image-1 API error:', errorData);
      throw new Error(`GPT-Image-1 API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }
    
    const data = await response.json();
    
    // Extract image data from response
    if (data.data && data.data[0] && data.data[0].b64_json) {
      return res.status(200).json({
        success: true,
        image: data.data[0].b64_json
      });
    }
    
    throw new Error('No image generated from GPT-Image-1 API');
    
  } catch (error) {
    console.error('Error generating image:', error);
    return res.status(500).json({
      error: 'Failed to generate image',
      details: error.message,
      success: false
    });
  }
}