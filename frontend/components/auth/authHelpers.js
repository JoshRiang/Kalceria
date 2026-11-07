export const PASSWORD_CHECK_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

// Client-side born year validation (YEAR ONLY): must be 18+ years old
export function checkBornYear(yearVal) {
  if (!yearVal) return { valid: false, empty: true, message: "" };
  const str = String(yearVal).trim();
  if (str.length < 4) return { valid: false, empty: false, message: "" };
  const y = parseInt(str, 10);
  const currentYear = new Date().getFullYear();
  if (isNaN(y) || str.length !== 4) {
    return { valid: false, empty: false, message: "Enter 4-digit year" };
  }
  if (y > currentYear - 18) {
    return { valid: false, empty: false, message: "Must be 18 or older" };
  }
  if (y < 1920) {
    return { valid: false, empty: false, message: "Enter valid year" };
  }
  return { valid: true, empty: false, message: "" };
}

// Ensure avatar base64 string does not exceed backend limits (max 180KB)
export async function optimizeAvatarForBackend(dataUrl) {
  if (!dataUrl) return undefined;
  if (dataUrl.length <= 180_000) return dataUrl;
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 320;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, 320, 320);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
