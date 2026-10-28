import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "./api.jsx";
import "./ProfileDrawer.css";

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

export default function ProfileDrawer({ user, onClose, onLogout }) {
  const [stats, setStats] = useState(EMPTY_STATS);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState("");

  const [activeActivity, setActiveActivity] = useState("");
  const [activityItems, setActivityItems] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState("");

  const [aboutEditorOpen, setAboutEditorOpen] = useState(false);
  const [aboutText, setAboutText] = useState(user?.about || "");
  const [aboutDraft, setAboutDraft] = useState(user?.about || "");

  const displayName = user?.name || user?.username || "Reader";
  const initial = displayName.trim().charAt(0).toUpperCase() || "R";
  const avatar = user?.picture || user?.avatar || user?.avatar_url || "";

  useEffect(() => {
    setAboutText(user?.about || "");
    setAboutDraft(user?.about || "");
  }, [user?.id, user?.about]);

  useEffect(() => {
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
        totalPosts: Number(data?.totalPosts ?? data?.total_posts ?? 0),
        totalLikes: Number(data?.totalLikes ?? data?.total_likes ?? 0),
        totalComments: Number(
          data?.totalComments ?? data?.total_comments ?? 0
        ),
      });
    } catch (error) {
      setStatsError(error?.message || "Couldn't load your profile statistics.");
    } finally {
      setStatsLoading(false);
    }
  }

  useEffect(() => {
    if (user) loadStats();
    // loadStats runs when the signed-in user's ID changes.
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

      setActivityItems(getActivityItems(data));
    } catch (error) {
      setActivityError(
        error?.message || "Couldn't load this activity. Please try again."
      );
    } finally {
      setActivityLoading(false);
    }
  }

  function closeActivity() {
    setActiveActivity("");
    setActivityItems([]);
    setActivityError("");
  }

  function saveAboutLocally() {
    // This changes the current drawer state only. Persistent saving
    // requires a profile-update API endpoint on the backend.
    setAboutText(aboutDraft.trim());
    setAboutEditorOpen(false);
  }

  if (!user) return null;

  return (
    <>
      <div
        className="pd-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

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
            {avatar ? (
              <img
                className="pd-avatar"
                src={avatar}
                alt={`${displayName}'s profile`}
                referrerPolicy="no-referrer"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                  event.currentTarget.nextElementSibling.style.display = "grid";
                }}
              />
            ) : null}

            <div
              className="pd-avatar-fallback"
              style={{ display: avatar ? "none" : "grid" }}
              aria-hidden="true"
            >
              {initial}
            </div>
          </div>

          <div className="pd-identity">
            <span className="pd-eyebrow">WELCOME BACK</span>
            <h2>{displayName}</h2>
            {user?.email && <p className="pd-email">{user.email}</p>}

            {user?.role === "admin" && (
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
                aria-label="Refresh profile statistics"
                title="Refresh statistics"
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

            <Link to="/my-posts" className="pd-menu-link" onClick={onClose}>
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

            {user?.role === "admin" && (
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
        <div className="pd-modal-backdrop" onClick={closeActivity}>
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
                  {ACTIVITY_TITLES[activeActivity]}
                </h2>
              </div>

              <button
                type="button"
                className="pd-icon-button"
                onClick={closeActivity}
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
                  {activityItems.map((item, index) => (
                    <article
                      className="pd-activity-item"
                      key={
                        item.id ??
                        `${item.post_id ?? item.post_title ?? "activity"}-${index}`
                      }
                    >
                      <div className="pd-activity-avatar">
                        {(item.user_name || item.name || item.author_name || "R")
                          .trim()
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div className="pd-activity-details">
                        {activeActivity === "posts" ? (
                          <>
                            <h3>{item.title || "Untitled post"}</h3>
                            <p>
                              {formatDate(item.created_at) || "Post"}
                            </p>
                          </>
                        ) : activeActivity === "likes" ? (
                          <>
                            <p>
                              <strong>
                                {item.user_name ||
                                  item.name ||
                                  item.liker_name ||
                                  "A reader"}
                              </strong>{" "}
                              liked your post
                            </p>
                            <h3>
                              {item.post_title || item.title || "Your post"}
                            </h3>
                            <p>{formatDate(item.created_at)}</p>
                          </>
                        ) : (
                          <>
                            <p>
                              <strong>
                                {item.user_name ||
                                  item.name ||
                                  item.commenter_name ||
                                  "A reader"}
                              </strong>{" "}
                              commented on your post
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
                  ))}
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
                onClick={saveAboutLocally}
              >
                Save About Me
              </button>
            </div>

            <p className="pd-editor-note">
              This version updates the current view only. Saving About Me
              permanently requires a profile-update endpoint in your backend.
            </p>
          </section>
        </div>
      )}
    </>
  );
}
