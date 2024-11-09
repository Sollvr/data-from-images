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
  };
}

interface AnalysisResult {
  analysis: string;
  calculations?: {
    total?: number;
    average?: number;
    breakdown?: { [key: string]: number };
  };
}

export async function analyzeImage(base64Image: string, requirements?: string): Promise<ExtractedData> {
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
      max_tokens: 1500,
      temperature: 0.3,
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

export async function analyzeExtractedText(text: string, prompt: string): Promise<AnalysisResult> {
  try {
    const defaultAnalysisPrompt = `
Please analyze the following text and provide insights. If monetary amounts are present:
1. Calculate the total sum
2. Calculate the average amount
3. Provide a breakdown of different categories if applicable
4. Format all monetary values with proper currency symbols

Additional user requirements: ${prompt}

Text to analyze:
${text}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "user",
          content: defaultAnalysisPrompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const analysis = response.choices[0].message.content || "";
    
    // Extract calculations from the analysis
    const calculations = {
      total: extractTotalAmount(analysis),
      average: extractAverageAmount(analysis),
      breakdown: extractBreakdown(analysis),
    };

    return {
      analysis,
      calculations,
    };
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to analyze text");
  }
}

function extractPatterns(text: string, pattern: RegExp): string[] {
  const matches = text.match(pattern) || [];
  return [...new Set(matches)]; // Remove duplicates
}

function extractTotalAmount(text: string): number | undefined {
  const totalMatch = text.match(/total:?\s*\$?([\d,]+\.?\d*)/i);
  if (totalMatch) {
    return parseFloat(totalMatch[1].replace(/,/g, ''));
  }
  return undefined;
}

function extractAverageAmount(text: string): number | undefined {
  const avgMatch = text.match(/average:?\s*\$?([\d,]+\.?\d*)/i);
  if (avgMatch) {
    return parseFloat(avgMatch[1].replace(/,/g, ''));
  }
  return undefined;
}

function extractBreakdown(text: string): { [key: string]: number } | undefined {
  const breakdown: { [key: string]: number } = {};
  const lines = text.split('\n');
  
  for (const line of lines) {
    const match = line.match(/([^:]+):\s*\$?([\d,]+\.?\d*)/);
    if (match) {
      const [, category, amount] = match;
      breakdown[category.trim()] = parseFloat(amount.replace(/,/g, ''));
    }
  }
  
  return Object.keys(breakdown).length > 0 ? breakdown : undefined;
}
