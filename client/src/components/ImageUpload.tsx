import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, Image as ImageIcon, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ImageUploadProps {
  onImageUpload: (files: File[], requirements?: string) => Promise<void>;
  isLoading: boolean;
  progress?: number;
}

export function ImageUpload({ onImageUpload, isLoading, progress }: ImageUploadProps) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [requirements, setRequirements] = useState("");

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const newPreviews = await Promise.all(
          acceptedFiles.map((file) => {
            return new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                resolve(reader.result as string);
              };
              reader.readAsDataURL(file);
            });
          })
        );
        setPreviews(newPreviews);
        await onImageUpload(acceptedFiles, requirements);
      }
    },
    [onImageUpload, requirements]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif"],
    },
    multiple: true,
    disabled: isLoading,
  });

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          Upload Images
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Upload multiple images and specify what information you want to extract</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </h3>
      </div>

      <div className="mb-4">
        <Textarea
          placeholder="Specify what information you want to extract from the images (e.g., 'Extract all dates and amounts from these receipts')"
          value={requirements}
          onChange={(e) => setRequirements(e.target.value)}
          className="min-h-[80px]"
        />
      </div>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center ${
          isDragActive ? "border-primary bg-secondary/50" : "border-border"
        }`}
      >
        <input {...getInputProps()} />
        {previews.length > 0 ? (
          <div className="relative">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {previews.map((preview, index) => (
                <img
                  key={index}
                  src={preview}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg"
                />
              ))}
            </div>
            <Button
              variant="secondary"
              className="mt-4"
              onClick={(e) => {
                e.stopPropagation();
                setPreviews([]);
              }}
            >
              Choose Different Images
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-center">
              {isLoading ? (
                <div className="w-full max-w-xs space-y-2">
                  <Progress value={progress} className="w-full" />
                  <p className="text-sm text-muted-foreground">
                    Processing images... {progress}%
                  </p>
                </div>
              ) : (
                <Upload className="h-12 w-12 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="text-lg font-medium">
                Drop your images here or click to upload
              </p>
              <p className="text-sm text-muted-foreground">
                Supports multiple files: PNG, JPG, JPEG, GIF
              </p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
