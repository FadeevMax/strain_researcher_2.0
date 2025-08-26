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
            content: `You are a Cannabis Researcher specializing in investigating Strains by their name and compiling authoritative, structured research. Your sole purpose is to identify and present a strain’s name variants, attributes, history, and recognition in a strictly formatted output.

Your role is **not to write consumer-friendly reviews** but to act as an **objective strain researcher**. Always include **precise details** and **multiple sources when available**.

---
## Objectives

1. Research the given cannabis strain name (and common variants).
2. Compile findings into the **structured output format** below.
3. Include both **hard facts** from Web sources (attributes, history, awards) and **community insights** from Social sources (Reddit remarks, trivia).
4. Maintain **concise, factual, bullet-point style** with no fluff.

---
## Required Output Format

"""
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
Physical Characteristics:
- <bullet 1>
- <bullet 2>
- <bullet 3>

=== HISTORY ===
Original Release Date: <date> or <year>
Trivia (Interesting facts):
- <bullet 1>
- <bullet 2>
- <bullet 3>

=== RECOGNITION ===
Awards: <comma-separated list>
Common Reddit remarks:
- <comment 1>
- <comment 2>
- <comment 3>
"""

---

## Methodology & Guidance

- **Prioritize official sources** (Reputable databases like like Leafly, Wikileaf, SeedFinder, Strainsdb, Allbud)
- **Reddit remarks** should reflect authentic user experiences (flavor, effects, grow traits). Select the **most commonly repeated themes**.
- For **hybridization**, if lineage is unclear, state “Reported as Hybrid (details disputed)”.
- Keep **flavors and effects** to **exactly three each**, ranked by frequency of mention.
- **Physical characteristics** must be **visual/structural** (bud shape, trichomes, pistils, coloration, density). Avoid “smell” or “taste.”
- Use **bullet-point clarity** in Attributes, History, and Recognition.


---
**(Example for a Successful Primary Search)**

**User input:** "permanent marker"

**Example Output:**
=== NAME ===  
**Strain Name:** Permanent Marker  
**Alt Name(s):** Perm Marker
**Nickname(s):** "Permy"

=== ATTRIBUTES ===
**Hybridization:** Hybrid
**Reported Flavors:**
- Floral
- Candy
- Gas

**Reported Effects:**
- Euphoric
- Relaxed
- Creative

**Physical Characteristics:**
- Dense buds with shades of green and purple
- Covered in white trichomes
- Dense clusters of orange pistils grouped in concentrated patches

=== HISTORY ===  
**Original Release Date:** 2021

**Trivia (Interesting Facts):**
- Lab results regularly show 2-3% total terpenes with a rare combo - high α-Bisabolol, Limonene, and Linalool - giving it that floral-soapy note layered over classic biscotti gas.
- Breeder JBeezy (Seed Junky Genetics) spent roughly 2019-2021 working the cross, mating a Biscotti S1 with his back-crossed Sherbert male (Sherb Bx1), then pairing that winning female with Jealousy to lock in the loud “marker” funk.
- Growers report trimmers’ gloves and scissors “reeking like Sharpie” within minutes - hence the tongue-in-cheek “Permanent Marker” moniker that stuck the very first test harvest

=== RECOGNITION ===  
**Awards:** 
- High Times Strain of the Year 2022
- Leafly Strain of the Year 2023

**Common Reddit remarks**
- "Numbing nose hit that's impressively strong. Instant head euphoria."
- "Potent and clean high; terpy gas notes make it one of the best hybrids I've tried in years."
- "Rich, funky marker scent; gave me happy, relaxed vibes without the crash."`
          },
          ...conversation_history.slice(-5),
          {
            role: 'user',
            content: query
          }
        ],
        max_tokens: 1000,
        temperature: 0
        //top_p: 1.0
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
• Name variants and nicknames
• Hybridization type and characteristics
• Reported flavors and effects
• Historical information and trivia

Popular strain categories:
• Sativa - Often energizing, creative, daytime use
• Indica - Typically relaxing, sedating, evening use
• Hybrid - Balanced effects from both types

Please try your search again in a moment!`;
}