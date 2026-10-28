import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import pool from "../db/db.js";
import { requireLogin, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

// =====================================
// IMAGE UPLOAD CONFIGURATION
// =====================================

const uploadDir = path.resolve("public/uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadDir);
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${randomUUID()}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
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
  },
});

function imagePath(file) {
  return file ? `/uploads/${file.filename}` : null;
}

function validPostId(value) {
  return /^\d+$/.test(String(value)) && Number(value) > 0;
}

// =====================================
// SHARED POST SELECT
// Includes category and like count
// =====================================

const postAuthorSelect = `
  p.id,
  p.title,
  p.content,
  p.image,
  p.created_at,
  p.user_id,
  COALESCE(
    NULLIF(BTRIM(p.category), ''),
    'Uncategorized'
  ) AS category,
  (
    SELECT COUNT(*)::int
    FROM post_likes pl
    WHERE pl.post_id = p.id
      AND pl.status = 1
  ) AS total_likes,
  COALESCE(
    NULLIF(BTRIM(u.name), ''),
    'Blog Author'
  ) AS author_name
`;

// =====================================
// GET POSTS WITH PAGINATION
// GET /api/posts?page=1&limit=8
// =====================================

router.get("/", async (req, res, next) => {
  try {
    const parsedPage = Number.parseInt(req.query.page, 10);
    const parsedLimit = Number.parseInt(req.query.limit, 10);

    const page =
      Number.isSafeInteger(parsedPage) && parsedPage > 0
        ? parsedPage
        : 1;

    const requestedLimit =
      Number.isSafeInteger(parsedLimit) && parsedLimit > 0
        ? parsedLimit
        : 8;

    const limit = Math.min(requestedLimit, 8);
    const offset = (page - 1) * limit;

    if (!Number.isSafeInteger(offset)) {
      return res.status(400).json({
        message: "Invalid pagination parameters.",
      });
    }

    const result = await pool.query(
      `SELECT ${postAuthorSelect}
       FROM posts p
       LEFT JOIN users u ON u.id = p.user_id
       ORDER BY p.created_at DESC NULLS LAST, p.id DESC
       LIMIT $1 OFFSET $2`,
      [limit + 1, offset]
    );

    const hasMore = result.rows.length > limit;
    const posts = result.rows.slice(0, limit);

    return res.json({
      posts,
      page,
      limit,
      hasMore,
    });
  } catch (error) {
    next(error);
  }
});

// =====================================
// GET MY POSTS
// GET /api/posts/mine
// =====================================

router.get("/mine", requireLogin, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT ${postAuthorSelect}
       FROM posts p
       LEFT JOIN users u ON u.id = p.user_id
       WHERE p.user_id = $1
       ORDER BY p.created_at DESC NULLS LAST, p.id DESC`,
      [req.session.user.id]
    );

    return res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// =====================================
// BACKWARD-COMPATIBLE MY POSTS ROUTE
// GET /api/posts/my-posts
// =====================================

router.get("/my-posts", requireLogin, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT ${postAuthorSelect}
       FROM posts p
       LEFT JOIN users u ON u.id = p.user_id
       WHERE p.user_id = $1
       ORDER BY p.created_at DESC NULLS LAST, p.id DESC`,
      [req.session.user.id]
    );

    return res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// =====================================
// GET PROFILE STATISTICS
// GET /api/posts/profile/stats
// =====================================

router.get("/profile/stats", requireLogin, async (req, res, next) => {
  try {
    const userId = req.session.user.id;

    const result = await pool.query(
      `SELECT
         (SELECT COUNT(*)::int
          FROM posts
          WHERE user_id = $1) AS posts,

         (SELECT COUNT(*)::int
          FROM post_comments c
          JOIN posts p ON p.id = c.post_id
          WHERE p.user_id = $1) AS comments,

         (SELECT COUNT(*)::int
          FROM post_likes l
          JOIN posts p ON p.id = l.post_id
          WHERE p.user_id = $1
            AND l.status = 1) AS likes`,
      [userId]
    );

    return res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// =====================================
// PROFILE ACTIVITY
// GET /api/posts/profile/activity?type=posts|likes|comments
// =====================================

router.get("/profile/activity", requireLogin, async (req, res, next) => {
  try {
    const userId = req.session.user.id;
    const type = req.query.type;
    let result;

    if (type === "posts") {
      result = await pool.query(
        `SELECT
           p.id,
           p.title,
           p.created_at,
           COALESCE(
             NULLIF(BTRIM(u.name), ''),
             'Blog Author'
           ) AS author_name
         FROM posts p
         LEFT JOIN users u ON u.id = p.user_id
         WHERE p.user_id = $1
         ORDER BY p.id DESC`,
        [userId]
      );
    } else if (type === "likes") {
      result = await pool.query(
        `SELECT
           l.id,
           l.user_id,
           l.post_id,
           l.status,
           COALESCE(
             NULLIF(BTRIM(reader.name), ''),
             'User'
           ) AS user_name,
           p.title AS post_title
         FROM post_likes l
         JOIN posts p ON p.id = l.post_id
         LEFT JOIN users reader ON reader.id = l.user_id
         WHERE p.user_id = $1
           AND l.status = 1
         ORDER BY l.id DESC`,
        [userId]
      );
    } else if (type === "comments") {
      result = await pool.query(
        `SELECT
           c.id,
           c.user_id,
           c.post_id,
           c.comment,
           c.created_at,
           COALESCE(
             NULLIF(BTRIM(reader.name), ''),
             'User'
           ) AS user_name,
           p.title AS post_title
         FROM post_comments c
         JOIN posts p ON p.id = c.post_id
         LEFT JOIN users reader ON reader.id = c.user_id
         WHERE p.user_id = $1
         ORDER BY c.created_at DESC NULLS LAST, c.id DESC`,
        [userId]
      );
    } else {
      return res.status(400).json({
        message: "Invalid activity type.",
      });
    }

    return res.json({ items: result.rows });
  } catch (error) {
    next(error);
  }
});

// =====================================
// CREATE POST
// POST /api/posts
// =====================================

router.post(
  "/",
  requireLogin,
  upload.single("image"),
  async (req, res, next) => {
    try {
      const title = req.body.title?.trim();
      const content = req.body.content?.trim();
      const category =
        req.body.category?.trim() || "Uncategorized";

      if (!title || !content) {
        return res.status(400).json({
          message: "Title and content are required.",
        });
      }

      if (title.length > 200) {
        return res.status(400).json({
          message: "Title must be 200 characters or fewer.",
        });
      }

      if (category.length > 50) {
        return res.status(400).json({
          message: "Category must be 50 characters or fewer.",
        });
      }

      const result = await pool.query(
        `INSERT INTO posts
           (title, content, image, user_id, category)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING
           id, title, content, image, created_at, user_id, category`,
        [
          title,
          content,
          imagePath(req.file),
          req.session.user.id,
          category,
        ]
      );

      const postResult = await pool.query(
        `SELECT ${postAuthorSelect}
         FROM posts p
         LEFT JOIN users u ON u.id = p.user_id
         WHERE p.id = $1`,
        [result.rows[0].id]
      );

      return res.status(201).json({
        message: "Post created successfully.",
        post: postResult.rows[0],
      });
    } catch (error) {
      next(error);
    }
  }
);

// =====================================
// GET LIKE / DISLIKE COUNTS
// GET /api/posts/:id/likes
// =====================================

router.get("/:id/likes", async (req, res, next) => {
  try {
    const postId = Number(req.params.id);
    const userId = req.session?.user?.id ?? null;

    if (!validPostId(req.params.id) || !Number.isSafeInteger(postId)) {
      return res.status(400).json({
        message: "Invalid post ID.",
      });
    }

    const postResult = await pool.query(
      "SELECT id, user_id FROM posts WHERE id = $1",
      [postId]
    );

    if (!postResult.rowCount) {
      return res.status(404).json({
        message: "Post not found.",
      });
    }

    const isPostOwner =
      userId !== null &&
      String(postResult.rows[0].user_id) === String(userId);

    const totals = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 1)::int AS total_likes,
         COUNT(*) FILTER (WHERE status = -1)::int AS total_dislikes
       FROM post_likes
       WHERE post_id = $1`,
      [postId]
    );

    let userVote = 0;

    if (userId !== null) {
      const voteResult = await pool.query(
        `SELECT status
         FROM post_likes
         WHERE post_id = $1 AND user_id = $2`,
        [postId, userId]
      );

      if (voteResult.rowCount) {
        userVote = Number(voteResult.rows[0].status);
      }
    }

    const response = {
      totalLikes: totals.rows[0].total_likes,
      userVote,
      isPostOwner,
    };

    if (isPostOwner) {
      response.totalDislikes = totals.rows[0].total_dislikes;
    }

    return res.json(response);
  } catch (error) {
    next(error);
  }
});

// =====================================
// GET COMMENTS
// GET /api/posts/:id/comments
// =====================================

router.get("/:id/comments", async (req, res, next) => {
  try {
    const postId = Number(req.params.id);

    if (!validPostId(req.params.id) || !Number.isSafeInteger(postId)) {
      return res.status(400).json({
        message: "Invalid post ID.",
      });
    }

    const postResult = await pool.query(
      "SELECT id FROM posts WHERE id = $1",
      [postId]
    );

    if (!postResult.rowCount) {
      return res.status(404).json({
        message: "Post not found.",
      });
    }

    const result = await pool.query(
      `SELECT
         pc.id,
         pc.post_id,
         pc.user_id,
         pc.comment,
         pc.created_at,
         COALESCE(
           NULLIF(BTRIM(u.name), ''),
           'User'
         ) AS user_name
       FROM post_comments pc
       LEFT JOIN users u ON u.id = pc.user_id
       WHERE pc.post_id = $1
       ORDER BY pc.created_at DESC NULLS LAST, pc.id DESC`,
      [postId]
    );

    return res.json({
      comments: result.rows,
      total: result.rowCount,
    });
  } catch (error) {
    next(error);
  }
});

// =====================================
// ADD COMMENT
// POST /api/posts/:id/comments
// =====================================

router.post("/:id/comments", requireLogin, async (req, res, next) => {
  try {
    const postId = Number(req.params.id);
    const userId = req.session.user.id;
    const comment = req.body.comment?.trim();

    if (!validPostId(req.params.id) || !Number.isSafeInteger(postId)) {
      return res.status(400).json({
        message: "Invalid post ID.",
      });
    }

    if (!comment) {
      return res.status(400).json({
        message: "Please enter a comment.",
      });
    }

    if (comment.length > 2000) {
      return res.status(400).json({
        message: "Comment must be 2000 characters or fewer.",
      });
    }

    const postResult = await pool.query(
      "SELECT id FROM posts WHERE id = $1",
      [postId]
    );

    if (!postResult.rowCount) {
      return res.status(404).json({
        message: "Post not found.",
      });
    }

    const result = await pool.query(
      `INSERT INTO post_comments (post_id, user_id, comment)
       VALUES ($1, $2, $3)
       RETURNING id, post_id, user_id, comment, created_at`,
      [postId, userId, comment]
    );

    const userResult = await pool.query(
      `SELECT COALESCE(
         NULLIF(BTRIM(name), ''),
         'User'
       ) AS user_name
       FROM users
       WHERE id = $1`,
      [userId]
    );

    const newComment = {
      ...result.rows[0],
      user_name: userResult.rows[0]?.user_name || "User",
    };

    return res.status(201).json({
      message: "Comment added successfully.",
      comment: newComment,
    });
  } catch (error) {
    next(error);
  }
});

// =====================================
// LIKE OR DISLIKE A POST
// POST /api/posts/:id/like
// =====================================

router.post("/:id/like", requireLogin, async (req, res, next) => {
  try {
    const postId = Number(req.params.id);
    const status = Number(req.body.status);
    const userId = req.session.user.id;

    if (!validPostId(req.params.id) || !Number.isSafeInteger(postId)) {
      return res.status(400).json({
        message: "Invalid post ID.",
      });
    }

    if (![1, -1].includes(status)) {
      return res.status(400).json({
        message: "Status must be 1 (Like) or -1 (Dislike).",
      });
    }

    const postResult = await pool.query(
      "SELECT id, user_id FROM posts WHERE id = $1",
      [postId]
    );

    if (!postResult.rowCount) {
      return res.status(404).json({
        message: "Post not found.",
      });
    }

    await pool.query(
      `INSERT INTO post_likes
         (post_id, user_id, status, likes, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (post_id, user_id)
       DO UPDATE SET
         status = EXCLUDED.status,
         likes = EXCLUDED.likes,
         created_at = NOW()`,
      [postId, userId, status, status === 1 ? 1 : 0]
    );

    const totals = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 1)::int AS total_likes,
         COUNT(*) FILTER (WHERE status = -1)::int AS total_dislikes
       FROM post_likes
       WHERE post_id = $1`,
      [postId]
    );

    const isPostOwner =
      String(postResult.rows[0].user_id) === String(userId);

    const response = {
      totalLikes: totals.rows[0].total_likes,
      userVote: status,
      isPostOwner,
      message: "Vote saved successfully.",
    };

    if (isPostOwner) {
      response.totalDislikes = totals.rows[0].total_dislikes;
    }

    return res.json(response);
  } catch (error) {
    next(error);
  }
});

// =====================================
// REMOVE CURRENT USER'S VOTE
// DELETE /api/posts/:id/like
// =====================================

router.delete("/:id/like", requireLogin, async (req, res, next) => {
  try {
    const postId = Number(req.params.id);
    const userId = req.session.user.id;

    if (!validPostId(req.params.id) || !Number.isSafeInteger(postId)) {
      return res.status(400).json({
        message: "Invalid post ID.",
      });
    }

    const postResult = await pool.query(
      "SELECT id, user_id FROM posts WHERE id = $1",
      [postId]
    );

    if (!postResult.rowCount) {
      return res.status(404).json({
        message: "Post not found.",
      });
    }

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

    const isPostOwner =
      String(postResult.rows[0].user_id) === String(userId);

    const response = {
      totalLikes: totals.rows[0].total_likes,
      userVote: 0,
      isPostOwner,
    };

    if (isPostOwner) {
      response.totalDislikes = totals.rows[0].total_dislikes;
    }

    return res.json(response);
  } catch (error) {
    next(error);
  }
});

// =====================================
// GET ONE POST
// GET /api/posts/:id
// =====================================

router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!validPostId(id)) {
      return res.status(400).json({
        message: "Invalid post ID.",
      });
    }

    const result = await pool.query(
      `SELECT ${postAuthorSelect}
       FROM posts p
       LEFT JOIN users u ON u.id = p.user_id
       WHERE p.id = $1`,
      [id]
    );

    if (!result.rowCount) {
      return res.status(404).json({
        message: "Post not found.",
      });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// =====================================
// UPDATE POST
// Owner or admin can update.
// PUT /api/posts/:id
// =====================================

router.put(
  "/:id",
  requireLogin,
  upload.single("image"),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const title = req.body.title?.trim();
      const content = req.body.content?.trim();
      const category = req.body.category?.trim() || null;
      const user = req.session.user;
      const isAdmin = user.role === "admin";

      if (!validPostId(id)) {
        return res.status(400).json({
          message: "Invalid post ID.",
        });
      }

      if (!title || !content) {
        return res.status(400).json({
          message: "Title and content are required.",
        });
      }

      if (title.length > 200) {
        return res.status(400).json({
          message: "Title must be 200 characters or fewer.",
        });
      }

      if (category !== null && category.length > 50) {
        return res.status(400).json({
          message: "Category must be 50 characters or fewer.",
        });
      }

      const result = await pool.query(
        `UPDATE posts
         SET title = $1,
             content = $2,
             image = CASE
               WHEN $3::text IS NULL THEN image
               ELSE $3
             END,
             category = CASE
               WHEN $4::text IS NULL THEN category
               ELSE $4
             END
         WHERE id = $5
           AND ($6::boolean OR user_id = $7)
         RETURNING id`,
        [
          title,
          content,
          imagePath(req.file),
          category,
          id,
          isAdmin,
          user.id,
        ]
      );

      if (!result.rowCount) {
        const existing = await pool.query(
          "SELECT id FROM posts WHERE id = $1",
          [id]
        );

        if (!existing.rowCount) {
          return res.status(404).json({
            message: "Post not found.",
          });
        }

        return res.status(403).json({
          message: "You can only edit your own posts.",
        });
      }

      const postResult = await pool.query(
        `SELECT ${postAuthorSelect}
         FROM posts p
         LEFT JOIN users u ON u.id = p.user_id
         WHERE p.id = $1`,
        [id]
      );

      return res.json({
        message: "Post updated successfully.",
        post: postResult.rows[0],
      });
    } catch (error) {
      next(error);
    }
  }
);

// =====================================
// DELETE POST
// Admins only.
// DELETE /api/posts/:id
// =====================================

router.delete(
  "/:id",
  requireLogin,
  requireAdmin,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!validPostId(id)) {
        return res.status(400).json({
          message: "Invalid post ID.",
        });
      }

      const result = await pool.query(
        "DELETE FROM posts WHERE id = $1 RETURNING id",
        [id]
      );

      if (!result.rowCount) {
        return res.status(404).json({
          message: "Post not found.",
        });
      }

      return res.json({
        message: "Post deleted successfully.",
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;