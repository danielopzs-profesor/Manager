import { scrypt as rawScrypt, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
const scrypt = promisify(rawScrypt);
export async function passwordHash(password, {temporary = false} = {}) {
  if (
    typeof password !== "string" ||
    password.length < (temporary ? 11 : 12) ||
    password.length > 200
  )
    throw Error("La contraseña debe tener de 12 a 200 caracteres");
  const salt = randomBytes(16).toString("hex");
  return salt + ":" + (await scrypt(password, salt, 64)).toString("hex");
}
export async function passwordMatches(password, hash) {
  if (
    typeof password !== "string" ||
    password.length > 200 ||
    typeof hash !== "string"
  )
    return false;
  const [salt, value] = hash.split(":");
  if (!salt || !value) return false;
  const expected = Buffer.from(value, "hex");
  const actual = await scrypt(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
