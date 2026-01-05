import crypto from "crypto";

const PREFIX = "v1:";

function getKey(): Buffer {
  const raw = process.env.MAIL_TOKEN_ENC_KEY;
  if (!raw) throw new Error("Missing MAIL_TOKEN_ENC_KEY");

  // 32 bytes en base64
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("MAIL_TOKEN_ENC_KEY must be 32 bytes (base64)");
  }
  return key;
}

export function encryptRefreshToken(plain: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  // v1:<iv>.<ciphertext>.<tag>
  return (
    PREFIX +
    iv.toString("base64") +
    "." +
    ciphertext.toString("base64") +
    "." +
    tag.toString("base64")
  );
}

export function decryptRefreshToken(stored: string): string {
  // Si jamais tu as déjà des tokens en clair en DB (avant migration),
  // tu peux décider de les accepter et les retourner tels quels.
  // Ici: si pas de préfixe => on considère que c'est déjà en clair.
  if (!stored.startsWith(PREFIX)) return stored;

  const key = getKey();
  const payload = stored.slice(PREFIX.length);
  const [ivB64, ctB64, tagB64] = payload.split(".");
  if (!ivB64 || !ctB64 || !tagB64)
    throw new Error("Invalid encrypted token format");

  const iv = Buffer.from(ivB64, "base64");
  const ciphertext = Buffer.from(ctB64, "base64");
  const tag = Buffer.from(tagB64, "base64");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plain.toString("utf8");
}
