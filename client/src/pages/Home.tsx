import { useState } from "react";
import { useUser } from "@/hooks/use-user";
import { ImageUpload } from "@/components/ImageUpload";
import { ExtractedText } from "@/components/ExtractedText";
import { TagManager } from "@/components/TagManager";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function Home() {
  const { user, logout } = useUser();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [extractedText, setExtractedText] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleImageUpload = async (file: File) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to extract text");

      const data = await response.json();
      setExtractedText(data.text);
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
        <ExtractedText text={extractedText} isLoading={isLoading} />
      </div>
    </div>
  );
}
