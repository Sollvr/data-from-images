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
  onImageUpload: (file: File, requirements?: string) => Promise<void>;
  isLoading: boolean;
}

export function ImageUpload({ onImageUpload, isLoading }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [requirements, setRequirements] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleExtract = async () => {
    if (selectedFile) {
      await onImageUpload(selectedFile, requirements);
    }
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
        setSelectedFile(file);
      }
    },
    []
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif"],
    },
    maxFiles: 1,
    disabled: isLoading,
  });

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          Upload Image
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Upload an image and specify what information to extract. Click 'Extract Text' when ready.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </h3>
      </div>

      <div className="mb-4">
        <Textarea
          placeholder="Specify what information you want to extract from the image (e.g., 'Extract all dates and amounts from this receipt')"
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
        {preview ? (
          <div className="relative">
            <img
              src={preview}
              alt="Preview"
              className="max-h-64 mx-auto rounded-lg"
            />
            <Button
              variant="secondary"
              className="mt-4"
              onClick={(e) => {
                e.stopPropagation();
                setPreview(null);
                setSelectedFile(null);
              }}
            >
              Choose Another Image
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-center">
              {isLoading ? (
                <Progress value={30} className="w-1/2" />
              ) : (
                <Upload className="h-12 w-12 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="text-lg font-medium">
                Drop your image here or click to upload
              </p>
              <p className="text-sm text-muted-foreground">
                Supports PNG, JPG, JPEG, GIF
              </p>
            </div>
          </div>
        )}
      </div>

      {selectedFile && !isLoading && (
        <Button
          className="w-full mt-4"
          onClick={(e) => {
            e.preventDefault();
            handleExtract();
          }}
        >
          <ImageIcon className="h-4 w-4 mr-2" />
          Extract Text
        </Button>
      )}
    </Card>
  );
}
