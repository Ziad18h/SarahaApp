import crypto from "node:crypto"

const ENCRYPTION_KEY = Buffer.from("128dhdj$$##u37363eb*&$87464$#$@!"); 
const IV_LENGTH = 16;

export function encrypt(text) {
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);  

    let encrypted = cipher.update(text, 'utf8', 'hex');

    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
}




// Decrypt function
export function decrypt(text) {
  try {
    if (!text || typeof text !== "string") return text;

    // لازم يكون بالشكل iv:encrypted
    if (!text.includes(":")) return text;

    const [ivHex, encryptedText] = text.split(":");

    // iv لازم يكون 32 hex chars (16 bytes)
    if (!ivHex || ivHex.length !== 32) return text;
    if (!/^[0-9a-fA-F]+$/.test(ivHex)) return text;

    const iv = Buffer.from(ivHex, "hex");

    if (iv.length !== 16) return text;

    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      ENCRYPTION_KEY,
      iv
    );

    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    // لو حصل أي error رجّع النص زي ما هو
    return text;
  }
}
