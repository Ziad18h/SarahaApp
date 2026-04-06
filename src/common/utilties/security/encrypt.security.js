import crypto from "node:crypto";
import cs from "../../../config/config.service.js";

const ENCRYPTION_KEY = crypto
  .createHash("sha256")
  .update(cs.encryptionKey)
  .digest();
const IV_LENGTH = 16;

export function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  return `${iv.toString("hex")}:${encrypted}`;
}

export function decrypt(text) {
  try {
    if (!text || typeof text !== "string" || !text.includes(":")) {
      return text;
    }

    const [ivHex, encryptedText] = text.split(":");
    if (!ivHex || ivHex.length !== 32 || !/^[0-9a-fA-F]+$/.test(ivHex)) {
      return text;
    }

    const iv = Buffer.from(ivHex, "hex");
    if (iv.length !== IV_LENGTH) {
      return text;
    }

    const decipher = crypto.createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);

    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    return text;
  }
}
