import type { Express } from "express";
import multer from "multer";
import { setupAuth } from "./auth";
import { db } from "db";
import { extractions, tags } from "db/schema";
import { analyzeImage } from "./openai";
import { eq } from "drizzle-orm";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

export function registerRoutes(app: Express) {
  setupAuth(app);

  // Extract text from image
  app.post("/api/extract", upload.single("image"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }

    try {
      const base64Image = req.file.buffer.toString("base64");
      const extractedText = await analyzeImage(base64Image);

      if (req.user) {
        // Save extraction if user is authenticated
        const [extraction] = await db
          .insert(extractions)
          .values({
            user_id: req.user.id,
            image_url: "", // Store image URL if needed
            extracted_text: extractedText,
            metadata: { filename: req.file.originalname },
          })
          .returning();

        return res.json({ text: extractedText, extraction });
      }

      return res.json({ text: extractedText });
    } catch (error) {
      console.error("Error extracting text:", error);
      return res
        .status(500)
        .json({ message: "Failed to extract text from image" });
    }
  });

  // Get user's extractions
  app.get("/api/extractions", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const userExtractions = await db
        .select()
        .from(extractions)
        .where(eq(extractions.user_id, req.user.id))
        .orderBy(extractions.created_at);

      res.json(userExtractions);
    } catch (error) {
      console.error("Error fetching extractions:", error);
      res.status(500).json({ message: "Failed to fetch extractions" });
    }
  });

  // Add tag to extraction
  app.post("/api/extractions/:id/tags", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const { name } = req.body;

    try {
      const [tag] = await db
        .insert(tags)
        .values({
          user_id: req.user.id,
          extraction_id: parseInt(id),
          name,
        })
        .returning();

      res.json(tag);
    } catch (error) {
      console.error("Error adding tag:", error);
      res.status(500).json({ message: "Failed to add tag" });
    }
  });
}
