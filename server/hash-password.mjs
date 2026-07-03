import crypto from "node:crypto";

const password = process.argv[2];
if (!password) {
  console.error("Usage: node server/hash-password.mjs <password>");
  process.exit(1);
}

try {
  const argon2 = await import("argon2");
  console.log(await argon2.hash(password, { type: argon2.argon2id }));
} catch {
  const salt = crypto.randomBytes(16).toString("hex");
  const key = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString("hex");
  console.log(`scrypt$16384$8$1$${salt}$${key}`);
}
