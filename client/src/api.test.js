import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "./api.jsx";

describe("api authentication handling", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { dispatchEvent: vi.fn() });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ message: "You are not logged in." })
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not expire a session when the current-user check is unauthenticated", async () => {
    await expect(api("/auth/me")).rejects.toThrow("You are not logged in.");

    expect(window.dispatchEvent).not.toHaveBeenCalled();
  });

  it("dispatches session expiry for unauthorized protected requests", async () => {
    await expect(api("/posts")).rejects.toThrow("You are not logged in.");

    expect(window.dispatchEvent).toHaveBeenCalledWith(
      expect.any(Event)
    );
    expect(window.dispatchEvent.mock.calls[0][0].type).toBe(
      "session-expired"
    );
  });
});
