import { describe, it, expect, beforeEach } from "vitest";
import {
  getToken,
  setToken,
  clearToken,
  getUserKey,
  setUserKey,
  clearUser,
} from "../../src/utils/storage";

beforeEach(() => {
  localStorage.clear();
});

describe("getToken", () => {
  it("returns null when no token is stored", () => {
    expect(getToken()).toBeNull();
  });

  it("returns the stored token", () => {
    localStorage.setItem("dam_token", "abc123");
    expect(getToken()).toBe("abc123");
  });
});

describe("setToken", () => {
  it("writes the token to localStorage under dam_token", () => {
    setToken("my-jwt");
    expect(localStorage.getItem("dam_token")).toBe("my-jwt");
  });
});

describe("clearToken", () => {
  it("removes the token from localStorage", () => {
    setToken("my-jwt");
    clearToken();
    expect(getToken()).toBeNull();
  });
});

describe("getUserKey", () => {
  it("returns null when no user is stored", () => {
    expect(getUserKey()).toBeNull();
  });

  it("returns the stored user string", () => {
    localStorage.setItem("dam_user", JSON.stringify({ id: "u1" }));
    expect(getUserKey()).toBe(JSON.stringify({ id: "u1" }));
  });
});

describe("setUserKey", () => {
  it("writes the user string to localStorage under dam_user", () => {
    const user = JSON.stringify({ id: "u1", email: "a@b.com" });
    setUserKey(user);
    expect(localStorage.getItem("dam_user")).toBe(user);
  });
});

describe("clearUser", () => {
  it("removes the user from localStorage", () => {
    setUserKey(JSON.stringify({ id: "u1" }));
    clearUser();
    expect(getUserKey()).toBeNull();
  });
});
