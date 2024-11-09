import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, Image as ImageIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface ImageUploadProps {
  onImageUpload: (file: File) => Promise<void>;
  isLoading: boolean;
}

export function ImageUpload({ onImageUpload, isLoading }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
        await onImageUpload(file);
      }
    },
    [onImageUpload]
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
    </Card>
  );
}
