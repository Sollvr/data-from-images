import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check, Info } from "lucide-react";
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
  urls?: string[];
  socialMediaHandles?: string[];
  productCodes?: string[];
}

interface ExtractedTextProps {
  text: string;
  patterns?: Patterns;
  isLoading: boolean;
}

export function ExtractedText({ text, patterns, isLoading }: ExtractedTextProps) {
  const [copied, setCopied] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState<string | null>(null);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasPatterns = patterns && Object.values(patterns).some(arr => arr && arr.length > 0);

  const patternLabels: Record<keyof Patterns, { label: string; description: string }> = {
    dates: {
      label: "Dates",
      description: "Dates in various formats including relative dates"
    },
    amounts: {
      label: "Monetary Amounts",
      description: "Currency values in different formats and denominations"
    },
    emails: {
      label: "Email Addresses",
      description: "Electronic mail addresses"
    },
    phoneNumbers: {
      label: "Phone Numbers",
      description: "Contact numbers in various formats"
    },
    addresses: {
      label: "Physical Addresses",
      description: "Postal and street addresses"
    },
    identifiers: {
      label: "Reference Numbers",
      description: "Invoice numbers, IDs, and other reference codes"
    },
    urls: {
      label: "Web URLs",
      description: "Website addresses and links"
    },
    socialMediaHandles: {
      label: "Social Media",
      description: "Social media handles and profile links"
    },
    productCodes: {
      label: "Product Codes",
      description: "SKUs, barcodes, and product identifiers"
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
                <p>Text and recognized patterns from your image</p>
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

        {hasPatterns && !isLoading && (
          <Accordion 
            type="single" 
            collapsible 
            className="w-full"
            value={selectedPattern || undefined}
            onValueChange={setSelectedPattern}
          >
            <AccordionItem value="patterns">
              <AccordionTrigger className="hover:no-underline">
                <span className="text-sm font-medium flex items-center gap-2">
                  Recognized Patterns
                  <span className="px-2 py-1 text-xs bg-primary/10 rounded-full">
                    {Object.keys(patterns!).length} types
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 p-2">
                  {Object.entries(patterns!).map(([key, values]) => {
                    if (!values || values.length === 0) return null;
                    const patternKey = key as keyof Patterns;
                    return (
                      <div key={key} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium">
                            {patternLabels[patternKey].label}
                          </h4>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{patternLabels[patternKey].description}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <span className="text-xs text-muted-foreground">
                            ({values.length})
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {values.map((value, index) => (
                            <div
                              key={index}
                              className="group relative"
                            >
                              <span
                                className="inline-block px-2 py-1 text-xs rounded-md bg-secondary hover:bg-secondary/80 transition-colors cursor-default"
                              >
                                {value}
                              </span>
                            </div>
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
