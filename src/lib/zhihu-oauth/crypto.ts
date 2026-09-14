import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function keyFromSecret(secret: string): Buffer {
  return createHash("sha256").update(secret, "utf8").digest();
}

export function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function encryptOAuthToken(token: string, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFromSecret(secret), iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString("base64url")).join(".");
}

export function decryptOAuthToken(value: string, secret: string): string {
  const parts = value.split(".");
  if (parts.length !== 3) throw new Error("ZHIHU_OAUTH_TOKEN_INVALID");
  const [iv, tag, ciphertext] = parts.map((part) => Buffer.from(part, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", keyFromSecret(secret), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
