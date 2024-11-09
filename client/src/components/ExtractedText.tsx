import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

interface ExtractedTextProps {
  text: string;
  isLoading: boolean;
}

export function ExtractedText({ text, isLoading }: ExtractedTextProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Extracted Text</h3>
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
      <div className="bg-secondary p-4 rounded-lg min-h-[200px] relative">
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
    </Card>
  );
}
