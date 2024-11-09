import { useState } from "react";
import { useUser } from "@/hooks/use-user";
import { ImageUpload } from "@/components/ImageUpload";
import { ExtractedText } from "@/components/ExtractedText";
import { TagManager } from "@/components/TagManager";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

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

export default function Home() {
  const { user, logout } = useUser();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [extractedText, setExtractedText] = useState("");
  const [patterns, setPatterns] = useState<Patterns | undefined>();
  const [tags, setTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleImageUpload = async (file: File, requirements?: string) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      if (requirements) {
        formData.append("requirements", requirements);
      }

      const response = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to extract text");

      const data = await response.json();
      setExtractedText(data.text);
      setPatterns(data.patterns);

      // Enhanced automatic tag generation based on recognized patterns
      const newTags = new Set<string>();
      if (data.patterns) {
        // Document type detection based on content
        if (data.text.toLowerCase().includes("invoice")) newTags.add("invoice");
        if (data.text.toLowerCase().includes("receipt")) newTags.add("receipt");
        if (data.text.toLowerCase().includes("contract")) newTags.add("contract");
        if (data.text.toLowerCase().includes("business card")) newTags.add("contact");

        // Pattern-based tags
        if (data.patterns.dates?.length) newTags.add("date");
        if (data.patterns.amounts?.length) newTags.add("financial");
        if (data.patterns.emails?.length) newTags.add("email");
        if (data.patterns.phoneNumbers?.length) newTags.add("phone");
        if (data.patterns.addresses?.length) newTags.add("address");
        if (data.patterns.identifiers?.length) newTags.add("reference");
        if (data.patterns.urls?.length) newTags.add("website");
        if (data.patterns.socialMediaHandles?.length) newTags.add("social");
        if (data.patterns.productCodes?.length) newTags.add("product");

        // Content type tags based on pattern combinations
        if (data.patterns.amounts?.length && data.patterns.dates?.length) {
          newTags.add("transaction");
        }
        if (data.patterns.emails?.length && data.patterns.phoneNumbers?.length) {
          newTags.add("contact");
        }
        if (data.patterns.productCodes?.length && data.patterns.amounts?.length) {
          newTags.add("order");
        }
      }
      setTags(Array.from(newTags));
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to extract text from image",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTag = (tag: string) => {
    setTags([...tags, tag]);
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  if (!user) {
    setLocation("/auth");
    return null;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Screenshot Text Extractor</h1>
        <Button variant="outline" onClick={() => logout()}>
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <ImageUpload onImageUpload={handleImageUpload} isLoading={isLoading} />
          <TagManager
            tags={tags}
            onAddTag={handleAddTag}
            onRemoveTag={handleRemoveTag}
          />
        </div>
        <ExtractedText 
          text={extractedText} 
          patterns={patterns}
          isLoading={isLoading} 
        />
      </div>
    </div>
  );
}
