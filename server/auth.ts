import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, verification_tokens, insertUserSchema, type User as SelectUser } from "db/schema";
import { db } from "db";
import { eq, and } from "drizzle-orm";
import { generateVerificationToken, sendVerificationEmail } from "./email";
import { RateLimiterMemory } from "rate-limiter-flexible";

// Check for VITE_API_URL environment variable
if (!process.env.VITE_API_URL) {
  console.warn('VITE_API_URL not set, using default localhost:5000');
}

const scryptAsync = promisify(scrypt);
const crypto = {
  hash: async (password: string) => {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  },
  compare: async (suppliedPassword: string, storedPassword: string) => {
    const [hashedPassword, salt] = storedPassword.split(".");
    const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
    const suppliedPasswordBuf = (await scryptAsync(
      suppliedPassword,
      salt,
      64
    )) as Buffer;
    return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
  },
};

// Rate limiter for email verification
const verificationLimiter = new RateLimiterMemory({
  points: 3, // 3 attempts
  duration: 60 * 60, // per hour
});

// extend express user object with our schema
declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

export function setupAuth(app: Express) {
  const MemoryStore = createMemoryStore(session);
  const sessionSettings: session.SessionOptions = {
    secret: process.env.REPL_ID || "porygon-supremacy",
    resave: false,
    saveUninitialized: false,
    cookie: {},
    store: new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    }),
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
    sessionSettings.cookie = {
      secure: true,
    };
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);

        if (!user) {
          return done(null, false, { message: "Incorrect username." });
        }
        const isMatch = await crypto.compare(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: "Incorrect password." });
        }
        
        if (!user.email_verified) {
          return done(null, false, { message: "Please verify your email address first." });
        }
        
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  app.post("/register", async (req, res, next) => {
    try {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res
          .status(400)
          .json({ message: "Invalid input", errors: result.error.flatten() });
      }

      const { username, password, email } = result.data;

      // Check if user already exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Hash the password
      const hashedPassword = await crypto.hash(password);

      // Create the new user
      const [newUser] = await db
        .insert(users)
        .values({
          username,
          password: hashedPassword,
          email,
          email_verified: false,
        })
        .returning();

      // Generate and store verification token
      const token = await generateVerificationToken();
      const expires = new Date();
      expires.setHours(expires.getHours() + 24); // Token expires in 24 hours

      await db.insert(verification_tokens).values({
        user_id: newUser.id,
        token,
        expires_at: expires,
      });

      // Send verification email
      await sendVerificationEmail(email, token);

      return res.json({
        message: "Registration successful. Please check your email to verify your account.",
        user: { id: newUser.id, username: newUser.username },
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/verify-email", async (req, res) => {
    try {
      const { token } = req.query;

      if (!token || typeof token !== "string") {
        return res.status(400).json({ message: "Invalid verification token" });
      }

      // Rate limiting
      try {
        await verificationLimiter.consume(token);
      } catch (error) {
        return res.status(429).json({ message: "Too many verification attempts. Please try again later." });
      }

      // Find and validate token
      const [verificationToken] = await db
        .select()
        .from(verification_tokens)
        .where(eq(verification_tokens.token, token))
        .limit(1);

      if (!verificationToken) {
        return res.status(400).json({ message: "Invalid verification token" });
      }

      if (new Date() > new Date(verificationToken.expires_at)) {
        await db
          .delete(verification_tokens)
          .where(eq(verification_tokens.id, verificationToken.id));
        return res.status(400).json({ message: "Verification token has expired" });
      }

      // Update user and cleanup
      await db
        .update(users)
        .set({ email_verified: true })
        .where(eq(users.id, verificationToken.user_id));

      await db
        .delete(verification_tokens)
        .where(eq(verification_tokens.id, verificationToken.id));

      return res.json({ message: "Email verified successfully. You can now log in." });
    } catch (error) {
      console.error("Email verification error:", error);
      return res.status(500).json({ message: "Failed to verify email" });
    }
  });

  app.post("/login", (req, res, next) => {
    const result = insertUserSchema.safeParse(req.body);
    if (!result.success) {
      return res
        .status(400)
        .json({ message: "Invalid input", errors: result.error.flatten() });
    }

    const cb = (err: any, user: Express.User, info: IVerifyOptions) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(400).json({
          message: info.message ?? "Login failed",
        });
      }
      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }
        return res.json({
          message: "Login successful",
          user: { id: user.id, username: user.username },
        });
      });
    };
    passport.authenticate("local", cb)(req, res, next);
  });

  app.post("/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logout successful" });
    });
  });

  app.get("/api/user", (req, res) => {
    if (req.isAuthenticated()) {
      return res.json(req.user);
    }
    res.status(401).json({ message: "Unauthorized" });
  });
}