const API_URL = "http://localhost:5001/api";

export async function api(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    }
  });

  // Convert the backend response to JavaScript data.
  const data = await response.json().catch(() => ({}));

  // Handle failed requests.
  if (!response.ok) {
    // Do not expire the session for login or current-user checks.
    if (
      response.status === 401 &&
      path !== "/auth/login" &&
      path !== "/auth/me"
    ) {
      window.dispatchEvent(new Event("session-expired"));
    }

    throw new Error(data.message || "Request failed.");
  }

  return data;
}

// Get total likes, dislikes, and the current user's vote.
export async function getPostLikes(postId) {
  return api(`/posts/${postId}/likes`);
}

// Like or dislike a post.
// status = 1 means Like.
// status = -1 means Dislike.
export async function votePost(postId, status) {
  if (![1, -1].includes(status)) {
    throw new Error("Status must be 1 (Like) or -1 (Dislike).");
  }

  return api(`/posts/${postId}/like`, {
    method: "POST",
    body: JSON.stringify({ status })
  });
}

// Remove the current user's vote.
export async function removePostVote(postId) {
  return api(`/posts/${postId}/like`, {
    method: "DELETE"
  });
}
 