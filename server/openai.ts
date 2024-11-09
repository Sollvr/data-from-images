import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ExtractedData {
  text: string;
  patterns: {
    dates?: string[];
    amounts?: string[];
    emails?: string[];
    phoneNumbers?: string[];
    addresses?: string[];
    identifiers?: string[];
    urls?: string[];
    socialMediaHandles?: string[];
    productCodes?: string[];
  };
}

export async function analyzeImage(base64Image: string, requirements?: string): Promise<ExtractedData> {
  try {
    // Enhanced prompt with context-aware instructions
    const defaultPrompt = `Analyze this image and extract information with context:
1. Extract and format all visible text, maintaining structural layout
2. Identify and categorize the following patterns with contextual understanding:
   - Dates in any format (including relative dates)
   - Monetary amounts (including various currencies and formats)
   - Email addresses and contact information
   - Phone numbers (international formats supported)
   - Physical addresses (including international formats)
   - Reference numbers and identifiers (e.g., invoice numbers, IDs)
   - URLs and web addresses
   - Social media handles (@username, profile links)
   - Product codes and SKUs

Pay special attention to:
- Document context (e.g., if it's an invoice, receipt, business card)
- Relationship between identified patterns
- Regional formatting variations
- Special annotations or markings

Return the results in a structured format, separating raw text from categorized patterns.`;

    // Create a context-aware prompt based on user requirements
    const prompt = requirements 
      ? `Analyze this image with focus on: ${requirements}\n\nAdditional requirements:\n${defaultPrompt}`
      : defaultPrompt;

    const visionResponse = await openai.chat.completions.create({
      model: "gpt-4-vision-0125",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ],
        },
      ],
      max_tokens: 2000,
      temperature: 0.2, // Lower temperature for more precise pattern recognition
    });

    const content = visionResponse.choices[0].message.content || "";
    
    // Enhanced regex patterns for more accurate matching
    const patterns = {
      dates: extractPatterns(content, 
        /\b\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}(?:st|nd|rd|th)?,? \d{4}\b|\b\d{4}[-/.]\d{1,2}[-/.]\d{1,2}\b/gi
      ),
      amounts: extractPatterns(content,
        /(?:USD|EUR|GBP|JPY|CHF|AUD|CAD)?\s*\$?\s*\d+(?:,\d{3})*(?:\.\d{2})?\s*(?:USD|EUR|GBP|JPY|CHF|AUD|CAD)?|\b\d+(?:,\d{3})*(?:\.\d{2})?\s*(?:dollars|euros|pounds|yen)\b/gi
      ),
      emails: extractPatterns(content,
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
      ),
      phoneNumbers: extractPatterns(content,
        /(?:\+\d{1,4}[-. ]?)?\(?\d{1,4}\)?[-. ]?\d{1,4}[-. ]?\d{1,4}(?:[-. ]?\d{1,9})?|\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g
      ),
      addresses: extractPatterns(content,
        /\d+\s+[A-Za-z\s,]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Circle|Cir|Way|Place|Pl|Square|Sq)[,\s]+[A-Za-z\s]+(?:[,\s]+[A-Z]{2})?\s*\d{5}(?:-\d{4})?/gi
      ),
      identifiers: extractPatterns(content,
        /\b(?:INV|REF|ID|NO|PO|SO)[-#]?\d+\b|\b[A-Z0-9]{6,}\b|\b\d{4}[-]\d{4}[-]\d{4}\b/gi
      ),
      urls: extractPatterns(content,
        /(?:https?:\/\/)?(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi
      ),
      socialMediaHandles: extractPatterns(content,
        /(?:@[a-zA-Z0-9_]{1,15})|(?:(?:twitter\.com|instagram\.com|linkedin\.com|facebook\.com)\/[a-zA-Z0-9_\-.]+)/gi
      ),
      productCodes: extractPatterns(content,
        /\b[A-Z]{2,4}-\d{3,7}\b|\b\d{12,13}\b|\b[A-Z0-9]{4,}-[A-Z0-9]{4,}\b|\bSKU[-:]?\s*[A-Z0-9-]{4,}\b/gi
      ),
    };

    // Remove empty pattern categories
    const filteredPatterns = Object.fromEntries(
      Object.entries(patterns).filter(([_, values]) => values.length > 0)
    );

    return {
      text: content,
      patterns: filteredPatterns,
    };
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to analyze image");
  }
}

function extractPatterns(text: string, pattern: RegExp): string[] {
  const matches = text.match(pattern) || [];
  return [...new Set(matches)].filter(match => match.trim()); // Remove duplicates and empty matches
}
