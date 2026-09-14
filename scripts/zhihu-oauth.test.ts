import { describe, expect, test } from "bun:test";
import { openJson, sealJson, sha256 } from "../src/lib/zhihu-oauth/crypto";
import { parseLosslessIdentifiers } from "../src/lib/zhihu-oauth/provider";

describe("Zhihu OAuth security helpers", () => {
  test("hashes state deterministically without storing it", () => {
    expect(sha256("state-value")).toHaveLength(64);
    expect(sha256("state-value")).toBe(sha256("state-value"));
  });

  test("seals callback state without exposing its contents", () => {
    const secret = "test-session-secret-with-at-least-32-characters";
    const sealed = sealJson({ stateHash: "state-hash", expiresAt: 123 }, secret);
    expect(sealed).not.toContain("state-hash");
    expect(openJson<{ stateHash: string }>(sealed, secret).stateHash).toBe("state-hash");
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
