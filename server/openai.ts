import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  console.error("Warning: OPENAI_API_KEY is not set");
}

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || 'dummy-key'  // Prevents crash during development
});

interface ExtractedData {
  text: string;
  patterns: {
    dates?: string[];
    amounts?: string[];
    emails?: string[];
    phoneNumbers?: string[];
    addresses?: string[];
    identifiers?: string[];
  };
}

export async function analyzeImage(base64Image: string, requirements?: string): Promise<ExtractedData> {
  if (!process.env.OPENAI_API_KEY) {
    // Return mock data if no API key is set
    return {
      text: "API key not configured. This is mock data.",
      patterns: {
        dates: ["2024-03-21"],
        amounts: ["$100.00"],
        emails: ["example@test.com"],
        phoneNumbers: ["123-456-7890"],
        addresses: ["123 Test St"],
        identifiers: ["ID123"],
      }
    };
  }

  try {
    const defaultPrompt = `Analyze this image and extract the following:
1. All visible text in a clean, readable format
2. Identify and categorize the following patterns if present:
   - Dates in any format
   - Monetary amounts or numerical values
   - Email addresses
   - Phone numbers
   - Physical addresses
   - Any identifiers (e.g., invoice numbers, reference codes)
If there are tables or structured data, preserve their layout.
Return the results in a structured format separating the raw text from the identified patterns.`;

    const prompt = requirements 
      ? `${requirements}\n\nAdditional analysis requirements: ${defaultPrompt}` 
      : defaultPrompt;

    const visionResponse = await openai.chat.completions.create({
      model: "gpt-4o",
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
      max_tokens: 1500,
      temperature: 0.3, // Lower temperature for more focused pattern recognition
    });

    const content = visionResponse.choices[0].message.content || "";
    
    // Parse the response to extract patterns
    const patterns = {
      dates: extractPatterns(content, /\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}\b/gi),
      amounts: extractPatterns(content, /\$\d+(?:,\d{3})*(?:\.\d{2})?|\b\d+(?:,\d{3})*(?:\.\d{2})?\s*(?:USD|EUR|GBP)\b/gi),
      emails: extractPatterns(content, /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g),
      phoneNumbers: extractPatterns(content, /\+?\d{1,4}[-.\s]?\(?\d{1,3}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g),
      addresses: extractPatterns(content, /\d+\s+[A-Za-z\s,]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Circle|Cir|Way)[,\s]+[A-Za-z\s]+,\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?/gi),
      identifiers: extractPatterns(content, /\b(?:INV|REF|ID|NO)[-#]?\d+\b|\b[A-Z0-9]{6,}\b/gi),
    };

    return {
      text: content,
      patterns,
    };
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to analyze image");
  }
}

function extractPatterns(text: string, pattern: RegExp): string[] {
  const matches = text.match(pattern) || [];
  return [...new Set(matches)]; // Remove duplicates
}
