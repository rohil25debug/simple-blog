
import React, { useCallback, useEffect, useState } from "react";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { api, getPostLikes, votePost, removePostVote } from "./api.jsx";

const API_ORIGIN = "http://localhost:5001";

function imageUrl(image) {
  if (!image) return "";
  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }
  return `${API_ORIGIN}${image.startsWith("/") ? "" : "/"}${image}`;
}

// =========================
// NAVBAR
// =========================

function Navbar({ user, onLogout, onOpenAuth }) {
  return (
    <header className="navbar">
      <Link className="brand" to="/">
        <span className="brand-icon">𝚂.</span>
         𝚂𝙾𝙲𝙸𝙰𝙻 𝙱𝙻𝙾𝙶
      </Link>

      <nav>
        <Link to="/">Posts</Link>

        {user?.role === "user" && (
          <>
            <Link to="/my-posts">My Posts</Link>
            <Link to="/create-post">Create Post</Link>
          </>
        )}

        {user?.role === "admin" && (
          <Link to="/admin">Dashboard</Link>
        )}

        {user ? (
          <div className="navbar-user">
            <div className="navbar-profile">
              {user.picture ? (
                <img
                  src={user.picture}
                  alt={`${user.name}'s profile`}
                  className="navbar-avatar"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="navbar-avatar-fallback">
                  {user.name?.charAt(0)?.toUpperCase() || "U"}
                </span>
              )}

              <span className="user-label">{user.name}</span>
            </div>

            <button
              type="button"
              className="button button-small"
              onClick={onLogout}
            >
              Log out
            </button>
          </div>
        ) : (
          <div className="navbar-auth">
            <button
              type="button"
              className="nav-login"
              onClick={() => onOpenAuth("login")}
            >
              Login
            </button>

            <button
              type="button"
              className="button button-small"
              onClick={() => onOpenAuth("register")}
            >
              Sign up
            </button>
          </div>
        )}
      </nav>
    </header>
  );
}

// =========================
// LOGIN
// =========================

function Login({ onLogin, onSuccess, onSwitch }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      const data = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      onLogin(data.user);

      if (onSuccess) {
        onSuccess();
      } else {
        navigate(
          data.user.role === "admin" ? "/admin" : "/",
          { replace: true }
        );
      }
    } catch (err) {
      setError(err.message || "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }

  function openForgotPassword() {
    if (onSuccess) onSuccess();
    navigate("/forgot-password");
  }

  return (
    <main className="auth-wrap">
      <form className="panel auth-panel" onSubmit={submit}>
        <span className="eyebrow"> </span>
        <h1>Sign in to your account</h1>

        {error && (
          <p className="alert" role="alert">{error}</p>
        )}

        <label htmlFor="email">Email address</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        <p className="form-foot">
          <button
            type="button"
            className="auth-text-button"
            onClick={openForgotPassword}
          >
            Forgot password?
          </button>
        </p>

        <button
          type="submit"
          className="button full-width"
          disabled={busy}
        >
          {busy ? "Signing in..." : "Sign in"}
        </button>

        <div className="login-divider">
          <span>OR</span>
        </div>

        <button
          type="button"
          className="google-login-button"
          onClick={() => {
            window.location.assign(
              `${API_ORIGIN}/api/auth/google`
            );
          }}
        >
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt=""
            width="20"
            height="20"
          />
          Continue with Google
        </button>

        <p className="form-foot">
          New here?{" "}
          {onSwitch ? (
            <button
              type="button"
              className="auth-text-button"
              onClick={() => onSwitch("register")}
            >
              Create an account
            </button>
          ) : (
            <Link to="/register">Create an account</Link>
          )}
        </p>
      </form>
    </main>
  );
}

// =========================
// FORGOT PASSWORD
// =========================

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);

    try {
      const data = await api("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });

      setMessage(
        data.message ||
          "If an account exists for that email, password-reset instructions will be sent."
      );
    } catch (err) {
      setError(
        err.message || "Could not request a password reset."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-wrap">
      <form className="panel auth-panel" onSubmit={submit}>
        <span className="eyebrow">ACCOUNT RECOVERY</span>
        <h1>Forgot your password?</h1>

        <p className="muted">
          Enter your email address. If an account exists,
          you'll receive instructions to reset your password.
        </p>

        {error && <p className="alert" role="alert">{error}</p>}
        {message && <p className="success">{message}</p>}

        <label htmlFor="forgot-email">Email address</label>
        <input
          id="forgot-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          maxLength={255}
          required
        />

        <button className="button full-width" disabled={busy}>
          {busy ? "Sending request..." : "Send reset instructions"}
        </button>

        <p className="form-foot">
          <Link to="/">Return to the blog</Link>
        </p>
      </form>
    </main>
  );
}

// =========================
// RESET PASSWORD
// =========================

function ResetPassword() {
  const { token: pathToken } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || pathToken;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSuccess(false);

    if (!token) {
      setError(
        "This password-reset link is invalid. Please request a new one."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Your password must be at least 8 characters long.");
      return;
    }

    setBusy(true);

    try {
      const data = await api("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });

      setMessage(
        data.message || "Your password has been reset successfully."
      );
      setSuccess(true);
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(
        err.message ||
          "Unable to reset your password. Please request a new link."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-wrap">
      <form className="panel auth-panel" onSubmit={submit}>
        <span className="eyebrow">ACCOUNT RECOVERY</span>
        <h1>Reset your password</h1>

        <p className="muted">
          Choose a new password. It must be at least 8 characters long.
        </p>

        {error && <p className="alert" role="alert">{error}</p>}

        {message && (
          <p className={success ? "success" : "alert"} role="status">
            {message}
          </p>
        )}

        <label htmlFor="new-password">New password</label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={8}
          maxLength={20}
          required
        />

        <label htmlFor="confirm-password">Confirm new password</label>
        <input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          minLength={8}
          maxLength={20}
          required
        />

        <button className="button full-width" type="submit" disabled={busy}>
          {busy ? "Resetting password..." : "Reset password"}
        </button>

        <p className="form-foot">
          <Link to="/">Return to the blog</Link>
        </p>
      </form>
    </main>
  );
}

// =========================
// REGISTER
// =========================

function Register({ onSuccess, onSwitch }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  function update(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);

    try {
      const data = await api("/auth/register", {
        method: "POST",
        body: JSON.stringify(form),
      });

      const successMessage =
        data.message || "Registration successful! You can now sign in.";

      if (onSuccess) {
        onSuccess(successMessage);
      } else {
        setMessage(successMessage);
      }
    } catch (err) {
      setError(err.message || "Registration failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-wrap">
      <form className="panel auth-panel" onSubmit={submit}>
        <span className="eyebrow"> </span>
        <h1>Create your account</h1>

        {error && <p className="alert" role="alert">{error}</p>}
        {message && <p className="success" role="status">{message}</p>}

        <label htmlFor="name">Full name</label>
        <input
          id="name"
          name="name"
          autoComplete="name"
          maxLength={20}
          value={form.name}
          onChange={update}
          required
        />

        <label htmlFor="reg-email">Email address</label>
        <input
          id="reg-email"
          name="email"
          type="email"
          autoComplete="email"
          maxLength={100}
          value={form.email}
          onChange={update}
          required
        />

        <label htmlFor="reg-password">Password</label>
        <input
          id="reg-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={20}
          value={form.password}
          onChange={update}
          required
        />

        <button
          className="button full-width"
          type="submit"
          disabled={busy}
        >
          {busy ? "Creating account..." : "Create account"}
        </button>

        <p className="form-foot">
          Already registered?{" "}
          {onSwitch ? (
            <button
              type="button"
              className="auth-text-button"
              onClick={() => onSwitch("login")}
            >
              Sign in
            </button>
          ) : (
            <Link to="/login">Sign in</Link>
          )}
        </p>
      </form>
    </main>
  );
}

// =========================
// AUTHENTICATION MODAL
// =========================

function AuthModal({ mode, onClose, onSwitch, onLogin }) {
  const [registrationMessage, setRegistrationMessage] = useState("");

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  function handleRegistrationSuccess(message) {
    setRegistrationMessage(message);
    onSwitch("login");
  }

  return (
    <div
      className="auth-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        <button
          type="button"
          className="auth-close"
          aria-label="Close dialog"
          onClick={onClose}
        >
          ×
        </button>

        <div className="auth-modal-heading">
          <span className="brand-icon">𝚂.</span>

          <h2 id="auth-modal-title">
            {mode === "login" ? "Welcome back" : "Join Rohil's Blog"}
          </h2>

          <p>
            {mode === "login"
              ? "Sign in to manage your posts and join the community."
              : "Create your account and start sharing your stories."}
          </p>
        </div>

        {registrationMessage && mode === "login" && (
          <p className="success" role="status">
            {registrationMessage}
          </p>
        )}

        {mode === "login" ? (
          <Login
            onLogin={onLogin}
            onSuccess={onClose}
            onSwitch={onSwitch}
          />
        ) : (
          <Register
            onSuccess={handleRegistrationSuccess}
            onSwitch={onSwitch}
          />
        )}
      </section>
    </div>
  );
}

// =========================
// POSTS LIST / PUBLIC HOME
// =========================
function LoginRequiredPost({ onOpenAuth }) {
  const navigate = useNavigate();

  useEffect(() => {
    onOpenAuth("login");
    navigate("/", { replace: true });
  }, [onOpenAuth, navigate]);

  return null;
}
function Home() {
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await api("/posts");
      setPosts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Could not load posts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  return (
    <main>
      <section className="hero">
        <span className="eyebrow">𝒜 𝒯𝓇𝑒𝒶𝓈𝓊𝓇𝑒 𝒯𝓇𝑜𝓋𝑒 𝑜𝒻 𝐵𝑜𝑜𝓀𝓈 ✍</span>
      </section>

      <section className="content-section">
        <div className="section-heading">
          <span className="muted">{posts.length} posts</span>
        </div>

        {loading && <p>Loading posts...</p>}

        {error && (
          <div>
            <p className="alert" role="alert">{error}</p>
            <button
              type="button"
              className="button button-ghost"
              onClick={loadPosts}
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && posts.length === 0 && (
          <div className="empty-state">
            <h3>The story starts here.</h3>
            <p>No posts have been published yet.</p>
          </div>
        )}

        <div className="post-grid">
          {posts.map((post, index) => (
            <article className="post-card" key={post.id}>
              {post.image ? (
                <img
                  className="post-image"
                  src={imageUrl(post.image)}
                  alt={post.title}
                  loading="lazy"
                />
              ) : (
                <div className={`post-art art-${index % 4}`}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <span>FIELD NOTES</span>
                </div>
              )}

              <div className="post-card-body">
                <p className="post-date">
                  {post.created_at
                    ? new Date(post.created_at).toLocaleDateString(
                        undefined,
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }
                      )
                    : "Recently published"}
                </p>

                <h3>
                  <Link to={`/posts/${post.id}`}>
                    {post.title}
                  </Link>
                </h3>

                <p className="excerpt">
  {post.content || ""}
</p>
                <Link
                  className="read-link"
                  to={`/posts/${post.id}`}
                >
                  Read post <span>↗</span>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}


// =========================
// PUBLIC POST DETAILS
// =========================

function PostDetails({ user, onOpenAuth }) {
  const { id } = useParams();

  const [post, setPost] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [likes, setLikes] = useState({
    totalLikes: 0,
    totalDislikes: 0,
    userVote: 0,
  });

  const [voteBusy, setVoteBusy] = useState(false);
  const [voteError, setVoteError] = useState("");

  // Comment popup state
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentBusy, setCommentBusy] = useState(false);
  const [commentError, setCommentError] = useState("");

  // Load post
  useEffect(() => {
    let active = true;

    async function loadPost() {
      setLoading(true);
      setPost(null);
      setError("");

      try {
        const data = await api(`/posts/${id}`);
        if (active) setPost(data.post || data);
      } catch (err) {
        if (active) {
          setError(err.message || "Could not load this article.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadPost();

    return () => {
      active = false;
    };
  }, [id]);

  // Load votes
  useEffect(() => {
    let active = true;

    async function loadLikes() {
      if (!user) {
        setLikes({
          totalLikes: 0,
          totalDislikes: 0,
          userVote: 0,
        });
        return;
      }

      try {
        const data = await getPostLikes(id);

        if (active) {
          setLikes({
            totalLikes: Number(data.totalLikes) || 0,
            totalDislikes: Number(data.totalDislikes) || 0,
            userVote: Number(data.userVote) || 0,
          });
        }
      } catch (err) {
        if (active) {
          setVoteError(err.message || "Could not load vote totals.");
        }
      }
    }

    loadLikes();

    return () => {
      active = false;
    };
  }, [id, user]);

  // Load comments from the backend
  const loadComments = useCallback(async () => {
    setCommentsLoading(true);
    setCommentError("");

    try {
      const data = await api(`/posts/${id}/comments`);
      setComments(
        Array.isArray(data) ? data : data.comments || []
      );
    } catch (err) {
      setCommentError(err.message || "Could not load comments.");
    } finally {
      setCommentsLoading(false);
    }
  }, [id]);

  // Load comments when the popup opens
  useEffect(() => {
    if (commentsOpen) {
      loadComments();
    }
  }, [commentsOpen, loadComments]);

  // Like / dislike — existing functionality preserved
  async function handleVote(status) {
    if (!user) {
      onOpenAuth?.("login");
      return;
    }

    if (voteBusy) return;

    setVoteBusy(true);
    setVoteError("");

    try {
      const data =
        likes.userVote === status
          ? await removePostVote(id)
          : await votePost(id, status);

      setLikes({
        totalLikes: Number(data.totalLikes) || 0,
        totalDislikes: Number(data.totalDislikes) || 0,
        userVote: Number(data.userVote) || 0,
      });
    } catch (err) {
      setVoteError(err.message || "Could not save your vote.");
    } finally {
      setVoteBusy(false);
    }
  }

  // Submit a new comment
  async function handleCommentSubmit(event) {
    event.preventDefault();

    const text = commentText.trim();

    if (!text || commentBusy) return;

    if (!user) {
      onOpenAuth?.("login");
      return;
    }

    setCommentBusy(true);
    setCommentError("");

    try {
      const data = await api(`/posts/${id}/comments`, {
        method: "POST",
        body: JSON.stringify({ comment: text }),
      });

      // Support either a returned comment or a refreshed list.
      if (data.comment) {
        setComments((previous) => [
          ...previous,
          data.comment,
        ]);
      } else {
        await loadComments();
      }

      setCommentText("");
    } catch (err) {
      setCommentError(err.message || "Could not submit your comment.");
    } finally {
      setCommentBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="article-loading">
        <div className="loading-spinner" />
        <p>Loading your article...</p>
      </main>
    );
  }

  if (error || !post) {
    return (
      <main className="content-section">
        <p className="alert">{error || "Post not found."}</p>
        <Link className="back-link" to="/">
          ← Back to posts
        </Link>
      </main>
    );
  }

  const author =
    post.author_name ||
    post.author?.name ||
    post.user_name ||
    post.name ||
    "Blog Author";

  const formattedDate = post.created_at
    ? new Date(post.created_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Recently published";

  return (
    <main className="read-post-page">
      <Link className="read-post-back" to="/">
        <span aria-hidden="true">←</span> All posts
      </Link>

      <article className="read-post-card">
        <div className="read-post-layout">
          <div className="read-post-media">
            {post.image ? (
              <img
                className="read-post-image"
                src={imageUrl(post.image)}
                alt={post.title}
              />
            ) : (
              <div className="read-post-no-image">
                <span>YOUR STORY</span>
                <p>No image available</p>
              </div>
            )}
          </div>

          <div className="read-post-content">
            <span className="read-post-eyebrow">
              THE JOURNAL · ARTICLE
            </span>

            <h1 className="read-post-title">{post.title}</h1>

            <div className="read-post-meta">
              <div className="read-post-author-avatar">
                {author.charAt(0).toUpperCase()}
              </div>

              <div>
                <p className="read-post-author-name">{author}</p>
                <p className="read-post-date">
                  Published {formattedDate}
                </p>
              </div>
            </div>

            <div className="read-post-body">{post.content}</div>
          </div>
        </div>

        {/* Reactions */}
        <section
          className="read-post-reactions"
          aria-label="Post reactions"
        >
          <h2>Enjoyed this story?</h2>

          <p className="read-post-reaction-subtitle">
            Share your reaction or join the conversation.
          </p>

          {voteError && (
            <p className="alert" role="alert">{voteError}</p>
          )}

          {!user && (
            <p className="read-post-signin">
              Sign in to like or dislike this post.
            </p>
          )}

          <div className="read-post-votes">
            <button
              type="button"
              className={`read-post-vote like-vote ${
                likes.userVote === 1 ? "is-active" : ""
              }`}
              aria-pressed={likes.userVote === 1}
              disabled={voteBusy}
              onClick={() => handleVote(1)}
            >
              <i className="fa-solid fa-heart" aria-hidden="true" />
              <span>Like</span>
              <span className="read-post-vote-count">
                {likes.totalLikes}
              </span>
            </button>

            <button
              type="button"
              className={`read-post-vote dislike-vote ${
                likes.userVote === -1 ? "is-active" : ""
              }`}
              aria-pressed={likes.userVote === -1}
              disabled={voteBusy}
              onClick={() => handleVote(-1)}
            >
              <i className="fa-solid fa-thumbs-down" aria-hidden="true" />
              <span>Dislike</span>
              <span className="read-post-vote-count">
                {likes.totalDislikes}
              </span>
            </button>

            {/* New comment button */}
            <button
              type="button"
              className="read-post-vote comment-vote"
              aria-expanded={commentsOpen}
              onClick={() => setCommentsOpen((open) => !open)}
            >
              <i className="fa-regular fa-comment" aria-hidden="true" />
              <span>Comment</span>
              <span className="read-post-vote-count">
                {comments.length}
              </span>
            </button>
          </div>

          {voteBusy && (
            <p className="read-post-voting-status">
              Saving your reaction...
            </p>
          )}
        </section>
      </article>

      {/* Small comment popup */}
      {commentsOpen && (
        <div
          className="comment-popup-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setCommentsOpen(false);
            }
          }}
        >
          <section
            className="comment-popup"
            role="dialog"
            aria-modal="true"
            aria-labelledby="comment-popup-title"
          >
            <header className="comment-popup-header">
              <div>
                <h2 id="comment-popup-title">Comments</h2>
                <p>
                  Join the conversation · {comments.length} comments
                </p>
              </div>

              <button
                type="button"
                className="comment-popup-close"
                aria-label="Close comments"
                onClick={() => setCommentsOpen(false)}
              >
                ×
              </button>
            </header>

            <div className="comment-popup-list">
              {commentsLoading ? (
                <p className="comment-empty">Loading comments...</p>
              ) : commentError && comments.length === 0 ? (
                <p className="alert" role="alert">{commentError}</p>
              ) : comments.length === 0 ? (
                <div className="comment-empty">
                  <i className="fa-regular fa-comments" />
                  <p>No comments yet.</p>
                  <span>Be the first to share your thoughts.</span>
                </div>
              ) : (
                comments.map((item) => (
                  <article
                    className="comment-item"
                    key={item.id}
                  >
                    <div className="comment-avatar">
                      {(item.user_name || item.name || "U")
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div className="comment-item-content">
                      <div className="comment-item-meta">
                        <strong>
                          {item.user_name || item.name || "User"}
                        </strong>
                        <time>
                          {item.created_at
                            ? new Date(
                                item.created_at
                              ).toLocaleDateString()
                            : "Just now"}
                        </time>
                      </div>

                      <p>{item.comment}</p>
                    </div>
                  </article>
                ))
              )}
            </div>

            <form
              className="comment-popup-form"
              onSubmit={handleCommentSubmit}
            >
              {commentError && comments.length > 0 && (
                <p className="alert" role="alert">
                  {commentError}
                </p>
              )}

              <label htmlFor="new-comment">Write a comment</label>

              <textarea
                id="new-comment"
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                placeholder="Share your thoughts..."
                rows={3}
                maxLength={2000}
                required
              />

              <div className="comment-popup-form-footer">
                <span>{commentText.length}/2000</span>

                <button
                  type="submit"
                  className="button"
                  disabled={commentBusy || !commentText.trim()}
                >
                  <i className="fa-regular fa-paper-plane" />
                  {commentBusy ? "Sending..." : "Send comment"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}



// =========================
// ADMIN DASHBOARD
// =========================

function AdminDashboard() {
  const [posts, setPosts] = useState([]);
  const [form, setForm] = useState({ title: "", content: "" });
  const [imageFile, setImageFile] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadPosts = useCallback(async () => {
    setError("");

    try {
      const data = await api("/posts");
      setPosts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Could not load posts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  function clearImageInput() {
    setImageFile(null);
    const imageInput = document.getElementById("post-image");
    if (imageInput) imageInput.value = "";
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("title", form.title);
      formData.append("content", form.content);

      if (imageFile) formData.append("image", imageFile);

      const url = editingId
        ? `${API_ORIGIN}/api/posts/${editingId}`
        : `${API_ORIGIN}/api/posts`;

      const response = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        credentials: "include",
        body: formData,
      });

      let data = {};
      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(data.message || "Could not save the post.");
      }

      const wasEditing = Boolean(editingId);

      setForm({ title: "", content: "" });
      clearImageInput();
      setEditingId(null);
      setMessage(
        wasEditing
          ? "Article updated successfully."
          : "Article published successfully."
      );

      await loadPosts();
    } catch (err) {
      setError(err.message || "Could not save the post.");
    } finally {
      setBusy(false);
    }
  }

  function edit(post) {
    setEditingId(post.id);
    setForm({ title: post.title, content: post.content });
    clearImageInput();
    setError("");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEditing() {
    setEditingId(null);
    setForm({ title: "", content: "" });
    clearImageInput();
    setError("");
    setMessage("");
  }

  async function remove(post) {
    if (!window.confirm(`Delete "${post.title}"? This cannot be undone.`)) {
      return;
    }

    setError("");
    setMessage("");

    try {
      await api(`/posts/${post.id}`, { method: "DELETE" });
      setMessage("Article deleted successfully.");

      if (editingId === post.id) cancelEditing();

      await loadPosts();
    } catch (err) {
      setError(err.message || "Could not delete the post.");
    }
  }

  return (
    <main className="content-section admin-section">
      <div className="admin-heading">
        <div>
          <span className="eyebrow">CONTENT MANAGEMENT</span>
          <h1>Editorial dashboard</h1>
          <p className="muted">Write, update, and manage your posts.</p>
        </div>
        <span className="admin-tag">ADMIN</span>
      </div>

      {error && <p className="alert">{error}</p>}
      {message && <p className="success">{message}</p>}

      <form className="panel editor-panel" onSubmit={submit}>
        <h2>{editingId ? "Edit post" : "Write a new post"}</h2>

        <label htmlFor="post-title">Post title</label>
        <input
          id="post-title"
          maxLength={200}
          value={form.title}
          onChange={(event) =>
            setForm((previous) => ({
              ...previous,
              title: event.target.value,
            }))
          }
          placeholder="Give your story a title..."
          required
        />

        <label htmlFor="post-content">Post content</label>
        <textarea
          id="post-content"
          rows={10}
          value={form.content}
          onChange={(event) =>
            setForm((previous) => ({
              ...previous,
              content: event.target.value,
            }))
          }
          placeholder="Start writing your story..."
          required
        />

        <label htmlFor="post-image" className="upload-button">
          <span className="text">Choose image</span>
        </label>
        <input
          id="post-image"
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={(event) =>
            setImageFile(event.target.files?.[0] || null)
          }
        />

        {imageFile && (
          <p className="muted">Selected image: {imageFile.name}</p>
        )}

        {editingId && (
          <p className="muted">
            Choose a new image to replace the current one.
            Leave this empty to keep the existing image.
          </p>
        )}

        <div className="editor-actions">
          <button className="button" disabled={busy}>
            {busy
              ? "Saving..."
              : editingId
                ? "Save changes"
                : "Publish post"}
          </button> 

          {editingId && (
            <button
              type="button"
              className="button button-ghost"
              onClick={cancelEditing}
            >
              Cancel editing
            </button>
          )}
        </div>
      </form>

      <div className="section-heading manage-heading">
        <h2>Published posts ({posts.length})</h2>
      </div>

      {loading && <p>Loading posts...</p>}

      {!loading && posts.length === 0 && !error && (
        <p className="muted">No posts yet. Publish your first post above.</p>
      )}

      <div className="manage-list">
        {posts.map((post) => (
          <article className="manage-item" key={post.id}>
            <div className="manage-copy">
              {post.image && (
                <img
                  className="manage-image"
                  src={imageUrl(post.image)}
                  alt={post.title}
                  loading="lazy"
                />
              )}
              <h3>{post.title}</h3>
              <p className="muted">
                {post.created_at
                  ? new Date(post.created_at).toLocaleDateString()
                  : "Recently published"}
              </p>
            </div>

            <div className="manage-actions">
              <button
                type="button"
                className="button button-ghost"
                onClick={() => edit(post)}
              >
                Edit
              </button>
              <button
                type="button"
                className="button button-danger"
                onClick={() => remove(post)}
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}

// =========================
// NORMAL USER: CREATE POST
// =========================

function CreatePost() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: "", content: "" });
  const [imageFile, setImageFile] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      const formData = new FormData();
      formData.append("title", form.title.trim());
      formData.append("content", form.content.trim());
      if (imageFile) formData.append("image", imageFile);

      const response = await fetch(`${API_ORIGIN}/api/posts`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      let data = {};
      try {
        data = await response.json();
      } catch {
        // Response may be empty.
      }

      if (!response.ok) {
        throw new Error(data.message || "Could not create the post.");
      }

      navigate("/my-posts", {
        replace: true,
        state: { message: "Post published successfully." },
      });
    } catch (err) {
      setError(err.message || "Could not create the post.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="content-section admin-section">
      <div className="admin-heading">
        <div>
          <span className="eyebrow">YOUR WRITING</span>
          <h1>Create Post</h1>
          <p className="muted">Write and publish a new post on your blog.</p>
        </div>
        <Link className="button button-ghost" to="/my-posts">My Posts</Link>
      </div>

      {error && <p className="alert" role="alert">{error}</p>}

      <form className="panel editor-panel" onSubmit={submit}>
        <label htmlFor="create-post-title">Post title</label>
        <input
          id="create-post-title"
          maxLength={200}
          value={form.title}
          onChange={(event) =>
            setForm((previous) => ({
              ...previous,
              title: event.target.value,
            }))
          }
          required
        />

        <label htmlFor="create-post-content">Post content</label>
        <textarea
          id="create-post-content"
          rows={10}
          value={form.content}
          onChange={(event) =>
            setForm((previous) => ({
              ...previous,
              content: event.target.value,
            }))
          }
          required
        />

        <label htmlFor="create-post-image" className="upload-button">
          <span className="text">Choose image</span>
        </label>
        <input
          id="create-post-image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={(event) =>
            setImageFile(event.target.files?.[0] || null)
          }
        />

        {imageFile && (
          <p className="muted">Selected image: {imageFile.name}</p>
        )}

        <div className="editor-actions">
          <button className="button" type="submit" disabled={busy}>
            {busy ? "Publishing..." : "Publish post"}
          </button> 
          <Link className="button button-ghost" to="/my-posts">Cancel</Link>
        </div>
      </form>
    </main>
  );
}

// =========================
// NORMAL USER: MY POSTS
// =========================

function MyPosts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await api("/posts/mine");
      setPosts(Array.isArray(data) ? data : data.posts || []);
    } catch (err) {
      setError(err.message || "Could not load your posts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  return (
    <main className="content-section admin-section">
      <div className="admin-heading">
        <div>
          <span className="eyebrow">YOUR WRITING</span>
          <h1>My Posts</h1>
          <p className="muted">View and update posts you have created.</p>
        </div>
        <Link className="button button-ghost" to="/create-post">
          Create Post
        </Link>
      </div>

      {error && (
        <div>
          <p className="alert">{error}</p>
          <button
            type="button"
            className="button button-ghost"
            onClick={loadPosts}
          >
            Try again
          </button>
        </div>
      )}

      {loading && <p>Loading your posts...</p>}

      {!loading && !error && posts.length === 0 && (
        <div className="empty-state">
          <h3>You haven't published any posts yet.</h3>
          <p className="muted">
            Your posts will appear here after you create them.
          </p>
        </div>
      )}

      <div className="manage-list">
        {posts.map((post) => (
          <article className="manage-item" key={post.id}>
            <div className="manage-copy">
              {post.image && (
                <img
                  className="manage-image"
                  src={imageUrl(post.image)}
                  alt={post.title}
                  loading="lazy"
                />
              )}

              <h3>
                <Link to={`/posts/${post.id}`}>{post.title}</Link>
              </h3>

              <p className="muted">
                {post.created_at
                  ? new Date(post.created_at).toLocaleDateString()
                  : "Recently published"}
              </p>

              <p>
                {(post.content || "").slice(0, 160)}
                {(post.content || "").length > 160 ? "..." : ""}
              </p>
            </div>

            <div className="manage-actions">
              <Link
                className="button button-ghost"
                to={`/edit-post/${post.id}`}
              >
                Edit Post
              </Link>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}

// =========================
// NORMAL USER: EDIT OWN POST
// =========================

function EditPost() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({ title: "", content: "" });
  const [imageFile, setImageFile] = useState(null);
  const [currentImage, setCurrentImage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadPost() {
      setLoading(true);
      setError("");

      try {
        const data = await api(`/posts/${id}`);
        const post = data.post || data;

        if (!post || String(post.id) !== String(id)) {
          throw new Error("Post not found.");
        }

        if (active) {
          setForm({
            title: post.title || "",
            content: post.content || "",
          });
          setCurrentImage(post.image || "");
        }
      } catch (err) {
        if (active) setError(err.message || "Could not load this post.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadPost();

    return () => {
      active = false;
    };
  }, [id]);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("title", form.title.trim());
      formData.append("content", form.content.trim());
      if (imageFile) formData.append("image", imageFile);

      const response = await fetch(`${API_ORIGIN}/api/posts/${id}`, {
        method: "PUT",
        credentials: "include",
        body: formData,
      });

      let data = {};
      try {
        data = await response.json();
      } catch {
        // Response may be empty.
      }

      if (!response.ok) {
        throw new Error(data.message || "Could not update this post.");
      }

      navigate("/my-posts", {
        replace: true,
        state: { message: "Post updated successfully." },
      });
    } catch (err) {
      setError(err.message || "Could not update this post.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <main className="content-section">Loading post...</main>;
  }

  if (error && !form.title && !form.content) {
    return (
      <main className="content-section">
        <p className="alert">{error}</p>
        <Link to="/my-posts">Back to My Posts</Link>
      </main>
    );
  }

  return (
    <main className="content-section admin-section">
      <div className="admin-heading">
        <div>
          <span className="eyebrow">YOUR WRITING</span>
          <h1>Edit Post</h1>
          <p className="muted">
            You can update only posts you own. Admins can also edit posts.
          </p>
        </div>
      </div>

      {error && <p className="alert">{error}</p>}

      <form className="panel editor-panel" onSubmit={submit}>
        <label htmlFor="edit-post-title">Post title</label>
        <input
          id="edit-post-title"
          maxLength={200}
          value={form.title}
          onChange={(event) =>
            setForm((old) => ({ ...old, title: event.target.value }))
          }
          required
        />

        <label htmlFor="edit-post-content">Post content</label>
        <textarea
          id="edit-post-content"
          rows={10}
          value={form.content}
          onChange={(event) =>
            setForm((old) => ({ ...old, content: event.target.value }))
          }
          required
        />

        
<div className="edit-image-section">
  {currentImage && (
    <div className="current-image-wrapper">
      <p className="muted">Current image</p>
      <img
        className="manage-image edit-current-image"
        src={imageUrl(currentImage)}
        alt="Current post"
      />
    </div>
  )}

  <label htmlFor="edit-post-image" className="upload-button">
    <span className="text">
      Choose Image
    </span>
  </label>

  <input
    id="edit-post-image"
    type="file"
    accept="image/jpeg,image/png,image/webp"
    hidden
    onChange={(event) =>
      setImageFile(event.target.files?.[0] || null)
    }
  />

  {imageFile && (
    <p className="muted selected-image-name">
      Selected image: {imageFile.name}
    </p>
  )}
</div>

        {/* <p className="muted">
          Leave the image field empty to keep the current image.
        </p> */}

        <div className="editor-actions">
          <button className="button" disabled={busy}>
            {busy ? "Saving..." : "Save changes"}
          </button>
          <Link className="button button-ghost" to="/my-posts">
            Cancel
          </Link>
        </div>
      </form>
    </main>
  );
}

// =========================
// NOT FOUND
// =========================

function NotFound() {
  return (
    <main className="empty-state content-section">
      <h1>Page not found</h1>
      <Link to="/">Return to posts</Link>
    </main>
  );
}

// =========================
// PROTECTED ROUTE
// =========================

function Protected({ user, admin = false, children }) {
  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (admin && user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return children;
}

// =========================
// MAIN APP
// =========================

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [authModal, setAuthModal] = useState(null);

  const navigate = useNavigate();

  const refreshSession = useCallback(async () => {
    try {
      const data = await api("/auth/me");
      setUser(data.user || null);
    } catch {
      setUser(null);
    } finally {
      setChecking(false);
    }
  }, []);

  // Restore the session after a page refresh.
  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  // Open the login popup when the session expires.
  useEffect(() => {
    function expired() {
      setUser(null);
      setAuthModal("login");
      navigate("/", { replace: true });
    }

    window.addEventListener("session-expired", expired);

    return () => {
      window.removeEventListener("session-expired", expired);
    };
  }, [navigate]);

  // Recheck the session when returning to a cached browser page.
  useEffect(() => {
    function onPageShow() {
      refreshSession();
    }

    window.addEventListener("pageshow", onPageShow);

    return () => {
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [refreshSession]);

  async function logout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      await api("/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout request failed:", err);
    } finally {
      setUser(null);
      setAuthModal(null);
      setLoggingOut(false);
      navigate("/", { replace: true });
    }
  }

  if (checking) {
    return (
      <main className="loading-screen">
        Loading Rohil's Blog...
      </main>
    );
  }

  return (
    <div className="app-shell">
      <Navbar
        user={user}
        onLogout={logout}
        onOpenAuth={setAuthModal}
      />

      {authModal && !user && (
        <AuthModal
          mode={authModal}
          onClose={() => setAuthModal(null)}
          onSwitch={setAuthModal}
          onLogin={setUser}
        />
      )}

      <Routes>
        {/* PUBLIC: no login required */}
        <Route path="/" element={<Home />} />
<Route
  path="/posts/:id"
  element={
    user ? (
      <PostDetails
        user={user}
        onOpenAuth={setAuthModal}
      />
    ) : (
      <LoginRequiredPost onOpenAuth={setAuthModal} />
    )
  }
/>
        {/* Direct authentication URLs remain supported */}
        <Route
          path="/login"
          element={
            user ? (
              <Navigate to="/" replace />
            ) : (
              <Login onLogin={setUser} />
            )
          }
        />

        <Route
          path="/register"
          element={
            user ? (
              <Navigate to="/" replace />
            ) : (
              <Register />
            )
          }
        />

        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />

        <Route
          path="/reset-password"
          element={<ResetPassword />}
        />

        <Route
          path="/reset-password/:token"
          element={<ResetPassword />}
        />

        {/* PROTECTED: logged-in users */}
        <Route
          path="/create-post"
          element={
            <Protected user={user}>
              <CreatePost />
            </Protected>
          }
        />

        <Route
          path="/my-posts"
          element={
            <Protected user={user}>
              <MyPosts />
            </Protected>
          }
        />

        <Route
          path="/edit-post/:id"
          element={
            <Protected user={user}>
              <EditPost />
            </Protected>
          }
        />

        {/* PROTECTED: admins only */}
        <Route
          path="/admin"
          element={
            <Protected user={user} admin>
              <AdminDashboard />
            </Protected>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Routes>

      <footer className="footer">
        <Link className="brand footer-brand" to="/">
          <span className="brand-icon">𝚂.</span>
          𝚂𝙾𝙲𝙸𝙰𝙻 𝙱𝙻𝙾𝙶
        </Link>

        <p>Thoughtful words. Fresh perspectives.</p>

        <span>© {new Date().getFullYear()} 𝚂𝙾𝙲𝙸𝙰𝙻 𝙱𝙻𝙾𝙶</span>
      </footer>
    </div>
  );
}
