import express, { type Express } from "express";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { type Server } from "http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function setupVite(app: Express, server: Server) {
  const vite = await createViteServer({
    server: {
      middlewareMode: true,
      hmr: { server },
    },
    clearScreen: false,
    appType: "custom",
  });

  app.use(vite.middlewares);
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(process.cwd(), "./client/dist");
  console.log('Static files path:', distPath);

  if (!fs.existsSync(distPath)) {
    console.error(`Build directory not found: ${distPath}`);
    console.log('Directory contents:', fs.readdirSync(process.cwd()));
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  app.get('/*', (req, res) => {
    console.log('Serving index.html for path:', req.path);
    res.sendFile(path.join(distPath, 'index.html'));
  });
}
