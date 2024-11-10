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

  // Verify required environment variables
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.error("Missing required Google OAuth credentials");
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set");
  }

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
          return done(null, false, { message: "Incorrect username." });
        }

        // Check if email is verified for non-Google users
        if (!user.metadata?.googleId && !user.email_verified) {
          return done(null, false, { message: "Please verify your email first." });
        }

        const isMatch = await crypto.compare(password, user.password);
        if (!isMatch) {
          console.log("Password mismatch for user:", username);
          return done(null, false, { message: "Incorrect password." });
        }
        console.log("Local authentication successful for user:", username);
        return done(null, user);
      } catch (err) {
        console.error("Error in local strategy:", err);
        return done(err);
      }
    })
  );

  // [Previous Google Strategy code remains the same]

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

  // Update registration route to include email verification
  app.post("/register", async (req, res, next) => {
    try {
      console.log("Processing registration request...");
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        console.log("Invalid registration input:", result.error.flatten());
        return res
          .status(400)
          .json({ message: "Invalid input", errors: result.error.flatten() });
      }

      const { username, password } = result.data;

      // Check if user already exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUser) {
        console.log("Username already exists:", username);
        return res.status(400).json({ message: "Username already exists" });
      }

      // Generate verification token
      const verificationToken = await generateVerificationToken();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      // Hash the password
      const hashedPassword = await crypto.hash(password);

      // Create the new user
      const [newUser] = await db
        .insert(users)
        .values({
          username,
          password: hashedPassword,
          verification_token: verificationToken,
          verification_expires: expiresAt,
          email_verified: false,
        })
        .returning();

      // Send verification email
      await sendVerificationEmail(username, verificationToken);

      console.log("New user registered:", username);
      res.json({
        message: "Registration successful. Please check your email to verify your account.",
        user: { id: newUser.id, username: newUser.username },
      });
    } catch (error) {
      console.error("Error during registration:", error);
      next(error);
    }
  });

  // [Rest of the code remains the same]

  console.log("Authentication setup complete");
}
