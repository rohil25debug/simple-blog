
import dotenv from "dotenv";

dotenv.config();

import passport from "passport";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import path from "node:path";

import pool from "./db/db.js";
import authRoutes from "./routes/Auth.js";
import postRoutes from "./routes/posts.js";

// =========================
// APP CONFIGURATION
// =========================
const app = express();
const PgSession = connectPgSimple(session);

app.disable("x-powered-by"); // http response by express [(x-powered-by) control the header].

// =========================
// SECURITY
// =========================
app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  })
);


const allowedOrigins = [
  "http://localhost:5173",
  "https://simple-blog-e3qf.onrender.com",
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);


// =========================
// REQUEST BODY PARSING
// =========================
app.use(express.json({ limit: "100kb" }));

// =========================
// STATIC IMAGE UPLOADS
// =========================
app.use(
  "/uploads",
  express.static(path.join(process.cwd(), "public", "uploads"))
);

// =========================
// SESSION CONFIGURATION
// =========================
if (!process.env.SESSION_SECRET) {
  throw new Error(
    "SESSION_SECRET is required in the server/.env file."
  );
}

app.use(
  session({
    name: "blog.sid",

    store: new PgSession({
      pool,
      tableName: "session",
      createTableIfMissing: true
    }),

    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,

    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24
    }
  })
);

// =========================
// PASSPORT INITIALIZATION
// Required for Google OAuth
// =========================
app.use(passport.initialize());

// =========================
// API HEALTH CHECK
// =========================
app.get("/", (req, res) => {
  res.json({
    message: "Simple Blog API is running."
  });
});

// =========================
// AUTHENTICATION ROUTES
// =========================
app.use("/api/auth", authRoutes);

// Available endpoints:
// POST /api/auth/register
// POST /api/auth/login
// GET  /api/auth/google
// GET  /api/auth/google/callback
// GET  /api/auth/me
// POST /api/auth/logout
// POST /api/auth/forgot-password
// POST /api/auth/reset-password

// =========================
// BLOG POST ROUTES
// =========================
app.use("/api/posts", postRoutes);

// =========================
// UNKNOWN ROUTES
// =========================
app.use((req, res) => {
  res.status(404).json({
    message: "Route not found."
  });
});

// =========================
// ERROR HANDLER
// =========================
app.use((error, req, res, next) => {
  console.error("Server error:", error);

  if (res.headersSent) {
    return next(error);
  }

  res.status(500).json({
    message: "An unexpected server error occurred."
  });
});

// =========================
// START SERVER
// =========================
const port = Number(process.env.PORT) || 5001;

app.listen(port, () => {
  console.log(
    `Simple Blog API running on http://localhost:${port}`
  );
});
