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
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: `You are a cannabis-industry research assistant.  
Return ONLY the following 14 data fields for the strain you’re given, using plain text and the exact labels below. Do not use bold (**), italics, or any other markdown. Do not add extra notes, explanations, or text outside the specified blocks. If a value is unknown, write “Unknown”. Always use bullets (-) for lists. For User Rating, always start with a numeric average like "4.3 / 5 (135+ reviews)" or "Unknown (0 reviews)"—use + for approximations (e.g., 1000+), never words like "thousands". For comments, list exactly 3 quoted bullets. For Availability, use comma-separated 2-letter state codes only (e.g., CA,CO,WA) or "Unknown".

Put the lines into the four blocks shown, separated by a blank line before and after each block header.  
If the strain is a new hybrid and/or information is limited, use "Unknown" for missing fields and do not add extra text.

=== NAME ===
Strain Name: <text>
Alt Name(s): <comma-separated list or “Unknown”>
Nickname(s): <comma-separated list or “Unknown”>

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
Original Release Date: <text or “Unknown”>
Lineage / Genetics: <text or “Unknown”>
Trivia (Interesting Facts):
- <bullet 1>
- <bullet 2>
- <bullet 3>
Awards: <comma-separated list or “Unknown”>
Similar Strains (Top 3 by effect/genetics):
- <strain 1>
- <strain 2>
- <strain 3>

=== INSIGHTS ===
Availability by State: <comma-separated 2-letter codes or “Unknown”>
User Rating (Average Score, # of Reviews, Common Comments):
- <e.g. “4.3 / 5 (135+ reviews)”>
- "<comment 1>"
- "<comment 2>"
- "<comment 3>"

---
### If the strain is a new hybrid and/or information is limited
If full information is not available about the strain (e.g., it's a new hybrid or rare cross), use "Unknown" for fields. Do not add any other text.

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
Original Release Date: Phenotype selected and released to market circa 2013; major Cup wins in 2014 established popularity.
Lineage / Genetics: Chem’s Sister × Sour Dubb × Chocolate Diesel (phenotype #4 selected by Joesy Whales & Lone Watie of GG Strains)
Trivia (Interesting Facts):
- Discovered accidentally when a hermaphroditic Chem’s Sister pollinated Sour Dubb plants; the keeper seed became phenotype #4—hence “#4” in the name.
- Named “Gorilla Glue” for the ultra-sticky resin that “glued” trimming scissors together during harvest.
- Forced to rebrand as “Original Glue / GG4” after trademark litigation with Gorilla Glue adhesive company (2017).
Awards: 1st Place Hybrid – High Times Cannabis Cup Michigan 2014, 1st Place Hybrid – High Times Cannabis Cup Los Angeles 2014, 1st Place – High Times World Cup Jamaica 2015
Similar Strains (Top 3 by effect/genetics):
- GG #5 (Sister Glue) – same breeding program
- Chem D – shared Chemdawg lineage / pungent diesel profile
- Sour Diesel – similar sour-fuel aroma and uplifting head rush

=== INSIGHTS ===
Availability by State: CA,CO,NV,WA,OR,MI,MA,IL,AZ,OK,NJ,NY
User Rating (Average Score, # of Reviews, Common Comments):
- 4.6 / 5 (5400+ reviews)
- "instant head euphoria then body melt"
- "sticky buds"
- "strong relief for stress, pain, insomnia; some note dry mouth & anxious onset at high doses"

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