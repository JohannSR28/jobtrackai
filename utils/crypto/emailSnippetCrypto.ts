// src/server/crypto/snippetCrypto.ts
import crypto from "crypto";

/**
 * Env var: SNIPPET_ENC_KEY_B64
 * - base64 of 32 bytes (AES-256)
 */
function getKey(): Buffer {
  const b64 = process.env.SNIPPET_ENC_KEY_B64;
  if (!b64) throw new Error("MISSING_SNIPPET_ENC_KEY_B64");
  const key = Buffer.from(b64, "base64");
  if (key.length !== 32) throw new Error("INVALID_SNIPPET_ENC_KEY_LENGTH");
  return key;
}

const PREFIX = "enc:v1:";

/**
 * Encrypts plaintext -> "enc:v1:<base64(json)>"
 * json = { iv, tag, ct } all base64 strings
 */
export function encryptSnippet(plain: string | null): string | null {
  if (!plain) return null;

  const key = getKey();
  const iv = crypto.randomBytes(12); // GCM recommended 12 bytes
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  const payload = {
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ct: ct.toString("base64"),
  };

  return (
    PREFIX + Buffer.from(JSON.stringify(payload), "utf8").toString("base64")
  );
}

/**
 * Decrypts:
 * - if null -> null
 * - if plaintext (not starting with enc:v1:) -> returns as-is (useful for migration)
 */
export function decryptSnippet(stored: string | null): string | null {
  if (!stored) return null;
  if (!stored.startsWith(PREFIX)) return stored; // backward-compatible

  const key = getKey();
  const b64 = stored.slice(PREFIX.length);

  let payload: { iv: string; tag: string; ct: string };
  try {
    payload = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
  } catch {
    throw new Error("SNIPPET_DECRYPT_BAD_PAYLOAD");
  }

  const iv = Buffer.from(payload.iv, "base64");
  const tag = Buffer.from(payload.tag, "base64");
  const ct = Buffer.from(payload.ct, "base64");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  const plain = Buffer.concat([decipher.update(ct), decipher.final()]);
  return plain.toString("utf8");
}
