import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { createServer } from "http";
import morgan from "morgan";
import helmet from "helmet";
import compression from "compression";
import cors from "cors";
import path from "path";
import rateLimit from "express-rate-limit";
import winston from "winston";

// Configure Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

const app = express();

// Basic middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// Timeout middleware
const timeout = (req: Request, res: Response, next: NextFunction) => {
  res.setTimeout(30000, () => {
    res.status(408).json({ message: 'Request timeout' });
  });
  next();
};
app.use(timeout);

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? ['https://snapextract-app.numaanmkcloud.repl.co']
    : ['http://localhost:5000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // 24 hours
};
app.use(cors(corsOptions));

// Security middleware with proper CSP for production
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: [
        "'self'",
        "https://api.openai.com",
        process.env.NODE_ENV === 'production'
          ? 'https://snapextract-app.numaanmkcloud.repl.co'
          : 'http://localhost:5000',
        'ws://localhost:*',
        'wss://snapextract-app.numaanmkcloud.repl.co'
      ],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: process.env.NODE_ENV === 'production',
  crossOriginOpenerPolicy: { policy: process.env.NODE_ENV === 'production' ? 'same-origin' : 'unsafe-none' },
  crossOriginResourcePolicy: { policy: process.env.NODE_ENV === 'production' ? 'same-origin' : 'cross-origin' },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
}));

// Rate limiting for API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to API routes only
app.use('/api/', apiLimiter);

(async () => {
  if (app.get("env") === "development") {
    // Development setup with Vite
    await setupVite(app, createServer(app));
  } else {
    // Production setup
    app.set('trust proxy', 1);
    
    // Serve static files with proper caching
    app.use(express.static(path.join(__dirname, '../dist'), {
      maxAge: '1y',
      etag: true,
      index: false // Don't serve index.html automatically
    }));
  }

  // Set up API routes
  registerRoutes(app);

  // Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    logger.error('Error:', {
      message: err.message,
      stack: err.stack,
      status: err.status || err.statusCode || 500
    });

    const status = err.status || err.statusCode || 500;
    const message = process.env.NODE_ENV === 'production'
      ? 'Internal Server Error'
      : err.message || 'Internal Server Error';

    res.status(status).json({ message });
  });

  // SPA handler - should be last
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      next();
    } else {
      res.sendFile(path.join(__dirname, '../dist/index.html'));
    }
  });

  const PORT = process.env.PORT || 5000;
  const server = createServer(app);
  
  server.listen(PORT, () => {
    const formattedTime = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

    logger.info(`Server running in ${app.get('env')} mode on port ${PORT} at ${formattedTime}`);
  });
})();

// Global error handling
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', {
    message: error.message,
    stack: error.stack
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', {
    reason,
    promise
  });
});
