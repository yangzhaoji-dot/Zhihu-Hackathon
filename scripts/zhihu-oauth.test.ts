import { describe, expect, test } from "bun:test";
import { decryptOAuthToken, encryptOAuthToken, sha256 } from "../src/lib/zhihu-oauth/crypto";
import { parseLosslessIdentifiers } from "../src/lib/zhihu-oauth/provider";

describe("Zhihu OAuth security helpers", () => {
  test("encrypts and decrypts a token without exposing plaintext", () => {
    const secret = "test-session-secret-with-at-least-32-characters";
    const token = "oauth-token-value";
    const encrypted = encryptOAuthToken(token, secret);
    expect(encrypted).not.toContain(token);
    expect(decryptOAuthToken(encrypted, secret)).toBe(token);
  });

  test("rejects modified ciphertext", () => {
    const secret = "test-session-secret-with-at-least-32-characters";
    const encrypted = encryptOAuthToken("oauth-token-value", secret);
    expect(() => decryptOAuthToken(`${encrypted.slice(0, -1)}A`, secret)).toThrow();
  });

  test("hashes state deterministically without storing it", () => {
    expect(sha256("state-value")).toHaveLength(64);
    expect(sha256("state-value")).toBe(sha256("state-value"));
  });

  test("preserves identifiers larger than JavaScript safe integers", () => {
    const parsed = parseLosslessIdentifiers('{"uid":969570047710216200,"Data":{"Items":[{"UrlToken":969570047710216201}]}}') as {
      uid: string;
      Data: { Items: Array<{ UrlToken: string }> };
    };
    expect(parsed.uid).toBe("969570047710216200");
    expect(parsed.Data.Items[0].UrlToken).toBe("969570047710216201");
  });
});
