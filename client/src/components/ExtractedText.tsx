import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Check, Info, Calculator } from "lucide-react";
import { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface Patterns {
  dates?: string[];
  amounts?: string[];
  emails?: string[];
  phoneNumbers?: string[];
  addresses?: string[];
  identifiers?: string[];
}

interface Calculations {
  total?: number;
  average?: number;
  breakdown?: { [key: string]: number };
}

interface ExtractedTextProps {
  text: string;
  patterns?: Patterns;
  isLoading: boolean;
}

export function ExtractedText({ text, patterns, isLoading }: ExtractedTextProps) {
  const [copied, setCopied] = useState(false);
  const [analysisPrompt, setAnalysisPrompt] = useState("");
  const [analysis, setAnalysis] = useState<string>("");
  const [calculations, setCalculations] = useState<Calculations | undefined>();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasPatterns = patterns && Object.values(patterns).some(arr => arr && arr.length > 0);

  const patternLabels = {
    dates: "Dates",
    amounts: "Monetary Amounts",
    emails: "Email Addresses",
    phoneNumbers: "Phone Numbers",
    addresses: "Physical Addresses",
    identifiers: "Reference Numbers",
  };

  const handleAnalyze = async () => {
    if (!text) return;

    setIsAnalyzing(true);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          prompt: analysisPrompt,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to analyze text");
      }

      const data = await response.json();
      setAnalysis(data.analysis);
      setCalculations(data.calculations);
    } catch (error) {
      console.error("Error analyzing text:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Extracted Content</h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>View extracted text and patterns. Use the analysis prompt to perform operations like calculating total amounts.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={copyToClipboard}
          disabled={isLoading || !text}
        >
          {copied ? (
            <Check className="h-4 w-4 mr-2" />
          ) : (
            <Copy className="h-4 w-4 mr-2" />
          )}
          {copied ? "Copied!" : "Copy"}
        </Button>
      </div>

      <div className="space-y-4">
        <div className="bg-secondary p-4 rounded-lg min-h-[200px] max-h-[300px] relative overflow-auto">
          {isLoading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-1/2" />
              <div className="h-4 bg-muted rounded w-2/3" />
            </div>
          ) : text ? (
            <pre className="whitespace-pre-wrap font-mono text-sm">{text}</pre>
          ) : (
            <p className="text-muted-foreground text-center">
              Upload an image to extract text
            </p>
          )}
        </div>

        {text && (
          <div className="space-y-2">
            <Textarea
              placeholder="Enter analysis prompt (e.g., 'Calculate total expenses' or 'Summarize key information')"
              value={analysisPrompt}
              onChange={(e) => setAnalysisPrompt(e.target.value)}
              className="min-h-[80px]"
            />
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !text}
              className="w-full"
            >
              <Calculator className="h-4 w-4 mr-2" />
              {isAnalyzing ? "Analyzing..." : "Analyze Text"}
            </Button>
          </div>
        )}

        {analysis && (
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="analysis">
              <AccordionTrigger>
                <span className="text-sm font-medium">Analysis Results</span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 p-2">
                  <div className="prose">
                    <p className="text-sm">{analysis}</p>
                  </div>
                  {calculations && (
                    <div className="space-y-2 border-t pt-2">
                      {calculations.total !== undefined && (
                        <p className="text-sm">
                          <strong>Total:</strong> ${calculations.total.toFixed(2)}
                        </p>
                      )}
                      {calculations.average !== undefined && (
                        <p className="text-sm">
                          <strong>Average:</strong> ${calculations.average.toFixed(2)}
                        </p>
                      )}
                      {calculations.breakdown && (
                        <div>
                          <p className="text-sm font-medium mb-1">Breakdown:</p>
                          <ul className="space-y-1">
                            {Object.entries(calculations.breakdown).map(([category, amount]) => (
                              <li key={category} className="text-sm">
                                {category}: ${amount.toFixed(2)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        {hasPatterns && !isLoading && (
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="patterns">
              <AccordionTrigger>
                <span className="text-sm font-medium">Recognized Patterns</span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 p-2">
                  {Object.entries(patterns!).map(([key, values]) => {
                    if (!values || values.length === 0) return null;
                    return (
                      <div key={key} className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">
                          {patternLabels[key as keyof Patterns]}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {values.map((value, index) => (
                            <span
                              key={index}
                              className="inline-block px-2 py-1 text-xs rounded-md bg-secondary"
                            >
                              {value}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </div>
    </Card>
  );
}
