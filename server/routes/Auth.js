
import "dotenv/config";
import express from "express";
import bcrypt from "bcryptjs";
import pool from "../db/db.js";
import crypto from "node:crypto";
import nodemailer from "nodemailer";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

const router = express.Router();

const frontendUrl = (
  process.env.FRONTEND_URL || "http://localhost:5173"
).replace(/\/+$/, "");

const cookieName = "blog.sid";

// =========================
// EMAIL CONFIGURATION
// =========================


// =========================
// EMAIL CONFIGURATION
// =========================

const emailUser = process.env.EMAIL_USER?.trim();

const emailPass = process.env.EMAIL_PASS?.replace(/\s+/g, "");

const emailConfigured = Boolean(emailUser && emailPass);

// Safe diagnostics: never print the actual password.
console.log("EMAIL CONFIGURATION STATUS:", {
  emailUserExists: Boolean(emailUser),
  emailPassExists: Boolean(emailPass),
  emailConfigured,
});

const transporter = emailConfigured
  ? nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    })
  : null;


// =========================
// HELPERS
// =========================

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    picture: user.picture || null,
  };
}

function saveSession(req, res, next, user, successMessage) {
  req.session.regenerate((error) => {
    if (error) {
      return next(error);
    }

    // Store only the information needed by the frontend.
    req.session.user = publicUser(user);

    req.session.save((saveError) => {
      if (saveError) {
        return next(saveError);
      }

      return res.status(200).json({
        message: successMessage,
        user: req.session.user,
      });
    });
  });
}

function redirectToLoginWithError(res) {
  return res.redirect(
    `${frontendUrl}/?authError=google`
  );
}

// =========================
// GOOGLE OAUTH CONFIGURATION
// =========================


const googleCallbackURL =
  process.env.GOOGLE_CALLBACK_URL ||
  (process.env.RENDER_EXTERNAL_URL
    ? `${process.env.RENDER_EXTERNAL_URL.replace(/\/+$/, "")}/api/auth/google/callback`
    : "http://localhost:5001/api/auth/google/callback");

const googleOAuthConfigured = Boolean(
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET
);


if (googleOAuthConfigured) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
clientSecret: process.env.GOOGLE_CLIENT_SECRET,
callbackURL: googleCallbackURL,
      },

      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value
            ?.trim()
            .toLowerCase();

          const emailVerified =
            profile._json?.email_verified === true;

          const picture = profile.photos?.[0]?.value || null;

          if (!email || !emailVerified) {
            return done(null, false);
          }

          // 1. Check whether this Google account already exists.
          let result = await pool.query(
            `SELECT id, name, email, role, google_id, picture
             FROM users
             WHERE google_id = $1
             LIMIT 1`,
            [profile.id]
          );

          if (result.rows.length > 0) {
            const existingUser = result.rows[0];

            // Refresh the stored Google profile picture.
            if (picture) {
              await pool.query(
                `UPDATE users
                 SET picture = $1
                 WHERE id = $2`,
                [picture, existingUser.id]
              );
            }

            return done(null, {
              ...existingUser,
              picture: picture || existingUser.picture || null,
            });
          }

          // 2. Check whether this verified email already has an account.
          result = await pool.query(
            `SELECT id, name, email, role, google_id, picture
             FROM users
             WHERE LOWER(email) = $1
             LIMIT 1`,
            [email]
          );

          if (result.rows.length > 0) {
            const existingUser = result.rows[0];

            // Do not silently link an account already linked to
            // a different Google account.
            if (
              existingUser.google_id &&
              existingUser.google_id !== profile.id
            ) {
              return done(
                new Error(
                  "This email is linked to another Google account."
                )
              );
            }

            await pool.query(
              `UPDATE users
               SET google_id = $1,
                   picture = COALESCE($2, picture)
               WHERE id = $3`,
              [profile.id, picture, existingUser.id]
            );

            return done(null, {
              ...existingUser,
              google_id: profile.id,
              picture: picture || existingUser.picture || null,
            });
          }

          // 3. Create a new account for this Google user.
          const name = (
            profile.displayName ||
            email.split("@")[0] ||
            "Google User"
          )
            .trim()
            .slice(0, 20);

          result = await pool.query(
            `INSERT INTO users
               (name, email, google_id, role, picture)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, name, email, role, google_id, picture`,
            [name, email, profile.id, "user", picture]
          );

          return done(null, result.rows[0]);
        } catch (error) {
          console.error("Google strategy error:", error);
          return done(error);
        }
      }
    )
  );
} else {
  console.warn(
    "Google OAuth is disabled. Check GOOGLE_CLIENT_ID, " +
      "GOOGLE_CLIENT_SECRET, and GOOGLE_CALLBACK_URL."
  );
}

// =========================
// REGISTER
// POST /api/auth/register
// =========================

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body ?? {};

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !name.trim() ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: "Name, email, and password are required.",
      });
    }

    if (name.trim().length > 20) {
      return res.status(400).json({
        message: "Name must be 20 characters or fewer.",
      });
    }

    if (password.length < 8 || password.length > 20) {
      return res.status(400).json({
        message: "Password must be between 8 and 20 characters.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await pool.query(
      `SELECT id
       FROM users
       WHERE LOWER(email) = $1
       LIMIT 1`,
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, picture`,
      [name.trim(), normalizedEmail, hashedPassword, "user"]
    );

    return res.status(201).json({
      message: "Registration successful! You can now log in.",
      user: publicUser(result.rows[0]),
    });
  } catch (error) {
    console.error("Registration error:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    return res.status(500).json({
      message: "Registration failed. Please try again.",
    });
  }
});

// =========================
// LOGIN
// POST /api/auth/login
// =========================

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const result = await pool.query(
      `SELECT id, name, email, password, role, picture
       FROM users
       WHERE LOWER(email) = $1
       LIMIT 1`,
      [email.trim().toLowerCase()]
    );

    if (
      result.rows.length === 0 ||
      typeof result.rows[0].password !== "string"
    ) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const dbUser = result.rows[0];

    // Passwords must be stored as bcrypt hashes.
    const isBcryptHash =
      /^\$2[aby]\$\d{2}\$/.test(dbUser.password);

    const passwordMatches = isBcryptHash
      ? await bcrypt.compare(password, dbUser.password)
      : false;

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    return saveSession(
      req,
      res,
      next,
      dbUser,
      "Login successful!"
    );
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Login failed. Please try again.",
    });
  }
});

// =========================
// GOOGLE LOGIN
// GET /api/auth/google
// =========================

router.get("/google", (req, res, next) => {
  if (!googleOAuthConfigured) {
    return res.status(503).json({
      message: "Google login is not configured on the server.",
    });
  }

  return passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })(req, res, next);
});

// =========================
// GOOGLE CALLBACK
// GET /api/auth/google/callback
// =========================

router.get("/google/callback", (req, res, next) => {
  if (!googleOAuthConfigured) {
    return redirectToLoginWithError(res);
  }

  passport.authenticate(
    "google",
    { session: false },
    (error, googleUser) => {
      if (error) {
        console.error("Google authentication error:", error.message);
        return redirectToLoginWithError(res);
      }

      if (!googleUser) {
        return redirectToLoginWithError(res);
      }

      req.session.regenerate((sessionError) => {
        if (sessionError) {
          console.error("Google session error:", sessionError);
          return next(sessionError);
        }

        // Include picture so the navbar can show the Google avatar.
        req.session.user = publicUser(googleUser);

        req.session.save((saveError) => {
          if (saveError) {
            console.error("Google session save error:", saveError);
            return next(saveError);
          }

          return res.redirect(`${frontendUrl}/?googleLogin=success`);
        });
      });
    }
  )(req, res, next);
});

// =========================
// CURRENT USER
// GET /api/auth/me
// =========================

router.get("/me", (req, res) => {
  if (!req.session?.user) {
    return res.status(401).json({
      message: "You are not logged in.",
    });
  }

  return res.status(200).json({
    user: {
      ...req.session.user,
      picture: req.session.user.picture || null,
    },
  });
});

// =========================
// LOGOUT
// POST /api/auth/logout
// =========================

router.post("/logout", (req, res, next) => {
  if (!req.session) {
    res.clearCookie(cookieName, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return res.json({
      message: "Logged out successfully.",
    });
  }

  req.session.destroy((error) => {
    if (error) {
      return next(error);
    }

    res.clearCookie(cookieName, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return res.json({
      message: "Logged out successfully.",
    });
  });
});

// =========================
// FORGOT PASSWORD
// POST /api/auth/forgot-password
// =========================

router.post("/forgot-password", async (req, res) => {
  const genericMessage =
    "If an account exists with that email, a password reset link will be sent.";

  try {
    const { email } = req.body ?? {};

    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        message: "Please enter a valid email address.",
      });
    }

    if (!emailConfigured || !transporter) {
  console.error("Forgot password: email credentials are missing.", {
    emailUserExists: Boolean(emailUser),
    emailPassExists: Boolean(emailPass),
  });

  return res.status(503).json({
    message: "Password reset email service is temporarily unavailable.",
  });
}

    const result = await pool.query(
      `SELECT id, email
       FROM users
       WHERE LOWER(email) = $1
       LIMIT 1`,
      [email.trim().toLowerCase()]
    );

    // Avoid revealing whether an account exists.
    if (result.rows.length === 0) {
      return res.status(200).json({
        message: genericMessage,
      });
    }

    const user = result.rows[0];
    const token = crypto.randomBytes(32).toString("hex");

    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    await pool.query(
      `UPDATE users
       SET reset_token = $1,
           reset_token_expire = NOW() + INTERVAL '15 minutes'
       WHERE id = $2`,
      [tokenHash, user.id]
    );

    const resetUrl = new URL(
      "/reset-password",
      `${frontendUrl}/`
    );

    resetUrl.searchParams.set("token", token);

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: "Reset Your Rohil's Blog Password",
        text: `You requested a password reset.

Open this link to create a new password:
${resetUrl.toString()}

This link expires in 15 minutes. If you did not request this, you can ignore this email.`,
      });
    } catch (emailError) {
      await pool.query(
        `UPDATE users
         SET reset_token = NULL,
             reset_token_expire = NULL
         WHERE id = $1
           AND reset_token = $2`,
        [user.id, tokenHash]
      );

      throw emailError;
    }

    return res.status(200).json({
      message: genericMessage,
    });
  } catch (error) {
    console.error("Forgot password error:", error);

    return res.status(500).json({
      message: "Unable to process your request. Please try again.",
    });
  }
});

// =========================
// RESET PASSWORD
// POST /api/auth/reset-password
// =========================

router.post("/reset-password", async (req, res) => {
  let client;
  let transactionStarted = false;

  try {
    const { token, password } = req.body ?? {};

    if (
      typeof token !== "string" ||
      !token ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        message: "Token and new password are required.",
      });
    }

    if (password.length < 8 || password.length > 20) {
      return res.status(400).json({
        message: "Password must be between 8 and 20 characters.",
      });
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    client = await pool.connect();

    await client.query("BEGIN");
    transactionStarted = true;

    const result = await client.query(
      `SELECT id
       FROM users
       WHERE reset_token = $1
         AND reset_token_expire > NOW()
       FOR UPDATE`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(400).json({
        message: "Invalid or expired password reset link.",
      });
    }

    const userId = result.rows[0].id;
    const hashedPassword = await bcrypt.hash(password, 12);

    const updateResult = await client.query(
      `UPDATE users
       SET password = $1,
           reset_token = NULL,
           reset_token_expire = NULL
       WHERE id = $2
         AND reset_token = $3
         AND reset_token_expire > NOW()
       RETURNING id`,
      [hashedPassword, userId, tokenHash]
    );

    if (updateResult.rows.length === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(400).json({
        message: "Invalid or expired password reset link.",
      });
    }

    await client.query("COMMIT");
    transactionStarted = false;

    return res.status(200).json({
      message:
        "Password reset successful. Please log in with your new password.",
    });
  } catch (error) {
    if (client && transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Password reset rollback error:", rollbackError);
      }
    }

    console.error("Reset password error:", error);

    return res.status(500).json({
      message: "Unable to reset your password. Please try again.",
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

export default router;
