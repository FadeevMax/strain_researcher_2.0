export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { query, conversation_history = [] } = req.body;

    if (!query) {
      res.status(400).json({ error: 'Query is required' });
      return;
    }

    console.log('Processing query:', query);

    // Get Perplexity API key
    const apiKey = process.env.PERPLEXITY_API_KEY;
    console.log('API key exists:', !!apiKey);

    if (!apiKey) {
      res.status(500).json({ 
        error: 'API key not configured',
        response: getFallbackResponse(query),
        status: 'fallback'
      });
      return;
    }

    // Call Perplexity API
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: `You are a cannabis-industry research assistant.  
Return the following **13 data fields** for the strain you’re given, using **plain text** and the exact labels below.

Put the lines into the four blocks shown, separated by a blank line before and after each block header. If a value is unknown, DO NOT SHOW this line.

=== NAME ===
Strain Name: <text>
Alt Name(s): <comma-separated list>
Nickname(s): <comma-separated list>

=== ATTRIBUTES ===
Hybridization: <Indica | Sativa | Hybrid>
Reported Flavors (Top 3):
- <flavor 1>
- <flavor 2>
- <flavor 3>
Reported Effects (Top 3):
- <effect 1>
- <effect 2>
- <effect 3>
Physical Characteristics (Color, Bud Structure, Trichomes):
- <bullet 1>
- <bullet 2>
- <bullet 3>

=== HISTORY ===
Original Release Date: <text>
Lineage / Genetics: <text>
Trivia (Interesting Facts):
- <bullet 1>
- <bullet 2>
- <bullet 3>
Similar Strains (Top 3 by effect/genetics):
- <strain 1>
- <strain 2>
- <strain 3>

=== RECOGNITION ===
Awards: <comma-separated list>
User Rating (Average Score, # of Reviews, Common Comments):
- <e.g. “4.3 / 5 from 135 reviews”>
- <comment 1>
- <comment 2>
- <comment 3>

---
### Rules
- If full information is not available about the strain (e.g., it's a new hybrid or rare cross). Clearly state that the original strain had insufficient data.
- If any of the values is unknown (for example, no Nicknames), skip this value and DO NOT SHOW this line.
### Rules for User Ratings
- Provide the actual rating score if known (e.g., "4.2 / 5", "4.7 / 5")
- For review counts:
  - If exact number is known, use it: "from 5,432 reviews"
  - If described as "thousands", estimate realistically: "from 3,000+ reviews" or "from 8,500+ reviews"
  - If described as "hundreds", estimate: "from 200+ reviews" or "from 750+ reviews"
  - If unknown, state "No rating data available"
- Don't default to 4.5 / 5 and 1000+ reviews - provide actual or realistic varied numbers

---
**(Example for a Successful Primary Search)**
**User input:** "gg #4"
**Example Output:**

=== NAME ===
Strain Name: GG #4
Alt Name(s): Original Glue, Gorilla Glue #4, Glue
Nickname(s): GG4, The Glue, Couch-Glue

=== ATTRIBUTES ===
Hybridization: Hybrid
Reported Flavors (Top 3):
- Earthy
- Pine
- Chocolate
Reported Effects (Top 3):
- Heavy euphoria
- Munchies
- Mood elevation
Physical Characteristics (Color, Bud Structure, Trichomes):
- Dense, medium-green buds with lime & olive hues
- Thick blanket of milky trichomes giving a silvery-white frost
- Sparse but vivid orange pistils

=== HISTORY ===
Original Release Date: 2013
Lineage / Genetics: Chem's Sister × Sour Dubb × Chocolate Diesel
Trivia (Interesting Facts):
- Discovered accidentally when a hermaphroditic Chem's Sister pollinated Sour Dubb plants
- Named "Gorilla Glue" for the ultra-sticky resin that "glued" trimming scissors together
- Forced to rebrand as "Original Glue / GG4" after trademark litigation
Similar Strains (Top 3 by effect/genetics):
- GG #5 (Sister Glue)
- Chem D
- Sour Diesel

=== RECOGNITION ===
Awards: 1st Place Cannabis Cup Amsterdam 1995
User Rating (Average Score, # of Reviews, Common Comments):
- 4.6 / 5 from 2000+ reviews
- Noted for balanced, potent effects
- Popular for stress and anxiety relief
- Appreciated for ease of growth
---
**(Example for a Fallback Scenario)**

Insufficient data for strain 'Galactic Runtz'. Contact web@headquarters.co`
          },
          ...conversation_history.slice(-5),
          {
            role: 'user',
            content: query
          }
        ],
        max_tokens: 2000,
        temperature: 0.2,
        top_p: 0.9
      })
    });

    console.log('Perplexity API status:', response.status);

    if (response.ok) {
      const result = await response.json();
      const content = result.choices[0].message.content;
      
      res.status(200).json({
        response: content,
        status: 'success'
      });
    } else {
      const errorText = await response.text();
      console.log('Perplexity API error:', errorText);
      
      res.status(200).json({
        response: getFallbackResponse(query),
        status: 'fallback'
      });
    }

  } catch (error) {
    console.error('Handler error:', error);
    res.status(200).json({
      response: getFallbackResponse(req.body?.query || 'strain'),
      status: 'error'
    });
  }
}

function getFallbackResponse(query) {
  return `I'm currently having trouble accessing the strain database, but I can provide some general guidance:

For strain research, typically look for:
• Genetics & Lineage - Parent strains and breeding history
• Cannabinoid Profile - THC/CBD percentages and ratios
• Effects - Physical and mental experiences reported

Popular strain categories:
• Sativa - Often energizing, creative, daytime use
• Indica - Typically relaxing, sedating, evening use
• Hybrid - Balanced effects from both types

Please try your search again in a moment!`;
}