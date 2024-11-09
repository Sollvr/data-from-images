import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { Card } from "@/components/ui/card";

interface TagManagerProps {
  tags: string[];
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
}

export function TagManager({ tags, onAddTag, onRemoveTag }: TagManagerProps) {
  const [newTag, setNewTag] = useState("");

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      onAddTag(newTag.trim());
      setNewTag("");
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Add a tag..."
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleAddTag()}
          />
          <Button onClick={handleAddTag}>
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="flex items-center gap-1"
            >
              {tag}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => onRemoveTag(tag)}
              />
            </Badge>
          ))}
        </div>
      </div>
    </Card>
  );
}
