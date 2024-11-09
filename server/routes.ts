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
    fileSize: 5 * 1024 * 1024, // 5MB per file
  },
});

export function registerRoutes(app: Express) {
  setupAuth(app);

  // Extract text from multiple images with pattern recognition
  app.post("/api/extract", upload.array("images", 10), async (req, res) => {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ message: "No image files provided" });
    }

    try {
      const requirements = req.body.requirements;
      const results = [];
      
      // Process images sequentially to avoid rate limiting
      for (const file of req.files) {
        const base64Image = file.buffer.toString("base64");
        const extractedData = await analyzeImage(base64Image, requirements);
        
        let extraction = null;
        if (req.user) {
          // Save extraction if user is authenticated
          const [saved] = await db
            .insert(extractions)
            .values({
              user_id: req.user.id,
              image_url: "", // Store image URL if needed
              extracted_text: extractedData.text,
              metadata: {
                filename: file.originalname,
                requirements: requirements,
                patterns: extractedData.patterns,
              },
            })
            .returning();
          extraction = saved;
        }

        results.push({
          text: extractedData.text,
          patterns: extractedData.patterns,
          extraction,
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
