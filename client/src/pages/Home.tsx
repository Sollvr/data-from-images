import { useState } from "react";
import { ImageUpload } from "@/components/ImageUpload";
import { ExtractedText } from "@/components/ExtractedText";
import { TagManager } from "@/components/TagManager";
import { Button } from "@/components/ui/button";
import { Home as HomeIcon, LogOut, Download, FileText, FileJson, Table } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReviewDialog } from "@/components/ReviewDialog";

interface Patterns {
  dates?: string[];
  amounts?: string[];
  emails?: string[];
  phoneNumbers?: string[];
  addresses?: string[];
  identifiers?: string[];
}

interface ExtractionResult {
  text: string;
  patterns: Patterns;
  filename: string;
  extraction?: any;
}

export default function Home() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { signOut } = useAuth();
  const [results, setResults] = useState<ExtractionResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showReview, setShowReview] = useState(false);

  const handleImageUpload = async (files: File[], requirements?: string) => {
    setIsLoading(true);
    setProgress(0);
    setResults([]);

    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("images", file);
      });
      if (requirements) {
        formData.append("requirements", requirements);
      }

      const response = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to extract text");

      const data = await response.json();
      setResults(data.results);
      setSelectedIndex(0);

      if (data.results.length > 0) {
        const firstResult = data.results[0];
        const newTags = new Set<string>();
        if (firstResult.patterns) {
          if (firstResult.patterns.dates?.length) newTags.add("date");
          if (firstResult.patterns.amounts?.length) newTags.add("amount");
          if (firstResult.patterns.emails?.length) newTags.add("email");
          if (firstResult.patterns.phoneNumbers?.length) newTags.add("phone");
          if (firstResult.patterns.addresses?.length) newTags.add("address");
          if (firstResult.patterns.identifiers?.length) newTags.add("reference");
        }
        setTags(Array.from(newTags));
      }

      setShowReview(true);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to extract text from images",
      });
    } finally {
      setIsLoading(false);
      setProgress(100);
    }
  };

  const handleAddTag = (tag: string) => {
    setTags([...tags, tag]);
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleLogout = async () => {
    try {
      await signOut();
      setLocation('/');
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to log out",
      });
    }
  };

  const handleExport = (format: 'csv' | 'txt' | 'json') => {
    if (!results.length) {
      toast({
        variant: "destructive",
        title: "No data to export",
        description: "Please extract text from images first.",
      });
      return;
    }

    try {
      let content: string;
      let filename: string;
      let type: string;

      switch (format) {
        case 'csv':
          content = results.map(result => {
            return `"${result.filename}","${result.text.replace(/"/g, '""')}","${Object.entries(result.patterns)
              .map(([key, values]) => `${key}: ${values?.join(', ')}`)
              .join('","')}"`;
          }).join('\n');
          content = `Filename,Text,${Object.keys(results[0].patterns).join(',')}\n${content}`;
          filename = 'extractions.csv';
          type = 'text/csv';
          break;

        case 'txt':
          content = results.map(result => {
            return `File: ${result.filename}\n` +
              `Text: ${result.text}\n` +
              `Patterns:\n${Object.entries(result.patterns)
                .map(([key, values]) => `  ${key}: ${values?.join(', ')}`)
                .join('\n')}\n` +
              '-'.repeat(50);
          }).join('\n\n');
          filename = 'extractions.txt';
          type = 'text/plain';
          break;

        case 'json':
          content = JSON.stringify(results, null, 2);
          filename = 'extractions.json';
          type = 'application/json';
          break;

        default:
          throw new Error('Invalid format');
      }

      const blob = new Blob([content], { type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export successful",
        description: `Data exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        variant: "destructive",
        title: "Export failed",
        description: "Failed to export data. Please try again.",
      });
    }
  };

  const currentResult = results[selectedIndex];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Extract Text</h1>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleExport('csv')}>
                  <Table className="h-4 w-4 mr-2" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('txt')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export as TXT
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('json')}>
                  <FileJson className="h-4 w-4 mr-2" />
                  Export as JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" onClick={() => setLocation("/")}>
              <HomeIcon className="h-4 w-4 mr-2" />
              Home
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <ImageUpload
              onImageUpload={handleImageUpload}
              isLoading={isLoading}
              progress={progress}
            />
            {results.length > 1 && (
              <div className="flex gap-2 overflow-x-auto p-2">
                {results.map((result, index) => (
                  <Button
                    key={index}
                    variant={index === selectedIndex ? "default" : "outline"}
                    onClick={() => setSelectedIndex(index)}
                    className="whitespace-nowrap"
                  >
                    {result.filename}
                  </Button>
                ))}
              </div>
            )}
            <TagManager
              tags={tags}
              onAddTag={handleAddTag}
              onRemoveTag={handleRemoveTag}
            />
          </div>
          <ExtractedText
            text={currentResult?.text || ""}
            patterns={currentResult?.patterns}
            isLoading={isLoading}
          />
        </div>
      </div>

      <ReviewDialog 
        open={showReview} 
        onOpenChange={setShowReview}
      />
    </div>
  );
}
