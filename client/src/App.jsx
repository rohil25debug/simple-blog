import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

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




function Navbar({ user, onOpenAuth, onOpenProfile }) {
  return (
    <header className="site-navbar">
      <div className="navbar-inner">
        {/* Blog Brand */}
        <Link to="/" className="navbar-brand">
          <span className="navbar-brand-icon">𝚂.</span>
          <span className="navbar-brand-text">
            <strong>𝚂. 𝚂𝙾𝙲𝙸𝙰𝙻</strong>
            <small>STORIES WORTH SHARING</small>
          </span>
        </Link>

        {/* Main Navigation */}
        <nav className="navbar-links" aria-label="Main navigation">
           
          {user && (
            <>
            <Link to="/#discover-stories" className="navbar-link">
            Discover
          </Link>
              <Link to="/my-posts" className="navbar-link">
                My Posts
              </Link>

              <Link to="/create-post" className="navbar-create-link">
                <span></span> Create post
              </Link>

              {user.role === "admin" && (
                <Link to="/admin" className="navbar-link">
                  Dashboard
                </Link>
              )}
            </>
          )}
        </nav>

        {/* Right Side */}
        <div className="navbar-actions">
          {user ? (
            <button
              type="button"
              className="navbar-profile-button"
              onClick={onOpenProfile}
              aria-label="Open your profile"
              title="My Profile"
            >
              {user.picture ? (
                <img
                  className="navbar-avatar-image"
                  src={user.picture}
                  alt=""
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="navbar-avatar-initial">
                  {user.name?.trim()?.charAt(0)?.toUpperCase() || "U"}
                </span>
              )}

              <span className="navbar-profile-name">
                {user.name?.split(" ")[0] || "Profile"}
              </span>

              <span className="navbar-profile-chevron">⌄</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                className="navbar-login-button"
                onClick={() => onOpenAuth("login")}
              >
                Log in
              </button>

              <button
                type="button"
                className="navbar-signup-button"
                onClick={() => onOpenAuth("register")}
              >
                Get Started <span>↗</span>
              </button>
            </>
          )}
        </div>
      </div>
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

function Home({ user, onOpenAuth }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  const [page, setPage] = useState(1);
  const observerRef = useRef(null);
  const requestInProgressRef = useRef(false);

  const POSTS_PER_PAGE = 8;

  // Load the first 8 posts.
  useEffect(() => {
    let cancelled = false;

    async function loadInitialPosts() {
      setLoading(true);
      setError("");
      requestInProgressRef.current = true;

      try {
        const data = await api(
          `/posts?page=1&limit=${POSTS_PER_PAGE}`
        );

        const list = Array.isArray(data)
          ? data
          : data.posts || [];

        if (!cancelled) {
          setPosts(list);
          setPage(1);
          setHasMore(
            typeof data.hasMore === "boolean"
              ? data.hasMore
              : list.length === POSTS_PER_PAGE
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Unable to load stories.");
        }
      } finally {
        requestInProgressRef.current = false;

        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadInitialPosts();

    return () => {
      cancelled = true;
    };
  }, []);

  // Load the next page when the user scrolls near the bottom.
  const loadMorePosts = useCallback(async () => {
    if (
      requestInProgressRef.current ||
      loading ||
      loadingMore ||
      !hasMore ||
      error
    ) {
      return;
    }

    requestInProgressRef.current = true;
    setLoadingMore(true);
    setError("");

    const nextPage = page + 1;

    try {
      const data = await api(
        `/posts?page=${nextPage}&limit=${POSTS_PER_PAGE}`
      );

      const list = Array.isArray(data)
        ? data
        : data.posts || [];

      setPosts((previousPosts) => {
        // Prevent duplicate posts if a request is repeated.
        const existingIds = new Set(
          previousPosts.map((post) => post.id)
        );

        const newPosts = list.filter(
          (post) => !existingIds.has(post.id)
        );

        return [...previousPosts, ...newPosts];
      });

      setPage(nextPage);

      setHasMore(
        typeof data.hasMore === "boolean"
          ? data.hasMore
          : list.length === POSTS_PER_PAGE
      );
    } catch (err) {
      setError(err.message || "Unable to load more stories.");
    } finally {
      requestInProgressRef.current = false;
      setLoadingMore(false);
    }
  }, [page, loading, loadingMore, hasMore, error]);

  // Observe the element at the bottom of the story grid.
  useEffect(() => {
    const target = observerRef.current;

    if (!target || !hasMore || loading || error) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMorePosts();
        }
      },
      {
        root: null,
        rootMargin: "300px",
        threshold: 0,
      }
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [loadMorePosts, hasMore, loading, error]);

  function formatDate(date) {
    if (!date) return "Recently published";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return "Recently published";
    }

    return parsed.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  // Read category values from the post data returned by the API.
  // If a post has no category saved in the database, it is grouped as Uncategorized.
  function getPostCategory(post) {
    return (
      post.category_name ||
      post.category ||
      post.categoryName ||
      "Uncategorized"
    ).toString().trim() || "Uncategorized";
  }

const categoryOptions = [
  "all",
  "Horror Story",
  "Romantic Story",
  "Valuable Story",
  "Learning Story",
];
  
  // Search, filter by category, and sort the loaded stories.
  const filteredPosts = posts
    .filter((post) => {
      const author =
        post.author_name ||
        post.author?.name ||
        post.user_name ||
        post.name ||
        "Blog Author";

      const searchableText = [
        post.title || "",
        // post.content || "",
        author,
      ]
        .join(" ")
        .toLowerCase();

      // Public landing page always shows the full collection.
      // Search and category filtering apply only to logged-in users.
      const matchesSearch =
        !user ||
        searchableText.includes(searchTerm.trim().toLowerCase());

      const matchesCategory =
        !user ||
        selectedCategory === "all" ||
        getPostCategory(post).toLowerCase() ===
          selectedCategory.toLowerCase();

      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      // Keep the public landing page in its normal newest-first order.
      if (!user) {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }

      if (sortBy === "oldest") {
        return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      }

      if (sortBy === "title") {
        return (a.title || "").localeCompare(b.title || "");
      }

      if (sortBy === "likes") {
        const likesA = Number(a.total_likes ?? a.likes ?? a.like_count ?? 0);
        const likesB = Number(b.total_likes ?? b.likes ?? b.like_count ?? 0);
        return likesB - likesA;
      }

      // Newest first is the default.
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

  const hasActiveFilters =
    selectedCategory !== "all" || sortBy !== "newest" || searchTerm.trim() !== "";

  return (
    <main className="home-page">
      {/* PUBLIC LANDING HERO */}
      {!user && (
        <>
          <section className="welcome-hero">
            <div className="hero-copy">
              <div className="hero-eyebrow">
                <span>✦</span> A TREASURE TROVE OF BOOKS
              </div>

              <h1>
                Welcome to
                <span>Social Blog.</span>
              </h1>

              <div className="hero-underline" />

              <p className="hero-lead">
                A space for thoughtful words, fresh perspectives,
                and stories worth sharing.
              </p>

              <p className="hero-description">
                Discover inspiring stories, explore new ideas,
                and enjoy a community that believes in the
                power of good writing. Every page holds a new
                perspective, and every story has something to say.
              </p>

              <div className="hero-highlights">
                <div className="hero-highlight">
                  <span className="highlight-icon">♧</span>
                  <strong>Read</strong>
                  <small>Amazing stories</small>
                </div>

                <div className="hero-highlight">
                  <span className="highlight-icon">✎</span>
                  <strong>Share</strong>
                  <small>Your thoughts</small>
                </div>

                <div className="hero-highlight">
                  <span className="highlight-icon">♡</span>
                  <strong>Connect</strong>
                  <small>With a community</small>
                </div>
              </div>

              <a
                className="wallpaper-hero-link"
                href="#discover-stories"
              >
                Discover stories <span>↓</span>
              </a>
            </div>

           <div className="hero-visual">
              <img
                src="/images/reading-hero.jpeg"
                alt="A peaceful reading corner filled with books and warm sunlight"
              />
              <div className="hero-image-caption">
                <span>YOUR NEXT CHAPTER STARTS HERE</span>
                <strong>Every story opens a new world.</strong>
              </div>
            </div>
          </section>

          <section className="hero-features">
            <article className="feature-item">
              <span>♧</span>
              <h3>Inspiring Stories</h3>
              <p>Discover ideas that stay with you.</p>
            </article>

            <article className="feature-item">
              <span>❧</span>
              <h3>Fresh Perspectives</h3>
              <p>See the world through new eyes.</p>
            </article>

            <article className="feature-item">
              <span>♧</span>
              <h3>Growing Community</h3>
              <p>Connect through words and ideas.</p>
            </article>

            <article className="feature-item">
              <span>♡</span>
              <h3>Built with Passion</h3>
              <p>Because every story matters.</p>
            </article>
          </section>
        </>
      )}

      {/* STORY COLLECTION */}
      <section
        className="discover-section"
        id="discover-stories"
      >
        <div className="discover-heading">
          <div className="discover-heading-copy">
            <span className="discover-eyebrow">
              {user
                ? "YOUR DAILY DOSE OF INSPIRATION"
                : "EXPLORE THE COLLECTION"}
            </span>

            <h2>
              Stories Worth <span>Discovering.</span>
            </h2>

            <p>
              A collection of ideas, books, and perspectives
              waiting to be explored.
            </p>
          </div>

          {!loading && !error && (
            <span className="discover-count">
              {filteredPosts.length}{" "}
              {filteredPosts.length === 1 ? "STORY" : "STORIES"}
            </span>
          )}
        </div>

        {user && (
          <>
        {/* SEARCH BAR */}
        <div className="blog-search">
          <span className="search-icon" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              width="21"
              height="21"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="10.8" cy="10.8" r="6.8" />
              <path d="m16 16 4.2 4.2" />
            </svg>
          </span>

          <input
            type="search"
            aria-label="Search stories"
            placeholder="Search stories, books, authors..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />

          {searchTerm && (
            <button
              type="button"
              className="search-clear"
              onClick={() => setSearchTerm("")}
              aria-label="Clear search"
              title="Clear search"
            >
              ×
            </button>
          )}
        </div>

        {/* CATEGORY FILTER + SORT CONTROLS */}
        <div className="story-toolbar">
          <div className="story-toolbar-left">
            <div className="story-control-wrap">
              <button
                type="button"
                className={`story-toolbar-button ${filterMenuOpen || selectedCategory !== "all" ? "is-active" : ""}`}
                aria-expanded={filterMenuOpen}
                aria-haspopup="true"
                onClick={() => {
                  setFilterMenuOpen((open) => !open);
                  setSortMenuOpen(false);
                }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 7h16M7 12h10m-7 5h4" />
                </svg>
                Filter
                {selectedCategory !== "all" && (
                  <span className="story-control-dot" />
                )}
                <span className="story-control-chevron">⌄</span>
              </button>

              {filterMenuOpen && (
                <div className="story-dropdown story-filter-dropdown">
                  <div className="story-dropdown-heading">
                    <strong>Filter by category</strong>
                    <span>Choose a topic</span>
                  </div>
                  {categoryOptions.map((category) => (
                    <button
                      type="button"
                      className={`story-dropdown-option ${selectedCategory === category ? "selected" : ""}`}
                      key={category}
                      onClick={() => {
                        setSelectedCategory(category);
                        setFilterMenuOpen(false);
                      }}
                    >
                      <span>
                        {category === "all" ? "All categories" : category}
                      </span>
                      {selectedCategory === category && (
                        <span className="story-option-check">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="story-control-wrap">
              <button
                type="button"
                className={`story-toolbar-button ${sortMenuOpen || sortBy !== "newest" ? "is-active" : ""}`}
                aria-expanded={sortMenuOpen}
                aria-haspopup="true"
                onClick={() => {
                  setSortMenuOpen((open) => !open);
                  setFilterMenuOpen(false);
                }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 4v16m0 0-4-4m4 4 4-4M16 20V4m0 0-4 4m4-4 4 4" />
                </svg>
                Sort by
                <span className="story-control-chevron">⌄</span>
              </button>

              {sortMenuOpen && (
                <div className="story-dropdown story-sort-dropdown">
                  <div className="story-dropdown-heading">
                    <strong>Sort stories</strong>
                    <span>Arrange the collection</span>
                  </div>
                  {[
                    { value: "newest", label: "Newest first", detail: "Recently published" },
                    { value: "oldest", label: "Oldest first", detail: "First published" },
                    { value: "title", label: "Title: A–Z", detail: "Alphabetical order" },
                    { value: "likes", label: "Most liked", detail: "Popular stories first" },
                  ].map((option) => (
                    <button
                      type="button"
                      className={`story-dropdown-option story-sort-option ${sortBy === option.value ? "selected" : ""}`}
                      key={option.value}
                      onClick={() => {
                        setSortBy(option.value);
                        setSortMenuOpen(false);
                      }}
                    >
                      <span className="story-sort-option-copy">
                        <strong>{option.label}</strong>
                        <small>{option.detail}</small>
                      </span>
                      {sortBy === option.value && (
                        <span className="story-option-check">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="story-toolbar-right">
            {selectedCategory !== "all" && (
              <span className="story-active-filter">
                {selectedCategory}
                <button
                  type="button"
                  aria-label="Remove category filter"
                  onClick={() => setSelectedCategory("all")}
                >
                  ×
                </button>
              </span>
            )}
            {hasActiveFilters && (
              <button
                type="button"
                className="story-reset-button"
                onClick={() => {
                  setSelectedCategory("all");
                  setSortBy("newest");
                  setSearchTerm("");
                  setFilterMenuOpen(false);
                  setSortMenuOpen(false);
                }}
              >
                Reset
              </button>
            )}
          </div>
        </div>
          </>
        )}

        <style>{`
          .story-toolbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 14px;
            flex-wrap: wrap;
            margin: 18px 0 28px;
            position: relative;
            z-index: 5;
          }
          .story-toolbar-left, .story-toolbar-right {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
          }
          .story-control-wrap { position: relative; }
          .story-toolbar-button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 9px;
            min-height: 44px;
            padding: 0 16px;
            border: 1px solid #e3dfd6;
            border-radius: 12px;
            background: #fffdf9;
            color: #34342f;
            font: inherit;
            font-size: 14px;
            font-weight: 650;
            cursor: pointer;
            transition: border-color .2s ease, background .2s ease, box-shadow .2s ease;
          }
          .story-toolbar-button:hover, .story-toolbar-button.is-active {
            border-color: #a58a60;
            background: #f8f3e9;
            box-shadow: 0 4px 14px rgba(64, 49, 25, .06);
          }
          .story-toolbar-button svg {
            width: 18px;
            height: 18px;
            fill: none;
            stroke: currentColor;
            stroke-width: 1.7;
            stroke-linecap: round;
            stroke-linejoin: round;
          }
          .story-control-chevron { margin-left: 3px; color: #777267; font-size: 16px; }
          .story-control-dot { width: 6px; height: 6px; border-radius: 50%; background: #967344; }
          .story-dropdown {
            position: absolute;
            top: calc(100% + 9px);
            left: 0;
            width: 250px;
            max-width: min(280px, calc(100vw - 40px));
            padding: 9px;
            border: 1px solid #e8e2d8;
            border-radius: 16px;
            background: #fffefa;
            box-shadow: 0 18px 45px rgba(38, 32, 22, .14);
            z-index: 20;
            animation: storyDropdownIn .16s ease-out;
          }
          .story-sort-dropdown { width: 270px; }
          .story-dropdown-heading { display: flex; flex-direction: column; gap: 3px; padding: 10px 10px 12px; }
          .story-dropdown-heading strong { color: #292820; font-size: 13px; }
          .story-dropdown-heading span { color: #8b8579; font-size: 12px; }
          .story-dropdown-option {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            border: 0;
            border-radius: 10px;
            background: transparent;
            padding: 11px 10px;
            color: #48463f;
            text-align: left;
            font: inherit;
            font-size: 13px;
            cursor: pointer;
          }
          .story-dropdown-option:hover { background: #f7f3eb; }
          .story-dropdown-option.selected { background: #f3ede1; color: #74572f; font-weight: 650; }
          .story-option-check { font-size: 15px; font-weight: 800; }
          .story-sort-option { align-items: center; }
          .story-sort-option-copy { display: flex; flex-direction: column; gap: 3px; }
          .story-sort-option-copy strong { font-size: 13px; font-weight: 650; }
          .story-sort-option-copy small { color: #8b8579; font-size: 11px; font-weight: 400; }
          .story-active-filter {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 7px 10px;
            border-radius: 999px;
            background: #f3ede1;
            color: #74572f;
            font-size: 12px;
            font-weight: 650;
          }
          .story-active-filter button {
            border: 0;
            background: transparent;
            color: inherit;
            font-size: 17px;
            line-height: 1;
            cursor: pointer;
          }
          .story-reset-button {
            border: 0;
            background: transparent;
            color: #806640;
            font: inherit;
            font-size: 13px;
            font-weight: 650;
            cursor: pointer;
            padding: 8px 4px;
          }
          .story-reset-button:hover { color: #45331c; text-decoration: underline; }
          @keyframes storyDropdownIn {
            from { opacity: 0; transform: translateY(-5px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @media (max-width: 520px) {
            .story-toolbar { align-items: flex-start; }
            .story-toolbar-left { width: 100%; }
            .story-control-wrap { flex: 1; }
            .story-toolbar-button { width: 100%; padding: 0 11px; }
            .story-dropdown { width: 100%; min-width: 0; }
            .story-toolbar-right { width: 100%; justify-content: flex-start; }
          }
        `}</style>

        {/* INITIAL LOADING */}
        {loading && (
          <div className="discover-message">
            <div className="loading-spinner" />
            <p>Discovering stories...</p>
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div className="discover-message" role="alert">
            <p>{error}</p>

            <button
              type="button"
              className="button button-ghost"
              onClick={() => {
                if (posts.length === 0) {
                  window.location.reload();
                } else {
                  loadMorePosts();
                }
              }}
            >
              Try again
            </button>
          </div>
        )}

        {/* NO POSTS */}
        {!loading && !error && posts.length === 0 && (
          <div className="discover-message">
            <span className="discover-empty-icon">✧</span>
            <h3>The first page is waiting to be written.</h3>
            <p>Come back soon to discover new stories.</p>
          </div>
        )}

        {/* NO SEARCH RESULTS AMONG LOADED POSTS */}
        {!loading &&
          !error &&
          posts.length > 0 &&
          filteredPosts.length === 0 && (
            <div className="discover-message search-empty-state">
              <span className="discover-empty-icon">⌕</span>
              <h3>No stories found</h3>

              <p>
                No loaded stories match your current search and category.
                Try another keyword or reset your filters.
              </p>

              <button
                type="button"
                className="button button-ghost"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedCategory("all");
                }}
              >
                Clear search and filters
              </button>
            </div>
          )}

        {/* STORY GRID */}
        {!loading && !error && filteredPosts.length > 0 && (
          <div className="wallpaper-grid">
            {filteredPosts.map((post, index) => {
              const author =
                post.author_name ||
                post.author?.name ||
                post.user_name ||
                post.name ||
                "Blog Author";

              return (
                <Link
                  to={`/posts/${post.id}`}
                  className={`wallpaper-card ${
                    index === 0 ? "wallpaper-card-featured" : ""
                  }`}
                  key={post.id}
                  aria-label={`Read ${post.title}`}
                >
                  <div className="wallpaper-image-wrap">
                    {post.image ? (
                      <img
  className="wallpaper-image"
  src={imageUrl(post.image)}
  alt={post.title || "Story cover"}
  loading="lazy"
  onError={(event) => {
    console.error("Image failed to load:", {
      originalPath: post.image,
      requestedUrl: event.currentTarget.src,
    });
  }}
/>
                    ) : (
                      <div className="wallpaper-placeholder">
                        <span>𝚂.</span>
                        <p>A STORY TO DISCOVER</p>
                      </div>
                    )}

                    <div className="wallpaper-overlay" />

                    <div className="wallpaper-top-label">
                      <span>✦</span> SOCIAL BLOG
                    </div>

                    <div className="wallpaper-card-content">
                      <span className="wallpaper-category">
                        {index === 0
                          ? "FEATURED STORY"
                          : "STORY COLLECTION"}
                      </span>

                      <h3>{post.title || "Untitled story"}</h3>

                      <div className="wallpaper-card-meta">
                        <span>By {author}</span>
                        <span className="wallpaper-meta-dot">·</span>
                        <time>
                          {formatDate(post.created_at)}
                        </time>
                      </div>

                      <span className="wallpaper-read-link">
                        Explore story <span>↗</span>
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* INFINITE SCROLL TRIGGER */}
        {!loading &&
          !error &&
          hasMore &&
          posts.length > 0 && (
            <div
              ref={observerRef}
              className="infinite-scroll-trigger"
              aria-live="polite"
            >
              {loadingMore && (
                <div className="discover-message">
                  <div className="loading-spinner" />
                  <p>Loading more stories...</p>
                </div>
              )}
            </div>
          )}

        {/* END OF COLLECTION */}
        {!loading &&
          !error &&
          !hasMore &&
          posts.length > 0 && (
            <div className="infinite-scroll-end">
              <span>✦</span>
              <p>YOU'VE REACHED THE END OF THE COLLECTION.</p>
            </div>
          )}

        {!user && (
          <div className="discover-footer">
            <span className="discover-footer-line" />
            <p>GOOD STORIES DESERVE TO BE SHARED.</p>
            <span className="discover-footer-line" />
          </div>
        )}
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
  const [isPostOwner, setIsPostOwner] = useState(false);

  // Comments
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentBusy, setCommentBusy] = useState(false);
  const [commentError, setCommentError] = useState("");

  // Load post details
  useEffect(() => {
    let active = true;

    async function loadPost() {
      setLoading(true);
      setPost(null);
      setError("");

      try {
        const data = await api(`/posts/${id}`);

        if (active) {
          setPost(data.post || data);
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Could not load this article.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadPost();

    return () => {
      active = false;
    };
  }, [id]);

  // Load Like / Dislike totals
  useEffect(() => {
    let active = true;

    async function loadLikes() {
      try {
        const data = await getPostLikes(id);

        if (active) {
          const owner = Boolean(data.isPostOwner);

          setIsPostOwner(owner);
          setLikes({
            totalLikes: Number(data.totalLikes) || 0,
            totalDislikes: owner
              ? Number(data.totalDislikes) || 0
              : 0,
            userVote: user ? Number(data.userVote) || 0 : 0,
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

  // Load comments
  const loadComments = useCallback(async () => {
    setCommentsLoading(true);
    setCommentError("");

    try {
      const data = await api(`/posts/${id}/comments`);
      const list = Array.isArray(data)
        ? data
        : data.comments || [];

      setComments(list);
    } catch (err) {
      setCommentError(err.message || "Could not load comments.");
    } finally {
      setCommentsLoading(false);
    }
  }, [id]);

  // Load comments when the post page opens
  useEffect(() => {
    loadComments();
  }, [loadComments]);

  // Sort comments newest first
  const sortedComments = [...comments].sort((a, b) => {
    const dateA = new Date(a.created_at || 0).getTime();
    const dateB = new Date(b.created_at || 0).getTime();

    if (dateA !== dateB) {
      return dateB - dateA;
    }

    return Number(b.id || 0) - Number(a.id || 0);
  });

  // Latest three comments appear on the page
  const latestComments = sortedComments.slice(0, 3);

  // Older comments appear in the popup
  const olderComments = sortedComments.slice(3);

  // Like / Dislike
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

      setLikes((previous) => ({
        totalLikes: Number(data.totalLikes) || 0,
        totalDislikes: isPostOwner
          ? Number(data.totalDislikes ?? previous.totalDislikes) || 0
          : 0,
        userVote: Number(data.userVote) || 0,
      }));
    } catch (err) {
      setVoteError(err.message || "Could not save your vote.");
    } finally {
      setVoteBusy(false);
    }
  }

  // Submit a comment
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

      setCommentText("");

      // Refresh from the database to keep the count and order correct.
      await loadComments();

      // Support APIs that return a newly created comment.
      if (data.comment) {
        setComments((previous) => {
          const exists = previous.some(
            (item) => String(item.id) === String(data.comment.id)
          );

          return exists ? previous : [...previous, data.comment];
        });
      }
    } catch (err) {
      setCommentError(
        err.message || "Could not submit your comment."
      );
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

        {/* Like and Dislike */}
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

<div className="read-post-vote-group">
  <button
    type="button"
    className={`read-post-vote ${
      likes.userVote === 1 ? "is-active" : ""
    }`}
    onClick={() => handleVote(1)}
    disabled={voteBusy}
    aria-label="Like post"
    aria-pressed={likes.userVote === 1}
  >
    <svg
      className="thumb-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        d="M7 10v11H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3Zm0 0 5-8c2 0 3 2 2 4l-1 4h5a3 3 0 0 1 3 4l-2 6a3 3 0 0 1-3 2H7"
      />
    </svg>
    <span>{likes.totalLikes}</span>
  </button>

  <button
    type="button"
    className={`read-post-vote ${
      likes.userVote === -1 ? "is-active" : ""
    }`}
    onClick={() => handleVote(-1)}
    disabled={voteBusy}
    aria-label="Dislike post"
    aria-pressed={likes.userVote === -1}
  >
    <svg
      className="thumb-icon thumb-down"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        d="M7 14V3H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3Zm0 0 5 8c2 0 3-2 2-4l-1-4h5a3 3 0 0 0 3-4l-2-6a3 3 0 0 0-3-2H7"
      />
    </svg>
    <span>{likes.totalDislikes}</span>
  </button>
</div>


          {voteBusy && (
            <p className="read-post-voting-status">
              Saving your reaction...
            </p>
          )}

          {/* Comment box directly below Like / Dislike */}
          <section className="read-post-comments">
            <div className="read-post-comments-heading">
              <div>
                <h2>Comments</h2>
                <p>
                  Join the conversation · {comments.length} comments
                </p>
              </div>
            </div>

            {commentError && (
              <p className="alert" role="alert">
                {commentError}
              </p>
            )}

            <form
              className="comment-popup-form comment-inline-form"
              onSubmit={handleCommentSubmit}
            >
              <label htmlFor="new-comment">
                Write a comment
              </label>

              <textarea
                id="new-comment"
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                placeholder={
                  user
                    ? "Share your thoughts about this post..."
                    : "Sign in to share your thoughts..."
                }
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
                  <i
                    className="fa-regular fa-paper-plane"
                    aria-hidden="true"
                  />
                  {commentBusy ? "Sending..." : "Post Comment"}
                </button>
              </div>
            </form>

            {/* Latest three comments */}
            <div className="latest-comments-section">
              <h3>Latest comments</h3>

              {commentsLoading ? (
                <p className="comment-empty">
                  Loading comments...
                </p>
              ) : comments.length === 0 ? (
                <div className="comment-empty">
                  <i
                    className="fa-regular fa-comments"
                    aria-hidden="true"
                  />
                  <p>No comments yet.</p>
                  <span>
                    Be the first to share your thoughts.
                  </span>
                </div>
              ) : (
                <div className="latest-comments-list">
                  {latestComments.map((item) => (
                    <article className="comment-item" key={item.id}>
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
                  ))}
                </div>
              )}

              {/* Older comments popup button */}
              {olderComments.length > 0 && (
                <button
                  type="button"
                  className="see-more-comments"
                  onClick={() => setCommentsOpen(true)}
                >
                  See more comments ({olderComments.length})
                  <span aria-hidden="true"> →</span>
                </button>
              )}
            </div>
          </section>
        </section>
      </article>

      {/* Popup showing comments older than the latest three */}
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
                <h2 id="comment-popup-title">More comments</h2>
                <p>{olderComments.length} older comments</p>
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
                <p className="comment-empty">
                  Loading comments...
                </p>
              ) : olderComments.length === 0 ? (
                <div className="comment-empty">
                  <i
                    className="fa-regular fa-comments"
                    aria-hidden="true"
                  />
                  <p>No older comments yet.</p>
                </div>
              ) : (
                olderComments.map((item) => (
                  <article className="comment-item" key={item.id}>
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
  const PAGE_SIZE = 8;

  const [posts, setPosts] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const sentinelRef = useRef(null);
  const pageRef = useRef(1);
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);

  // Update hasMore in both React state and ref.
  function updateHasMore(value) {
    hasMoreRef.current = value;
    setHasMore(value);
  }

  // Load the first batch of posts.
  const loadInitialPosts = useCallback(async () => {
    loadingRef.current = true;
    setLoading(true);
    setError("");
    pageRef.current = 1;

    try {
      const data = await api(
        `/posts?page=1&limit=${PAGE_SIZE}`
      );

      const firstBatch = Array.isArray(data)
        ? data
        : Array.isArray(data?.posts)
          ? data.posts
          : [];

      setPosts(firstBatch);
      pageRef.current = 1;

      updateHasMore(
        typeof data?.hasMore === "boolean"
          ? data.hasMore
          : firstBatch.length === PAGE_SIZE
      );
    } catch (err) {
      setError(err.message || "Could not load posts.");
      setPosts([]);
      updateHasMore(false);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialPosts();
  }, [loadInitialPosts]);

  // Load the next batch when the admin scrolls down.
  const loadMorePosts = useCallback(async () => {
    if (loadingRef.current || !hasMoreRef.current) {
      return;
    }

    loadingRef.current = true;
    setLoadingMore(true);
    setError("");

    const nextPage = pageRef.current + 1;

    try {
      const data = await api(
        `/posts?page=${nextPage}&limit=${PAGE_SIZE}`
      );

      const nextBatch = Array.isArray(data)
        ? data
        : Array.isArray(data?.posts)
          ? data.posts
          : [];

      // Append new posts without duplicating existing IDs.
      setPosts((previous) => {
        const existingIds = new Set(
          previous.map((post) => String(post.id))
        );

        const uniquePosts = nextBatch.filter(
          (post) => !existingIds.has(String(post.id))
        );

        return [...previous, ...uniquePosts];
      });

      pageRef.current = nextPage;

      updateHasMore(
        typeof data?.hasMore === "boolean"
          ? data.hasMore
          : nextBatch.length === PAGE_SIZE
      );
    } catch (err) {
      setError(err.message || "Could not load more posts.");
    } finally {
      loadingRef.current = false;
      setLoadingMore(false);
    }
  }, []);

  // Observe the element at the bottom of the list.
  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (!sentinel || loading || !hasMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMorePosts();
        }
      },
      {
        root: null,
        rootMargin: "300px",
        threshold: 0,
      }
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [loading, loadingMore, hasMore, loadMorePosts]);

  // Delete a post as an admin.
  async function remove(post) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${post.title}"? This cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingId(post.id);
    setError("");
    setMessage("");

    try {
      await api(`/posts/${post.id}`, {
        method: "DELETE",
      });

      setPosts((previous) =>
        previous.filter(
          (item) => String(item.id) !== String(post.id)
        )
      );

      setMessage(`"${post.title}" deleted successfully.`);
    } catch (err) {
      setError(err.message || "Could not delete the post.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="content-section admin-section">
      <div className="admin-heading">
          <span className="admin-tag">ADMIN</span>
      </div>

      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      {message && (
        <p className="success" role="status">
          {message}
        </p>
      )}

      <div className="section-heading manage-heading">
        <h2>All Published Posts ({posts.length})</h2>
      </div>

      {loading && <p>Loading posts...</p>}

      {!loading && posts.length === 0 && !error && (
        <p className="muted">No published posts found.</p>
      )}

      <div className="manage-list">
        {posts.map((post) => (
          <article className="manage-item" key={post.id}>
            <div className="manage-copy">
              {post.image && (
                <img
                  className="manage-image"
                  src={imageUrl(post.image)}
                  alt={post.title || "Post image"}
                  loading="lazy"
                />
              )}

              <h3>{post.title}</h3>

              <p className="muted">
                Author:{" "}
                {post.author_name ||
                  post.author?.name ||
                  post.user_name ||
                  "Unknown author"}
              </p>

              <p className="muted">
                Published:{" "}
                {post.created_at
                  ? new Date(
                      post.created_at
                    ).toLocaleDateString()
                  : "Date unavailable"}
              </p>
            </div>

            <div className="manage-actions">
              <button
                type="button"
                className="button button-ghost"
                onClick={() => {
                  window.location.assign(
                    `/posts/${post.id}`
                  );
                }}
              >
                View Post
              </button>

              <button
                type="button"
                className="button button-danger"
                disabled={deletingId !== null}
                onClick={() => remove(post)}
              >
                {deletingId === post.id
                  ? "Deleting..."
                  : "Delete"}
              </button>
            </div>
          </article>
        ))}
      </div>

      {/* Infinite-scroll trigger */}
      {!loading && hasMore && (
        <div
          ref={sentinelRef}
          className="admin-scroll-trigger"
          aria-hidden="true"
        />
      )}

      {loadingMore && (
        <p className="admin-scroll-status" role="status">
          Loading more posts...
        </p>
      )}

      {!loading && !hasMore && posts.length > 0 && (
        <p className="admin-scroll-status">
          You've reached the end of all posts.
        </p>
      )}
    </main>
  );
}

// =========================
// NORMAL USER: CREATE POST
// =========================

function CreatePost() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    content: "",
    category: "Learning Story",
  });

  const [imageFile, setImageFile] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previousForm) => ({
      ...previousForm,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");

    if (!form.title.trim() || !form.content.trim()) {
      setError("Please enter both a title and story content.");
      return;
    }

    try {
      setBusy(true);

      const formData = new FormData();

      formData.append("title", form.title.trim());
      formData.append("content", form.content.trim());
      formData.append("category", form.category);

      if (imageFile) {
        formData.append("image", imageFile);
      }

      const response = await fetch(
        "http://localhost:5001/api/posts",
        {
          method: "POST",
          credentials: "include",
          body: formData,
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message || "Could not create the post."
        );
      }

      navigate("/my-posts", {
        state: {
          success: "Your story was published successfully!",
        },
      });
    } catch (err) {
      setError(
        err.message || "Something went wrong while publishing."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="create-post-page">
      <div className="create-post-container">
        <div className="create-post-heading">
          <span className="create-post-eyebrow">
            SHARE YOUR WORDS
          </span>

          <h1>Create a Story</h1>

          <p>
            Every great story begins with an idea.
            Share yours with the Social Blog community.
          </p>
        </div>

        <form
          className="create-post-form"
          onSubmit={handleSubmit}
        >
          {error && (
            <div className="create-post-error" role="alert">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="post-title">
              Story Title
            </label>

            <input
              id="post-title"
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Enter your story title"
              maxLength={200}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="post-category">
              Story Category
            </label>

            <select
              id="post-category"
              name="category"
              value={form.category}
              onChange={handleChange}
              required
            >
              <option value="Horror Story">
                Horror Story
              </option>

              <option value="Romantic Story">
                Romantic Story
              </option>

              <option value="Valuable Story">
                Valuable Story
              </option>

              <option value="Learning Story">
                Learning Story
              </option>
            </select>

            <small>
              Choose the category that best describes your story.
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="post-content">
              Story Content
            </label>

            <textarea
              id="post-content"
              name="content"
              value={form.content}
              onChange={handleChange}
              placeholder="Start writing your story here..."
              rows={10}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="post-image">
              Cover Image (Optional)
            </label>

            <input
              id="post-image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0] || null;

                if (file && file.size > 5 * 1024 * 1024) {
                  setError("Image must be 5 MB or smaller.");
                  event.target.value = "";
                  setImageFile(null);
                  return;
                }

                setError("");
                setImageFile(file);
              }}
            />

            <small>
              Supported formats: JPG, PNG, and WebP. Maximum size: 5 MB.
            </small>
          </div>

          {imageFile && (
            <p className="selected-image-name">
              Selected image: {imageFile.name}
            </p>
          )}

          <button
            type="submit"
            className="button button-primary"
            disabled={busy}
          >
            {busy ? "Publishing..." : "Publish Story"}
          </button>
        </form>
      </div>
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
// PROFILE DRAWER
// =========================




 
const EMPTY_STATS = {
  totalPosts: 0,
  totalLikes: 0,
  totalComments: 0,
};

const ACTIVITY_TITLES = {
  posts: "My Posts",
  likes: "People Who Liked My Posts",
  comments: "Comments on My Posts",
};

function formatDate(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getActivityItems(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.activity)) return data.activity;
  if (Array.isArray(data?.posts)) return data.posts;
  if (Array.isArray(data?.likes)) return data.likes;
  if (Array.isArray(data?.comments)) return data.comments;

  return [];
}

function ProfileDrawer({ user, onClose, onLogout }) {
  const [stats, setStats] = React.useState({
    totalPosts: 0,
    totalLikes: 0,
    totalComments: 0,
  });

  const [statsLoading, setStatsLoading] = React.useState(true);
  const [statsError, setStatsError] = React.useState("");

  const [activeActivity, setActiveActivity] = React.useState("");
  const [activityItems, setActivityItems] = React.useState([]);
  const [activityLoading, setActivityLoading] = React.useState(false);
  const [activityError, setActivityError] = React.useState("");

  const [aboutEditorOpen, setAboutEditorOpen] = React.useState(false);
  const [aboutText, setAboutText] = React.useState(user?.about || "");
  const [aboutDraft, setAboutDraft] = React.useState(user?.about || "");

  const displayName = user?.name || user?.username || "Reader";
  const initial = displayName.trim().charAt(0).toUpperCase() || "R";
  const avatar =
    user?.picture || user?.avatar || user?.avatar_url || "";

  React.useEffect(() => {
    setAboutText(user?.about || "");
    setAboutDraft(user?.about || "");
  }, [user?.id, user?.about]);

  React.useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        if (aboutEditorOpen) {
          setAboutEditorOpen(false);
        } else if (activeActivity) {
          setActiveActivity("");
        } else {
          onClose?.();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [aboutEditorOpen, activeActivity, onClose]);


async function loadStats() {
  setStatsLoading(true);
  setStatsError("");

  try {
    const data = await api("/posts/profile/stats");

    setStats({
      totalPosts: Number(data?.posts ?? data?.totalPosts ?? data?.total_posts ?? 0),
      totalLikes: Number(data?.likes ?? data?.totalLikes ?? data?.total_likes ?? 0),
      totalComments: Number(
        data?.comments ?? data?.totalComments ?? data?.total_comments ?? 0
      ),
    });
  } catch (error) {
    setStatsError(
      error?.message || "Unable to load your profile statistics."
    );
  } finally {
    setStatsLoading(false);
  }
}

  React.useEffect(() => {
    if (user?.id) {
      loadStats();
    } else {
      setStatsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function openActivity(type) {
    setActiveActivity(type);
    setActivityItems([]);
    setActivityError("");
    setActivityLoading(true);

    try {
      const data = await api(
        `/posts/profile/activity?type=${encodeURIComponent(type)}`
      );

      const items = Array.isArray(data)
        ? data
        : data?.items ||
          data?.activity ||
          data?.posts ||
          data?.likes ||
          data?.comments ||
          [];

      setActivityItems(Array.isArray(items) ? items : []);
    } catch (error) {
      setActivityError(
        error?.message || "Unable to load activity. Please try again."
      );
    } finally {
      setActivityLoading(false);
    }
  }

  function formatDate(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  if (!user) return null;

  const activityTitles = {
    posts: "My Posts",
    likes: "People Who Liked My Posts",
    comments: "Comments on My Posts",
  };

  return (
    <>
      <div className="pd-backdrop" onClick={onClose} />

      <aside
        className="pd-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Your profile"
      >
        <div className="pd-topbar">
          <span className="pd-topbar-label">YOUR SPACE</span>

          <button
            type="button"
            className="pd-icon-button"
            onClick={onClose}
            aria-label="Close profile"
          >
            ×
          </button>
        </div>

        <div className="pd-cover">
          <span className="pd-cover-decoration pd-decoration-one" />
          <span className="pd-cover-decoration pd-decoration-two" />
          <span className="pd-cover-tag">S. SOCIAL BLOG</span>
        </div>

        <div className="pd-profile-content">
          <div className="pd-avatar-wrap">
            {avatar && (
              <img
                className="pd-avatar"
                src={avatar}
                alt={displayName}
                referrerPolicy="no-referrer"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                  const fallback = event.currentTarget.nextElementSibling;
                  if (fallback) fallback.style.display = "grid";
                }}
              />
            )}

            <div
              className="pd-avatar-fallback"
              style={{ display: avatar ? "none" : "grid" }}
            >
              {initial}
            </div>
          </div>

          <div className="pd-identity">
            <span className="pd-eyebrow">WELCOME BACK</span>
            <h2>{displayName}</h2>

            {user.email && <p className="pd-email">{user.email}</p>}

            {user.role === "admin" && (
              <span className="pd-role">Administrator</span>
            )}
          </div>

          <section className="pd-about-section">
            <div className="pd-section-heading">
              <h3>About Me</h3>

              <button
                type="button"
                className="pd-text-button"
                onClick={() => {
                  setAboutDraft(aboutText);
                  setAboutEditorOpen(true);
                }}
              >
                Edit
              </button>
            </div>

            <p className="pd-about-text">
              {aboutText.trim() ||
                "A little space to introduce yourself to the reading community."}
            </p>
          </section>

          <section className="pd-stats-section">
            <div className="pd-section-heading">
              <h3>Your Activity</h3>

              <button
                type="button"
                className="pd-refresh-button"
                onClick={loadStats}
                disabled={statsLoading}
                aria-label="Refresh statistics"
              >
                ↻
              </button>
            </div>

            {statsError && (
              <div className="pd-inline-error" role="alert">
                <span>{statsError}</span>
                <button type="button" onClick={loadStats}>
                  Retry
                </button>
              </div>
            )}

            <div className="pd-stats-grid">
              <button
                type="button"
                className="pd-stat-card"
                onClick={() => openActivity("posts")}
              >
                <span className="pd-stat-icon">▤</span>
                <span className="pd-stat-number">
                  {statsLoading ? "—" : stats.totalPosts}
                </span>
                <span className="pd-stat-label">Total Posts</span>
                <span className="pd-stat-hint">View posts ↗</span>
              </button>

              <button
                type="button"
                className="pd-stat-card"
                onClick={() => openActivity("likes")}
              >
                <span className="pd-stat-icon">♡</span>
                <span className="pd-stat-number">
                  {statsLoading ? "—" : stats.totalLikes}
                </span>
                <span className="pd-stat-label">Total Likes</span>
                <span className="pd-stat-hint">See readers ↗</span>
              </button>

              <button
                type="button"
                className="pd-stat-card"
                onClick={() => openActivity("comments")}
              >
                <span className="pd-stat-icon">☰</span>
                <span className="pd-stat-number">
                  {statsLoading ? "—" : stats.totalComments}
                </span>
                <span className="pd-stat-label">Comments</span>
                <span className="pd-stat-hint">Read comments ↗</span>
              </button>
            </div>
          </section>

          <nav className="pd-menu" aria-label="Profile navigation">
            <span className="pd-menu-heading">YOUR BLOG</span>

            <Link
              to="/my-posts"
              className="pd-menu-link"
              onClick={onClose}
            >
              <span className="pd-menu-icon">▤</span>
              <span>My Posts</span>
              <span className="pd-menu-arrow">↗</span>
            </Link>

            <Link
              to="/create-post"
              className="pd-menu-link"
              onClick={onClose}
            >
              <span className="pd-menu-icon">＋</span>
              <span>Create a Post</span>
              <span className="pd-menu-arrow">↗</span>
            </Link>

            {user.role === "admin" && (
              <Link
                to="/admin"
                className="pd-menu-link"
                onClick={onClose}
              >
                <span className="pd-menu-icon">⚙</span>
                <span>Dashboard</span>
                <span className="pd-menu-arrow">↗</span>
              </Link>
            )}
          </nav>

          <button
            type="button"
            className="pd-logout-button"
            onClick={onLogout}
          >
            <span>↪</span>
            Log out
          </button>

          <p className="pd-footer-note">
            A treasure trove of books and thoughts.
          </p>
        </div>
      </aside>

      {activeActivity && (
        <div
          className="pd-modal-backdrop"
          onClick={() => setActiveActivity("")}
        >
          <section
            className="pd-activity-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pd-activity-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="pd-modal-header">
              <div>
                <span className="pd-eyebrow">YOUR COMMUNITY</span>
                <h2 id="pd-activity-title">
                  {activityTitles[activeActivity]}
                </h2>
              </div>

              <button
                type="button"
                className="pd-icon-button"
                onClick={() => setActiveActivity("")}
                aria-label="Close activity"
              >
                ×
              </button>
            </div>

            <div className="pd-activity-body">
              {activityLoading ? (
                <div className="pd-state-message">
                  <span className="pd-spinner" />
                  Loading activity…
                </div>
              ) : activityError ? (
                <div className="pd-state-message pd-error-state">
                  <p>{activityError}</p>
                  <button
                    type="button"
                    className="pd-primary-button"
                    onClick={() => openActivity(activeActivity)}
                  >
                    Try again
                  </button>
                </div>
              ) : activityItems.length === 0 ? (
                <div className="pd-state-message">
                  <span className="pd-empty-icon">✧</span>
                  <h3>Nothing to show yet</h3>
                  <p>
                    {activeActivity === "posts"
                      ? "Your posts will appear here."
                      : activeActivity === "likes"
                        ? "Likes on your posts will appear here."
                        : "Comments on your posts will appear here."}
                  </p>
                </div>
              ) : (
                <div className="pd-activity-list">
                  {activityItems.map((item, index) => {
                    const person =
                      item.user_name ||
                      item.name ||
                      item.liker_name ||
                      item.commenter_name ||
                      item.author_name ||
                      "Reader";

                    return (
                      <article
                        className="pd-activity-item"
                        key={
                          item.id ??
                          `${item.post_id || item.post_title || "activity"}-${index}`
                        }
                      >
                        <div className="pd-activity-avatar">
                          {person.trim().charAt(0).toUpperCase() || "R"}
                        </div>

                        <div className="pd-activity-details">
                          {activeActivity === "posts" ? (
                            <>
                              <h3>{item.title || "Untitled post"}</h3>
                              <p>{formatDate(item.created_at)}</p>
                            </>
                          ) : activeActivity === "likes" ? (
                            <>
                              <p>
                                <strong>{person}</strong> liked your post
                              </p>
                              <h3>
                                {item.post_title || item.title || "Your post"}
                              </h3>
                              <p>{formatDate(item.created_at)}</p>
                            </>
                          ) : (
                            <>
                              <p>
                                <strong>{person}</strong> commented on your post
                              </p>
                              <h3>
                                {item.post_title || item.title || "Your post"}
                              </h3>
                              <p className="pd-comment-text">
                                {item.comment || item.content || ""}
                              </p>
                              <p>{formatDate(item.created_at)}</p>
                            </>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {aboutEditorOpen && (
        <div
          className="pd-modal-backdrop"
          onClick={() => setAboutEditorOpen(false)}
        >
          <section
            className="pd-about-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pd-about-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="pd-modal-header">
              <div>
                <span className="pd-eyebrow">MAKE IT PERSONAL</span>
                <h2 id="pd-about-title">Edit About Me</h2>
              </div>

              <button
                type="button"
                className="pd-icon-button"
                onClick={() => setAboutEditorOpen(false)}
                aria-label="Close editor"
              >
                ×
              </button>
            </div>

            <label className="pd-textarea-label" htmlFor="pd-about-input">
              Tell readers a little about yourself
            </label>

            <textarea
              id="pd-about-input"
              className="pd-about-textarea"
              value={aboutDraft}
              onChange={(event) => setAboutDraft(event.target.value)}
              maxLength={300}
              rows={5}
              placeholder="I love books, stories, and sharing ideas…"
            />

            <div className="pd-character-count">
              {aboutDraft.length}/300 characters
            </div>

            <div className="pd-modal-actions">
              <button
                type="button"
                className="pd-secondary-button"
                onClick={() => setAboutEditorOpen(false)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="pd-primary-button"
                onClick={() => {
                  setAboutText(aboutDraft.trim());
                  setAboutEditorOpen(false);
                }}
              >
                Save About Me
              </button>
            </div>

            <p className="pd-editor-note">
              About Me currently saves in the open component only. Permanent
              saving requires a profile-update API endpoint.
            </p>
          </section>
        </div>
      )}
    </>
  );
}







// =========================
// MAIN APP
// =========================

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [authModal, setAuthModal] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);

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
      onOpenProfile={() => setProfileOpen(true)}
    />

    {profileOpen && user && (
      <ProfileDrawer
        user={user}
        onClose={() => setProfileOpen(false)}
        onLogout={logout}
      />
    )}

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
<Route
  path="/"
  element={
    <Home
      user={user}
      onOpenAuth={setAuthModal}
    />
  }
/><Route
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
          </Link>

        <p>Thoughtful words. Fresh perspectives.</p>

        <span>© {new Date().getFullYear()} 𝚂𝙾𝙲𝙸𝙰𝙻 𝙱𝙻𝙾𝙶</span>
      </footer>
    </div>
  );
}
