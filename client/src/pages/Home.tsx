import { useState } from "react";
import { useUser } from "@/hooks/use-user";
import { ImageUpload } from "@/components/ImageUpload";
import { ExtractedText } from "@/components/ExtractedText";
import { TagManager } from "@/components/TagManager";
import { Button } from "@/components/ui/button";
import { LogOut, Download, Home as HomeIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

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
  const { user, logout } = useUser();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [results, setResults] = useState<ExtractionResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

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

  const handleExport = async () => {
    try {
      const response = await fetch("/api/export", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) throw new Error("Failed to export data");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "extractions.csv";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Data exported successfully",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to export data",
      });
    }
  };

  if (!user) {
    setLocation("/auth");
    return null;
  }

  const currentResult = results[selectedIndex];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Extract Text</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setLocation("/")}>
              <HomeIcon className="h-4 w-4 mr-2" />
              Home
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" onClick={() => logout()}>
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
    </div>
  );
}
