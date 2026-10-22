
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import pool from "../db/db.js";
import { requireLogin, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

// =========================
// IMAGE UPLOAD CONFIGURATION
// =========================
const uploadDir = path.resolve("public/uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadDir);
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${randomUUID()}${extension}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];
    const extension = path.extname(file.originalname).toLowerCase();

    if (
      !allowedExtensions.includes(extension) ||
      !file.mimetype.startsWith("image/") ||
      file.mimetype === "image/svg+xml"
    ) {
      return callback(
        new Error("Only JPG, JPEG, PNG, and WEBP images are allowed.")
      );
    }

    callback(null, true);
  }
});

function imagePath(file) {
  return file ? `/uploads/${file.filename}` : null;
}

// =========================
// GET ALL POSTS
// GET /api/posts
// Any logged-in user can view posts.
// =========================
router.get("/", async (req, res, next) => {  try {
    const result = await pool.query(
      `SELECT id, title, content, image, created_at, user_id
       FROM posts
       ORDER BY created_at DESC`
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// =========================
// GET MY POSTS
// GET /api/posts/mine
// Must be before GET /:id.
// =========================
router.get("/mine", requireLogin, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, title, content, image, created_at, user_id
       FROM posts
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.session.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Backward-compatible alias if the frontend uses /my-posts.
router.get("/my-posts", requireLogin, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, title, content, image, created_at, user_id
       FROM posts
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.session.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// =========================
// CREATE POST
// POST /api/posts
// Any logged-in user can create a post.
// =========================
router.post(
  "/",
  requireLogin,
  upload.single("image"),
  async (req, res, next) => {
    try {
      const title = req.body.title?.trim();
      const content = req.body.content?.trim();

      if (!title || !content) {
        return res.status(400).json({
          message: "Title and content are required."
        });
      }

      if (title.length > 200) {
        return res.status(400).json({
          message: "Title must be 200 characters or fewer."
        });
      }

      const result = await pool.query(
        `INSERT INTO posts (title, content, image, user_id)
         VALUES ($1, $2, $3, $4)
         RETURNING id, title, content, image, created_at, user_id`,
        [
          title,
          content,
          imagePath(req.file),
          req.session.user.id
        ]
      );

      return res.status(201).json({
        message: "Post created successfully.",
        post: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  }
);

// =========================
// GET ONE POST
// GET /api/posts/:id
// Any logged-in user can view a post.
// =========================
// GET total likes and current user's vote
router.get("/:id/likes", requireLogin, async (req, res, next) => {
  try {
    const postId = Number(req.params.id);
    const userId = req.session.user.id;

    if (!Number.isInteger(postId) || postId <= 0) {
      return res.status(400).json({ message: "Invalid post ID" });
    }

    const result = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 1)::int AS total_likes,
         COUNT(*) FILTER (WHERE status = -1)::int AS total_dislikes
       FROM post_likes
       WHERE post_id = $1`,
      [postId]
    );

    const voteResult = await pool.query(
      `SELECT status
       FROM post_likes
       WHERE post_id = $1 AND user_id = $2`,
      [postId, userId]
    );

    res.json({
      totalLikes: result.rows[0].total_likes,
      totalDislikes: result.rows[0].total_dislikes,
      userVote: voteResult.rows.length
        ? voteResult.rows[0].status
        : 0
    });
  } catch (err) {
    next(err);
  }
});


/* =========================================
   GET COMMENTS FOR A POST
   GET /api/posts/:id/comments
========================================= */
router.get("/:id/comments", requireLogin, async (req, res, next) => {
  try {
    const postId = Number(req.params.id);

    if (!Number.isInteger(postId) || postId <= 0) {
      return res.status(400).json({
        message: "Invalid post ID."
      });
    }

    const post = await pool.query(
      "SELECT id FROM posts WHERE id = $1",
      [postId]
    );

    if (!post.rowCount) {
      return res.status(404).json({
        message: "Post not found."
      });
    }

    const result = await pool.query(
      `SELECT
         pc.id,
         pc.post_id,
         pc.user_id,
         pc.comment,
         pc.created_at,
         COALESCE(NULLIF(BTRIM(u.name), ''), 'User') AS user_name
       FROM post_comments pc
       LEFT JOIN users u ON u.id = pc.user_id
       WHERE pc.post_id = $1
       ORDER BY pc.created_at DESC`,
      [postId]
    );

    return res.json({
      comments: result.rows
    });
  } catch (error) {
    next(error);
  }
});


/* =========================================
   ADD A COMMENT TO A POST
   POST /api/posts/:id/comments
========================================= */
router.post("/:id/comments", requireLogin, async (req, res, next) => {
  try {
    const postId = Number(req.params.id);
    const userId = req.session.user.id;
    const comment = req.body.comment?.trim();

    if (!Number.isInteger(postId) || postId <= 0) {
      return res.status(400).json({
        message: "Invalid post ID."
      });
    }

    if (!comment) {
      return res.status(400).json({
        message: "Please enter a comment."
      });
    }

    if (comment.length > 2000) {
      return res.status(400).json({
        message: "Comment must be 2000 characters or fewer."
      });
    }

    const post = await pool.query(
      "SELECT id FROM posts WHERE id = $1",
      [postId]
    );

    if (!post.rowCount) {
      return res.status(404).json({
        message: "Post not found."
      });
    }

    const result = await pool.query(
      `INSERT INTO post_comments (post_id, user_id, comment)
       VALUES ($1, $2, $3)
       RETURNING id, post_id, user_id, comment, created_at`,
      [postId, userId, comment]
    );

    const savedComment = result.rows[0];

    const userResult = await pool.query(
      `SELECT COALESCE(NULLIF(BTRIM(name), ''), 'User') AS user_name
       FROM users
       WHERE id = $1`,
      [userId]
    );

    return res.status(201).json({
      message: "Comment added successfully.",
      comment: {
        ...savedComment,
        user_name: userResult.rows[0]?.user_name || "User"
      }
    });
  } catch (error) {
    next(error);
  }
});

// Like or dislike a post

router.post("/:id/like", requireLogin, async (req, res, next) => {
  try {
    const postId = Number(req.params.id);
    const status = Number(req.body.status);
    const userId = req.session.user.id;

    if (!Number.isInteger(postId) || postId <= 0) {
      return res.status(400).json({ message: "Invalid post ID." });
    }

    if (![1, -1].includes(status)) {
      return res.status(400).json({
        message: "Status must be 1 (Like) or -1 (Dislike).",
      });
    }

    const post = await pool.query(
      "SELECT id FROM posts WHERE id = $1",
      [postId]
    );

    if (!post.rowCount) {
      return res.status(404).json({ message: "Post not found." });
    }

    // Get the user's name from the database.
    const userResult = await pool.query(
      `SELECT COALESCE(
         NULLIF(BTRIM(name), ''),
         NULLIF(BTRIM($2), '')
       ) AS name
       FROM users
       WHERE id = $1`,
      [
        userId,
        req.session.user.name || req.session.user.username || null,
      ]
    );

    if (!userResult.rowCount) {
      return res.status(404).json({ message: "User not found." });
    }

    const userName = userResult.rows[0].name;

    if (!userName) {
      return res.status(400).json({
        message: "Your account name is missing. Please update your name first.",
      });
    }

    // Save the vote and user's name.
    await pool.query(
      `INSERT INTO post_likes
         (post_id, user_id, status, likes, created_at, name)
       VALUES ($1, $2, $3, $4, NOW(), $5)
       ON CONFLICT (post_id, user_id)
       DO UPDATE SET
         status = EXCLUDED.status,
         likes = EXCLUDED.likes,
         created_at = NOW(),
         name = EXCLUDED.name`,
      [postId, userId, status, status === 1 ? 1 : 0, userName]
    );

    const totals = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 1)::int AS "totalLikes",
         COUNT(*) FILTER (WHERE status = -1)::int AS "totalDislikes"
       FROM post_likes
       WHERE post_id = $1`,
      [postId]
    );

    res.json({
      ...totals.rows[0],
      userVote: status,
      message: "Vote saved successfully.",
    });
  } catch (error) {
    next(error);
  }
});




// Remove the current user's vote
router.delete("/:id/like", requireLogin, async (req, res, next) => {
  try {
    const postId = Number(req.params.id);
    const userId = req.session.user.id;

    await pool.query(
      `DELETE FROM post_likes
       WHERE post_id = $1 AND user_id = $2`,
      [postId, userId]
    );

    const totals = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 1)::int AS total_likes,
         COUNT(*) FILTER (WHERE status = -1)::int AS total_dislikes
       FROM post_likes
       WHERE post_id = $1`,
      [postId]
    );

    res.json({
      totalLikes: totals.rows[0].total_likes,
      totalDislikes: totals.rows[0].total_dislikes,
      userVote: 0
    });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({
        message: "Invalid post ID."
      });
    }

    const result = await pool.query(
      `SELECT id, title, content, image, created_at, user_id
       FROM posts
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Post not found."
      });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// =========================
// UPDATE POST
// PUT /api/posts/:id
// Owner or admin can update.
// =========================
router.put(
  "/:id",
  requireLogin,
  upload.single("image"),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const title = req.body.title?.trim();
      const content = req.body.content?.trim();
      const user = req.session.user;
      const isAdmin = user.role === "admin";

      if (!/^\d+$/.test(id)) {
        return res.status(400).json({
          message: "Invalid post ID."
        });
      }

      if (!title || !content) {
        return res.status(400).json({
          message: "Title and content are required."
        });
      }

      if (title.length > 200) {
        return res.status(400).json({
          message: "Title must be 200 characters or fewer."
        });
      }

      // Update only if the user owns the post or is an admin.
      const result = await pool.query(
        `UPDATE posts
         SET title = $1,
             content = $2,
             image = CASE
               WHEN $3::text IS NULL THEN image
               ELSE $3
             END
         WHERE id = $4
           AND ($5::boolean OR user_id = $6)
         RETURNING id, title, content, image, created_at, user_id`,
        [
          title,
          content,
          imagePath(req.file),
          id,
          isAdmin,
          user.id
        ]
      );

      if (result.rows.length === 0) {
        const existing = await pool.query(
          "SELECT id FROM posts WHERE id = $1",
          [id]
        );

        if (existing.rows.length === 0) {
          return res.status(404).json({
            message: "Post not found."
          });
        }

        return res.status(403).json({
          message: "You can only edit your own posts."
        });
      }

      return res.json({
        message: "Post updated successfully.",
        post: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  }
);

// =========================
// DELETE POST
// DELETE /api/posts/:id
// Admins only.
// =========================
router.delete(
  "/:id",
  requireLogin,
  requireAdmin,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!/^\d+$/.test(id)) {
        return res.status(400).json({
          message: "Invalid post ID."
        });
      }

      const result = await pool.query(
        "DELETE FROM posts WHERE id = $1 RETURNING id",
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: "Post not found."
        });
      }

      return res.json({
        message: "Post deleted successfully."
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
