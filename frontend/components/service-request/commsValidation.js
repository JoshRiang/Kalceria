/**
 * Pure validation utilities for Kalceria Service Request ("Need Our Help") contact fields.
 * Zero React / DOM / `@/` alias dependencies (headless-testable per AGENTS.md §6.5).
 */

// Official Indonesian cellular operator prefixes (Telkomsel, Indosat, XL, Axis, Tri, Smartfren)
export const ID_MOBILE_REGEX = /^8(?:1[1-9]|2[1-3]|3[1238]|5[1-35-9]|7[78]|8[1-9]|9[5-9])\d{6,10}$/;
// Rejects 7+ identical consecutive digits (e.g., 8111111111 or 8888888888)
export const REPEATING_DIGITS_REGEX = /(\d)\1{6,}/;
// Strict RFC-compliant Email regex (blocks disposable/malformed TLD typos)
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,12}$/;
// Telegram / Instagram / Social handle regex
export const HANDLE_REGEX = /^@?[a-zA-Z0-9._]{3,32}$/;

export function validateCommsValue(type, id, rawVal) {
  const val = String(rawVal || "").trim();
  const fieldId = String(id || "").toLowerCase();
  const isPhone =
    type === "tel" ||
    fieldId.includes("whatsapp") ||
    fieldId.includes("phone") ||
    fieldId.includes("wa") ||
    fieldId.includes("telepon") ||
    fieldId.includes("hp");
  const isEmail = type === "email" || fieldId.includes("email");
  const isHandle =
    fieldId.includes("telegram") ||
    fieldId.includes("instagram") ||
    fieldId.includes("discord") ||
    fieldId.includes("handle");

  if (!val) {
    return { valid: false, empty: true, message: "" };
  }

  if (isPhone) {
    const digits = val.replace(/^\+?62/, "").replace(/^0+/, "").replace(/\D/g, "");
    if (!digits.startsWith("8")) {
      return { valid: false, empty: false, message: "Must start with 8 (e.g. 812xxxx)" };
    }
    if (digits.length < 9) {
      return { valid: false, empty: false, message: `Need at least ${9 - digits.length} more digit(s)` };
    }
    if (digits.length > 12) {
      return { valid: false, empty: false, message: "Maximum 12 digits after +62" };
    }
    if (!ID_MOBILE_REGEX.test(digits)) {
      return { valid: false, empty: false, message: `Invalid Indonesian operator prefix (0${digits.slice(0, 3)})` };
    }
    if (REPEATING_DIGITS_REGEX.test(digits)) {
      return { valid: false, empty: false, message: "Please enter a real active mobile number" };
    }
    return { valid: true, empty: false, message: `+62 ${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}` };
  }

  if (isEmail) {
    if (!EMAIL_REGEX.test(val)) {
      return { valid: false, empty: false, message: "Email salah" };
    }
    return { valid: true, empty: false, message: "Valid" };
  }

  if (isHandle) {
    if (!HANDLE_REGEX.test(val)) {
      return { valid: false, empty: false, message: "Enter a valid username (3-32 chars)" };
    }
    return { valid: true, empty: false, message: "Valid handle" };
  }

  return { valid: true, empty: false, message: "" };
}
