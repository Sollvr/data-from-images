import type { Express } from "express";
import multer from "multer";
import { analyzeImage } from "./openai";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
  },
});

export function registerRoutes(app: Express) {
  // Modify extract endpoint to not require authentication
  app.post("/api/extract", upload.array("images", 10), async (req, res) => {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ message: "No image files provided" });
    }

    try {
      const requirements = req.body.requirements;
      const results: {
        text: string;
        patterns: {
          dates?: string[];
          amounts?: string[];
          emails?: string[];
          phoneNumbers?: string[];
          addresses?: string[];
          identifiers?: string[];
        };
        filename: string;
      }[] = [];
      
      for (const file of req.files) {
        const base64Image = file.buffer.toString("base64");
        const extractedData = await analyzeImage(base64Image, requirements);
        
        results.push({
          text: extractedData.text,
          patterns: extractedData.patterns,
          filename: file.originalname,
        });
      }

      return res.json({ results });
    } catch (error) {
      console.error("Error extracting text:", error);
      return res
        .status(500)
        .json({ message: "Failed to extract text from images" });
    }
  });
}
