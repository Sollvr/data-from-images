import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { createServer } from "http";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Configure production URL and proxy settings
const PORT = process.env.PORT || 5000;
const PROD_URL = process.env.REPL_SLUG ? 
  `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : 
  `http://localhost:${PORT}`;

console.log('Starting server with configuration:', {
  environment: app.get('env'),
  port: PORT,
  productionUrl: PROD_URL
});

(async () => {
  // Set trust proxy for production
  if (app.get('env') === 'production') {
    app.set('trust proxy', 1);
    console.log('Trust proxy enabled for production');
  }

  registerRoutes(app);
  const server = createServer(app);

  // Enhanced error handling
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Server error:', err);
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Setup vite in development and static serving in production
  if (app.get("env") === "development") {
    console.log('Setting up Vite development server');
    await setupVite(app, server);
  } else {
    console.log('Setting up static file serving for production');
    serveStatic(app);
  }

  server.listen(PORT, "0.0.0.0", () => {
    const formattedTime = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

    console.log(`${formattedTime} [express] Server running at ${PROD_URL}`);
  });
})();
