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

  // Google Strategy
  const callbackURL = process.env.REPLIT_SLUG 
    ? `https://${process.env.REPLIT_SLUG}.${process.env.REPLIT_OWNER}.repl.co/auth/google/callback`
    : 'http://localhost:5000/auth/google/callback';

  console.log('Configured Google OAuth callback URL:', callbackURL);

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL,
        scope: ["email", "profile"],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          console.log("Processing Google authentication callback...");
          if (!profile.emails || profile.emails.length === 0) {
            console.error("No email provided in Google profile");
            return done(new Error("No email provided by Google"));
          }

          const userEmail = profile.emails[0].value;
          console.log("Authenticating Google user:", userEmail);

          // Check if user exists
          const [existingUser] = await db
            .select()
            .from(users)
            .where(eq(users.username, userEmail))
            .limit(1);

          if (existingUser) {
            console.log("Existing user found:", existingUser.username);
            return done(null, existingUser);
          }

          console.log("Creating new user from Google profile...");
          // Create new user
          const [newUser] = await db
            .insert(users)
            .values({
              username: userEmail,
              password: await crypto.hash(randomBytes(32).toString("hex")),
              metadata: {
                googleId: profile.id,
                name: profile.displayName,
                email: userEmail,
              },
            })
            .returning();

          console.log("New user created:", newUser.username);
          return done(null, newUser);
        } catch (error) {
          console.error("Error in Google strategy:", error);
          return done(error as Error);
        }
      }
    )
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

  // Google Auth Routes
  app.get("/auth/google", (req, res, next) => {
    console.log("Starting Google authentication...");
    passport.authenticate("google", {
      scope: ["email", "profile"]
    })(req, res, next);
  });

  app.get(
    "/auth/google/callback",
    (req, res, next) => {
      console.log("Received Google callback...");
      passport.authenticate("google", {
        successRedirect: "/app",
        failureRedirect: "/auth?error=google-auth-failed",
      })(req, res, next);
    }
  );

  // Local Auth Routes
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

      // Hash the password
      const hashedPassword = await crypto.hash(password);

      // Create the new user
      const [newUser] = await db
        .insert(users)
        .values({
          username,
          password: hashedPassword,
        })
        .returning();

      console.log("New user registered:", username);
      // Log the user in after registration
      req.login(newUser, (err) => {
        if (err) {
          return next(err);
        }
        return res.json({
          message: "Registration successful",
          user: { id: newUser.id, username: newUser.username },
        });
      });
    } catch (error) {
      console.error("Error during registration:", error);
      next(error);
    }
  });

  app.post("/login", (req, res, next) => {
    console.log("Processing login request...");
    const result = insertUserSchema.safeParse(req.body);
    if (!result.success) {
      console.log("Invalid login input:", result.error.flatten());
      return res
        .status(400)
        .json({ message: "Invalid input", errors: result.error.flatten() });
    }

    const cb = (err: any, user: Express.User, info: IVerifyOptions) => {
      if (err) {
        console.error("Login error:", err);
        return next(err);
      }
      if (!user) {
        console.log("Login failed:", info.message);
        return res.status(400).json({
          message: info.message ?? "Login failed",
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
    };
    passport.authenticate("local", cb)(req, res, next);
  });

  app.post("/logout", (req, res) => {
    console.log("Processing logout request...");
    req.logout((err) => {
      if (err) {
        console.error("Error logging out:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      console.log("Logout successful");
      res.json({ message: "Logout successful" });
    });
  });

  app.get("/api/user", (req, res) => {
    console.log("Checking user authentication status...");
    if (req.isAuthenticated()) {
      console.log("User is authenticated:", req.user.username);
      return res.json(req.user);
    }
    console.log("User is not authenticated");
    res.status(401).json({ message: "Unauthorized" });
  });

  console.log("Authentication setup complete");
}
