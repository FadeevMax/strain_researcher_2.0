import { google } from 'googleapis';

// Initialize Google Sheets client
async function getGoogleSheetsClient() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        type: 'service_account',
        project_id: process.env.GOOGLE_PROJECT_ID,
        private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        client_id: process.env.GOOGLE_CLIENT_ID,
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.GOOGLE_CLIENT_EMAIL)}`
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    return sheets;
  } catch (error) {
    console.error('Error initializing Google Sheets client:', error);
    throw error;
  }
}

// Parse LLM output into structured data
function parseLLMOutput(content) {
  const data = {
    'Strain name': 'N/A',
    'Alt Name(s)': 'N/A',
    'Nickname(s)': 'N/A',
    'Hybridization': 'N/A',
    'Reported Flavors (Top 3)': 'N/A',
    'Reported Effects (Top 3)': 'N/A',
    'Physical Characteristics': 'N/A',
    'Original Release Date': 'N/A',
    'Trivia (Interesting facts)': 'N/A',
    'Awards': 'N/A',
    'Common Reddit remarks': 'N/A'
  };

  try {
    // Remove citation numbers like [1][2][3] and clean up asterisks
    let cleanContent = content.replace(/\[\d+\]/g, '').replace(/\*\*/g, '');
    
    // Split content into major sections first
    const sections = {
      name: '',
      attributes: '',
      history: '',
      recognition: ''
    };
    
    // Extract major sections using === markers
    const nameSection = cleanContent.match(/=== NAME ===([\s\S]*?)(?====|$)/i);
    if (nameSection) sections.name = nameSection[1];
    
    const attributesSection = cleanContent.match(/=== ATTRIBUTES ===([\s\S]*?)(?====|$)/i);
    if (attributesSection) sections.attributes = attributesSection[1];
    
    const historySection = cleanContent.match(/=== HISTORY ===([\s\S]*?)(?====|$)/i);
    if (historySection) sections.history = historySection[1];
    
    const recognitionSection = cleanContent.match(/=== RECOGNITION ===([\s\S]*?)(?====|$)/i);
    if (recognitionSection) sections.recognition = recognitionSection[1];
    
    // Parse NAME section
    if (sections.name) {
      const nameMatch = sections.name.match(/Strain Name:\s*(.+?)(?:\n|$)/i);
      if (nameMatch) data['Strain name'] = nameMatch[1].trim();
      
      const altMatch = sections.name.match(/Alt Name\(s\):\s*(.+?)(?:\n|$)/i);
      if (altMatch && altMatch[1].trim() && !altMatch[1].includes('N/A')) {
        data['Alt Name(s)'] = altMatch[1].trim();
      }
      
      const nickMatch = sections.name.match(/Nickname\(s\):\s*(.+?)(?:\n|$)/i);
      if (nickMatch && nickMatch[1].trim()) {
        const nickValue = nickMatch[1].replace(/["']/g, '').trim();
        if (!nickValue.toLowerCase().includes('none') && !nickValue.includes('N/A')) {
          data['Nickname(s)'] = nickValue;
        }
      }
    }
    
    // Parse ATTRIBUTES section
    if (sections.attributes) {
      const hybridMatch = sections.attributes.match(/Hybridization:\s*(.+?)(?=\n(?:Reported|$))/si);
      if (hybridMatch) {
        const hybridValue = hybridMatch[1].trim();
        if (hybridValue && !hybridValue.includes('N/A')) {
          data['Hybridization'] = hybridValue;
        }
      }
      
      // Extract flavors
      const flavorsMatch = sections.attributes.match(/Reported Flavors[^:]*:\s*\n?((?:[-•]\s*.+\n?){1,3})/i);
      if (flavorsMatch) {
        const bullets = flavorsMatch[1].match(/[-•]\s*(.+?)(?:\n|$)/g);
        if (bullets) {
          const flavors = bullets.map(b => b.replace(/[-•]\s*/, '').trim()).filter(f => f && f !== 'N/A');
          if (flavors.length > 0) {
            data['Reported Flavors (Top 3)'] = flavors.slice(0, 3).join(', ');
          }
        }
      }
      
      // Extract effects
      const effectsMatch = sections.attributes.match(/Reported Effects[^:]*:\s*\n?((?:[-•]\s*.+\n?){1,3})/i);
      if (effectsMatch) {
        const bullets = effectsMatch[1].match(/[-•]\s*(.+?)(?:\n|$)/g);
        if (bullets) {
          const effects = bullets.map(e => e.replace(/[-•]\s*/, '').trim()).filter(e => e && e !== 'N/A');
          if (effects.length > 0) {
            data['Reported Effects (Top 3)'] = effects.slice(0, 3).join(', ');
          }
        }
      }
      
      // Extract physical characteristics - only from attributes section
      const physicalMatch = sections.attributes.match(/Physical Characteristics:\s*\n?((?:[-•]\s*.+\n?)+)/i);
      if (physicalMatch) {
        const bullets = physicalMatch[1].match(/[-•]\s*(.+?)(?:\n|$)/g);
        if (bullets) {
          const characteristics = bullets.map(c => c.replace(/[-•]\s*/, '').trim()).filter(c => c && c !== 'N/A');
          if (characteristics.length > 0) {
            data['Physical Characteristics'] = characteristics.join('; ');
          }
        }
      }
    }
    
    // Parse HISTORY section
    if (sections.history) {
      const dateMatch = sections.history.match(/Original Release Date:\s*(.+?)(?=\n(?:Trivia|$))/si);
      if (dateMatch) {
        const dateValue = dateMatch[1].trim();
        if (dateValue && !dateValue.includes('N/A')) {
          data['Original Release Date'] = dateValue;
        }
      }
      
      // Extract trivia - only from history section
      const triviaMatch = sections.history.match(/Trivia[^:]*:\s*\n?((?:[-•]\s*.+\n?)+)/i);
      if (triviaMatch) {
        const bullets = triviaMatch[1].match(/[-•]\s*(.+?)(?:\n|$)/g);
        if (bullets) {
          const trivia = bullets.map(t => t.replace(/[-•]\s*/, '').trim()).filter(t => t && t !== 'N/A');
          if (trivia.length > 0) {
            data['Trivia (Interesting facts)'] = trivia.join('; ');
          }
        }
      }
    }
    
    // Parse RECOGNITION section
    if (sections.recognition) {
      // Extract awards - handle both single line and bullet format
      const awardsMatch = sections.recognition.match(/Awards:\s*\n?((?:[-•]\s*.+\n?)*|[^.\n]+\.?)(?=\n(?:Common Reddit|$))/si);
      if (awardsMatch) {
        const awardsText = awardsMatch[1].trim();
        if (awardsText && !awardsText.toLowerCase().includes('n/a') && !awardsText.toLowerCase().includes('none')) {
          // Check if it's bullet points
          if (awardsText.includes('-') || awardsText.includes('•')) {
            const bullets = awardsText.match(/[-•]\s*(.+?)(?:\n|$)/g);
            if (bullets) {
              const awards = bullets.map(a => a.replace(/[-•]\s*/, '').trim()).filter(a => a);
              if (awards.length > 0) {
                data['Awards'] = awards.join('; ');
              }
            }
          } else {
            // Single line format - capture until period or newline
            const cleanAwards = awardsText.replace(/\.$/, '').trim();
            if (cleanAwards) {
              data['Awards'] = cleanAwards;
            }
          }
        }
      }
      
      // Extract Reddit remarks - only from recognition section
      const redditMatch = sections.recognition.match(/Common Reddit remarks[^:]*:\s*\n?([\s\S]*?)$/i);
      if (redditMatch) {
        const redditContent = redditMatch[1].trim();
        // Look for bullet points
        const bullets = redditContent.match(/[-•]\s*["""]?(.+?)["""]?(?=\n[-•]|\n*$)/g);
        if (bullets) {
          const remarks = bullets.map(r => {
            return r.replace(/[-•]\s*/, '')
                    .replace(/^["""']/, '')
                    .replace(/["""']$/, '')
                    .trim();
          }).filter(r => r && r !== 'N/A' && r.length > 1);
          if (remarks.length > 0) {
            data['Common Reddit remarks'] = remarks.join('; ');
          }
        }
      }
    }
    
    // Clean up any remaining formatting issues
    for (const key in data) {
      if (data[key] !== 'N/A') {
        // Remove any trailing periods from non-sentence fields
        if (key === 'Alt Name(s)' || key === 'Nickname(s)' || key === 'Hybridization') {
          data[key] = data[key].replace(/\.$/, '');
        }
        // Ensure no section markers remain
        data[key] = data[key].replace(/===/g, '').trim();
      }
    }
    
  } catch (error) {
    console.error('Error parsing LLM output:', error);
  }

  // Log parsed data for debugging
  console.log('Parsed strain data:', JSON.stringify(data, null, 2));
  
  return data;
}

// Format database row back to LLM output format
function formatDatabaseRow(row) {
  const format = [];
  
  format.push('=== NAME ===');
  format.push(`Strain Name: ${row['Strain name'] || 'N/A'}`);
  format.push(`Alt Name(s): ${row['Alt Name(s)'] || 'N/A'}`);
  format.push(`Nickname(s): ${row['Nickname(s)'] || 'N/A'}`);
  
  format.push('\n=== ATTRIBUTES ===');
  format.push(`Hybridization: ${row['Hybridization'] || 'N/A'}`);
  
  // Format flavors as bullet points
  if (row['Reported Flavors (Top 3)'] && row['Reported Flavors (Top 3)'] !== 'N/A') {
    format.push('Reported Flavors (Top 3):');
    row['Reported Flavors (Top 3)'].split(',').forEach(f => {
      format.push(`- ${f.trim()}`);
    });
  } else {
    format.push('Reported Flavors (Top 3):');
    format.push('- N/A');
  }
  
  // Format effects as bullet points
  if (row['Reported Effects (Top 3)'] && row['Reported Effects (Top 3)'] !== 'N/A') {
    format.push('Reported Effects (Top 3):');
    row['Reported Effects (Top 3)'].split(',').forEach(e => {
      format.push(`- ${e.trim()}`);
    });
  } else {
    format.push('Reported Effects (Top 3):');
    format.push('- N/A');
  }
  
  // Format physical characteristics as bullet points
  if (row['Physical Characteristics'] && row['Physical Characteristics'] !== 'N/A') {
    format.push('Physical Characteristics:');
    row['Physical Characteristics'].split(';').forEach(c => {
      format.push(`- ${c.trim()}`);
    });
  } else {
    format.push('Physical Characteristics:');
    format.push('- N/A');
  }
  
  format.push('\n=== HISTORY ===');
  format.push(`Original Release Date: ${row['Original Release Date'] || 'N/A'}`);
  
  // Format trivia as bullet points
  if (row['Trivia (Interesting facts)'] && row['Trivia (Interesting facts)'] !== 'N/A') {
    format.push('Trivia (Interesting facts):');
    row['Trivia (Interesting facts)'].split(';').forEach(t => {
      format.push(`- ${t.trim()}`);
    });
  } else {
    format.push('Trivia (Interesting facts):');
    format.push('- N/A');
  }
  
  format.push('\n=== RECOGNITION ===');
  
  // Handle awards - keep as single line if simple list
  if (row['Awards'] && row['Awards'] !== 'N/A') {
    // Check if awards contain semicolons (multiple awards)
    if (row['Awards'].includes(';')) {
      format.push('Awards:');
      row['Awards'].split(';').forEach(a => {
        format.push(`- ${a.trim()}`);
      });
    } else {
      format.push(`Awards: ${row['Awards']}`);
    }
  } else {
    format.push('Awards: N/A');
  }
  
  // Format Reddit remarks as bullet points
  if (row['Common Reddit remarks'] && row['Common Reddit remarks'] !== 'N/A') {
    format.push('Common Reddit remarks:');
    row['Common Reddit remarks'].split(';').forEach(r => {
      // Remove quotes if they exist in the stored data
      const cleanRemark = r.trim().replace(/^["']|["']$/g, '');
      format.push(`- "${cleanRemark}"`);
    });
  } else {
    format.push('Common Reddit remarks:');
    format.push('- N/A');
  }
  
  return format.join('\n');
}

// Find strain in database
async function findStrainInDatabase(sheets, spreadsheetId, strainQuery) {
  try {
    // Get all data from the Database sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Database!A:K', // Columns A through K for all headers
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) return null; // No data or only headers

    const headers = rows[0];
    const strainNameIndex = headers.indexOf('Strain name');
    const altNamesIndex = headers.indexOf('Alt Name(s)');
    const nicknamesIndex = headers.indexOf('Nickname(s)');

    // Normalize the query
    const normalizedQuery = strainQuery.toLowerCase().trim();

    // Search through all rows (skip header)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row[strainNameIndex]) continue;

      // Check main strain name
      if (row[strainNameIndex].toLowerCase().includes(normalizedQuery) ||
          normalizedQuery.includes(row[strainNameIndex].toLowerCase())) {
        
        // Convert row to object with headers
        const strainData = {};
        headers.forEach((header, index) => {
          strainData[header] = row[index] || 'N/A';
        });
        
        return { data: strainData, rowIndex: i + 1 }; // +1 because sheets are 1-indexed
      }

      // Check alt names
      if (altNamesIndex !== -1 && row[altNamesIndex]) {
        const altNames = row[altNamesIndex].split(',').map(n => n.trim().toLowerCase());
        if (altNames.some(name => name === normalizedQuery || normalizedQuery.includes(name))) {
          const strainData = {};
          headers.forEach((header, index) => {
            strainData[header] = row[index] || 'N/A';
          });
          return { data: strainData, rowIndex: i + 1 };
        }
      }

      // Check nicknames
      if (nicknamesIndex !== -1 && row[nicknamesIndex]) {
        const nicknames = row[nicknamesIndex].split(',').map(n => n.trim().toLowerCase());
        if (nicknames.some(name => name === normalizedQuery || normalizedQuery.includes(name))) {
          const strainData = {};
          headers.forEach((header, index) => {
            strainData[header] = row[index] || 'N/A';
          });
          return { data: strainData, rowIndex: i + 1 };
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Error searching database:', error);
    return null;
  }
}

// Add new strain to database
async function addStrainToDatabase(sheets, spreadsheetId, strainData) {
  try {
    // Get headers to ensure correct order
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Database!A1:K1',
    });

    const headers = headerResponse.data.values[0];
    const values = headers.map(header => strainData[header] || 'N/A');

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Database!A:K',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [values],
      },
    });

    console.log('Successfully added strain to database');
  } catch (error) {
    console.error('Error adding strain to database:', error);
  }
}

// Update strain in database (for N/A fields)
async function updateStrainInDatabase(sheets, spreadsheetId, rowIndex, updatedData) {
  try {
    // Get headers
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Database!A1:K1',
    });

    const headers = headerResponse.data.values[0];
    const values = headers.map(header => updatedData[header] || 'N/A');

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Database!A${rowIndex}:K${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [values],
      },
    });

    console.log('Successfully updated strain in database');
  } catch (error) {
    console.error('Error updating strain in database:', error);
  }
}

// Get N/A fields from strain data
function getNAFields(strainData) {
  const naFields = [];
  for (const [key, value] of Object.entries(strainData)) {
    if (value === 'N/A' || !value || value.trim() === '') {
      naFields.push(key);
    }
  }
  return naFields;
}

// Call Perplexity API for specific fields
async function updateNAFields(apiKey, strainName, naFields, currentData) {
  try {
    // Create targeted query for missing fields
    const fieldQuery = `Research cannabis strain "${strainName}" and provide ONLY the following missing information: ${naFields.join(', ')}. Focus specifically on finding these exact details.`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar', // Use regular sonar for updates
        messages: [
          {
            role: 'system',
            content: process.env.PERPLEXITY_SYSTEM_PROMPT || `You are a Cannabis Researcher specializing in investigating Strains by their name and compiling authoritative, structured research. Your sole purpose is to identify and present a strain’s name variants, attributes, history, and recognition in a strictly formatted output.

Your role is **not to write consumer-friendly reviews** but to act as an **objective strain researcher**. Always include **precise details** and **multiple sources when available**.

---
## Objectives

1. Research the given cannabis strain name (and common variants).
2. Compile findings into the **structured output format** below.
3. Include both **hard facts** from Web sources (attributes, history, awards) and **community insights** from Social sources (Reddit remarks, trivia).
4. Maintain **concise, factual, bullet-point style** with no fluff.

---
## Required Output Format


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
- "Rich, funky marker scent; gave me happy, relaxed vibes without the crash.` // Your existing prompt

          },
          {
            role: 'user',
            content: fieldQuery
          }
        ],
        max_tokens: 800,
        temperature: 0
      })
    });

    if (response.ok) {
      const result = await response.json();
      const content = result.choices[0].message.content;
      const parsedUpdate = parseLLMOutput(content);
      
      // Merge only the N/A fields that now have values
      const updatedData = { ...currentData };
      for (const field of naFields) {
        if (parsedUpdate[field] && parsedUpdate[field] !== 'N/A') {
          updatedData[field] = parsedUpdate[field];
        }
      }
      
      return updatedData;
    }
  } catch (error) {
    console.error('Error updating N/A fields:', error);
  }
  
  return currentData;
}

// Main handler
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

    // Get API keys and sheet ID
    const apiKey = process.env.PERPLEXITY_API_KEY;
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

    if (!apiKey) {
      res.status(500).json({ 
        error: 'API key not configured',
        response: getFallbackResponse(query),
        status: 'fallback'
      });
      return;
    }

    // Initialize Google Sheets
    let sheets;
    let existingStrain = null;
    
    try {
      sheets = await getGoogleSheetsClient();
      
      // Search for strain in database
      existingStrain = await findStrainInDatabase(sheets, spreadsheetId, query);
      
      if (existingStrain) {
        console.log('Found strain in database');
        
        // Check for N/A fields
        const naFields = getNAFields(existingStrain.data);
        
        if (naFields.length > 0) {
          console.log(`Found ${naFields.length} N/A fields, attempting to update...`);
          
          // Try to update N/A fields
          const updatedData = await updateNAFields(
            apiKey, 
            existingStrain.data['Strain name'], 
            naFields, 
            existingStrain.data
          );
          
          // If we got updates, save them back to the sheet
          if (JSON.stringify(updatedData) !== JSON.stringify(existingStrain.data)) {
            await updateStrainInDatabase(sheets, spreadsheetId, existingStrain.rowIndex, updatedData);
            existingStrain.data = updatedData;
          }
        }
        
        // Return formatted response from database
        const formattedResponse = formatDatabaseRow(existingStrain.data);
        
        res.status(200).json({
          response: formattedResponse,
          status: 'from_database',
          hasNAFields: getNAFields(existingStrain.data).length > 0
        });
        return;
      }
    } catch (error) {
      console.error('Google Sheets error:', error);
      // Continue with Perplexity API if sheets fail
    }

    // Strain not in database, query Perplexity API
    console.log('Strain not in database, querying Perplexity...');
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar-pro', // Use sonar-pro for new strains
        messages: [
          {
            role: 'system',
            content: process.env.PERPLEXITY_SYSTEM_PROMPT || `You are a Cannabis Researcher specializing in investigating Strains by their name and compiling authoritative, structured research. Your sole purpose is to identify and present a strain’s name variants, attributes, history, and recognition in a strictly formatted output.

Your role is **not to write consumer-friendly reviews** but to act as an **objective strain researcher**. Always include **precise details** and **multiple sources when available**.

---
## Objectives

1. Research the given cannabis strain name (and common variants).
2. Compile findings into the **structured output format** below.
3. Include both **hard facts** from Web sources (attributes, history, awards) and **community insights** from Social sources (Reddit remarks, trivia).
4. Maintain **concise, factual, bullet-point style** with no fluff.

---
## Required Output Format


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
- "Rich, funky marker scent; gave me happy, relaxed vibes without the crash.` // Your existing prompt

          },
          ...conversation_history.slice(-5),
          {
            role: 'user',
            content: query
          }
        ],
        max_tokens: 1000,
        temperature: 0
      })
    });

    console.log('Perplexity API status:', response.status);

    if (response.ok) {
      const result = await response.json();
      const content = result.choices[0].message.content;
      
      // Parse and save to database
      if (sheets && spreadsheetId) {
        try {
          const parsedData = parseLLMOutput(content);
          await addStrainToDatabase(sheets, spreadsheetId, parsedData);
          console.log('Saved new strain to database');
        } catch (error) {
          console.error('Error saving to database:', error);
        }
      }
      
      res.status(200).json({
        response: content,
        status: 'success_new_strain'
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
