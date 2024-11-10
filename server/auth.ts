import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, insertUserSchema } from "../db/schema";
import { db } from "../db";
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

interface ExtendedVerifyOptions extends IVerifyOptions {
  needsVerification?: boolean;
  email?: string;
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

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.username, username.toLowerCase()))
          .limit(1);

        if (!user) {
          return done(null, false, { message: "Incorrect email or password." });
        }

        const isMatch = await crypto.compare(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: "Incorrect email or password." });
        }

        if (!user.email_verified) {
          return done(null, false, {
            message: "Please verify your email before logging in.",
            needsVerification: true,
            email: username,
          } as ExtendedVerifyOptions);
        }

        return done(null, user);
      } catch (err) {
        console.error("Error in local strategy:", err);
        return done(err);
      }
    })
  );

  passport.serializeUser((user: any, done) => {
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
      console.error("Error deserializing user:", err);
      done(err);
    }
  });

  // Registration route with email-only initial step and duplicate handling
  app.post("/register", async (req, res) => {
    console.log("Processing registration request...");
    const { username } = req.body;
    
    if (!username || typeof username !== "string" || !username.includes("@")) {
      return res
        .status(400)
        .json({ message: "Invalid email address" });
    }

    try {
      // Check if user already exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, username.toLowerCase()))
        .limit(1);

      if (existingUser) {
        if (!existingUser.email_verified) {
          // If user exists but not verified, resend verification email
          const verificationToken = await generateVerificationToken();
          const expiresAt = new Date();
          expiresAt.setHours(expiresAt.getHours() + 24);

          await db
            .update(users)
            .set({
              verification_token: verificationToken,
              verification_expires: expiresAt,
            })
            .where(eq(users.id, existingUser.id));

          await sendVerificationEmail(username, verificationToken);

          return res.status(200).json({
            message: "Verification email resent. Please check your inbox.",
            user: { id: existingUser.id, username: existingUser.username },
          });
        }
        return res.status(400).json({ message: "Email address already registered" });
      }

      // Create new user
      const verificationToken = await generateVerificationToken();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const [user] = await db
        .insert(users)
        .values({
          username: username.toLowerCase(),
          password: await crypto.hash(verificationToken), // Temporary password
          verification_token: verificationToken,
          verification_expires: expiresAt,
          email_verified: false,
        })
        .returning();

      await sendVerificationEmail(username, verificationToken);

      res.status(201).json({
        message: "Registration initiated. Please check your email to verify your account.",
        user: { id: user.id, username: user.username },
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Failed to register user" });
    }
  });

  // Complete registration endpoint
  app.post("/complete-registration", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, email.toLowerCase()))
        .limit(1);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!user.email_verified) {
        return res.status(400).json({ message: "Email not verified" });
      }

      await db
        .update(users)
        .set({
          password: await crypto.hash(password),
          verification_token: null,
          verification_expires: null,
        })
        .where(eq(users.id, user.id));

      res.json({ message: "Registration completed successfully" });
    } catch (error) {
      console.error("Error completing registration:", error);
      res.status(500).json({ message: "Failed to complete registration" });
    }
  });

  // Email verification endpoint
  app.get("/verify-email", async (req, res) => {
    console.log("Processing email verification request...");
    const { token } = req.query;

    if (!token || typeof token !== "string") {
      return res.redirect("/auth?error=" + encodeURIComponent("Invalid verification token"));
    }

    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.verification_token, token))
        .limit(1);

      if (!user) {
        return res.redirect("/auth?error=" + encodeURIComponent("Invalid verification token"));
      }

      if (user.verification_expires && new Date(user.verification_expires) < new Date()) {
        return res.redirect("/auth?error=" + encodeURIComponent("Verification token has expired"));
      }

      await db
        .update(users)
        .set({
          email_verified: true,
        })
        .where(eq(users.id, user.id));

      res.redirect(`/complete-registration?email=${encodeURIComponent(user.username)}`);
    } catch (error) {
      console.error("Error during email verification:", error);
      res.redirect("/auth?error=" + encodeURIComponent("Failed to verify email"));
    }
  });

  // Resend verification endpoint
  app.post("/resend-verification", async (req, res) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, email.toLowerCase()))
        .limit(1);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
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

      res.json({ message: "Verification email sent successfully" });
    } catch (error) {
      console.error("Error resending verification:", error);
      res.status(500).json({ message: "Failed to resend verification email" });
    }
  });

  console.log("Authentication setup complete");
}
