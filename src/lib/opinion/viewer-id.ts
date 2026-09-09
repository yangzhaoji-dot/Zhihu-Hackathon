"use client";

// A stable per-device anonymous id so stance data works before sign-in.
// OpinionSpace is explorable without an account; the server keys stance data by
// the real user id when signed in, and by this anonymous id otherwise.
const KEY = "opinionspace.viewer";

export function getViewerId(): string {
  if (typeof window === "undefined") return "guest";
  try {
    let id = window.localStorage.getItem(KEY);
    if (!id) {
      id = `d${Math.random().toString(36).slice(2, 12)}${Date.now().toString(36).slice(-4)}`;
      window.localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return "guest";
  }
}
