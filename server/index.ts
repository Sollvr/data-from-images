import 'dotenv/config';
import express from "express";
import type { Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic } from "./vite.js";
import { createServer } from "http";
import cors from 'cors';
import type { CorsOptions } from 'cors';
import path from 'path';

const app = express();

const corsOptions: CorsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? ['https://data-from-images-production.up.railway.app']
    : ['http://localhost:3000'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

(async () => {
  if (process.env.NODE_ENV === 'production') {
    serveStatic(app);
  }

  registerRoutes(app);
  const server = createServer(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Server error:', err);
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === 'development') {
    await setupVite(app, server);
  }

  const PORT = parseInt(process.env.PORT || '5000', 10);
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Static files directory:', path.resolve(process.cwd(), "client/dist"));
  });
})();
