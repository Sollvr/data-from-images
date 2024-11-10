import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, insertUserSchema, type User as SelectUser } from "db/schema";
import { db } from "db";
import { eq } from "drizzle-orm";
import { generateVerificationToken, sendVerificationEmail } from "./email";

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

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

export function setupAuth(app: Express) {
  console.log("Setting up authentication...");

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

  // Local Strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log("Attempting local strategy authentication...");
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);

        if (!user) {
          console.log("User not found:", username);
          return done(null, false, { message: "Incorrect username or password." });
        }

        const isMatch = await crypto.compare(password, user.password);
        if (!isMatch) {
          console.log("Password mismatch for user:", username);
          return done(null, false, { message: "Incorrect username or password." });
        }

        // Check if email is verified for non-Google users
        if (!user.metadata?.googleId && !user.email_verified) {
          console.log("Unverified email for user:", username);
          return done(null, false, {
            message: "Please verify your email address before logging in.",
            needsVerification: true,
            email: username
          });
        }

        console.log("Local authentication successful for user:", username);
        return done(null, user);
      } catch (err) {
        console.error("Error in local strategy:", err);
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => {
    console.log("Serializing user:", user.id);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log("Deserializing user:", id);
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      done(null, user);
    } catch (err) {
      console.error("Error deserializing user:", err);
      done(err);
    }
  });

  // Email verification route
  app.get("/verify-email", async (req, res) => {
    const { token } = req.query;

    if (!token || typeof token !== "string") {
      return res.status(400).json({ message: "Invalid verification token" });
    }

    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.verification_token, token))
        .limit(1);

      if (!user) {
        return res.status(400).json({ message: "Invalid verification token" });
      }

      if (user.verification_expires && new Date(user.verification_expires) < new Date()) {
        return res.status(400).json({ message: "Verification token has expired" });
      }

      await db
        .update(users)
        .set({
          email_verified: true,
          verification_token: null,
          verification_expires: null,
        })
        .where(eq(users.id, user.id));

      // Redirect to login page with success message
      res.redirect("/auth?verified=true");
    } catch (error) {
      console.error("Error verifying email:", error);
      res.status(500).json({ message: "Failed to verify email" });
    }
  });

  // Resend verification email route
  app.post("/resend-verification", async (req, res) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, email))
        .limit(1);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.email_verified) {
        return res.status(400).json({ message: "Email is already verified" });
      }

      const verificationToken = await generateVerificationToken();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      await db
        .update(users)
        .set({
          verification_token: verificationToken,
          verification_expires: expiresAt,
        })
        .where(eq(users.id, user.id));

      await sendVerificationEmail(email, verificationToken);

      res.json({ message: "Verification email sent" });
    } catch (error) {
      console.error("Error resending verification email:", error);
      res.status(500).json({ message: "Failed to resend verification email" });
    }
  });

  // Login route with enhanced error handling
  app.post("/login", (req, res, next) => {
    console.log("Processing login request...");
    const result = insertUserSchema.safeParse(req.body);
    if (!result.success) {
      console.log("Invalid login input:", result.error.flatten());
      return res
        .status(400)
        .json({ message: "Invalid input", errors: result.error.flatten() });
    }

    passport.authenticate("local", (err: any, user: Express.User, info: IVerifyOptions & { needsVerification?: boolean; email?: string }) => {
      if (err) {
        console.error("Login error:", err);
        return next(err);
      }
      if (!user) {
        console.log("Login failed:", info.message);
        return res.status(400).json({
          message: info.message,
          needsVerification: info.needsVerification,
          email: info.email
        });
      }
      req.logIn(user, (err) => {
        if (err) {
          console.error("Error logging in:", err);
          return next(err);
        }
        console.log("Login successful:", user.username);
        return res.json({
          message: "Login successful",
          user: { id: user.id, username: user.username },
        });
      });
    })(req, res, next);
  });

  // Other routes remain the same...
  console.log("Authentication setup complete");
}
