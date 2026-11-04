// Smart Title Case formatter supporting Indonesian (PUEBI/EYD) and English
// conjunctions, prepositions, and articles (kata penghubung, kata depan, kata sandang).

const ID_CONJUNCTIONS_AND_PREPOSITIONS = [
  // Koordinatif & korelatif
  "dan", "atau", "serta", "tetapi", "tapi", "namun", "melainkan", "padahal", "sedangkan",
  // Subordinatif & penghubung klausa
  "yang", "untuk", "bagi", "guna", "buat", "demi", "agar", "supaya", "biar",
  "karena", "sebab", "lantaran", "sehingga", "maka",
  "jika", "kalau", "jikalau", "apabila", "bila", "bilamana", "seandainya", "asalkan", "asal",
  "meski", "meskipun", "walau", "walaupun", "kendati", "kendatipun", "biarpun", "sekalipun", "sungguhpun",
  "ketika", "saat", "waktu", "tatkala", "sementara", "sambil", "seraya",
  "sebelum", "sesudah", "setelah", "sejak", "selama", "hingga", "sampai",
  "seperti", "bagai", "bagaikan", "ibarat", "laksana", "bak", "alih-alih",
  // Preposisi (kata depan) & partikel
  "di", "ke", "dari", "pada", "kepada", "daripada", "oleh", "dengan", "tanpa",
  "tentang", "mengenai", "terhadap", "antara", "dalam", "atas", "bawah",
  "menuju", "menurut", "sekitar", "sekeliling", "melalui", "lewat",
  "pun", "per", "via", "vs", "ala",
];

const EN_CONJUNCTIONS_AND_PREPOSITIONS = [
  // Articles
  "a", "an", "the",
  // Coordinating conjunctions
  "and", "but", "or", "nor", "for", "yet", "so",
  // Subordinating conjunctions & prepositions
  "as", "at", "by", "in", "of", "on", "to", "up", "off", "out",
  "via", "per", "vs", "vs.", "v", "v.",
  "from", "into", "onto", "upon", "with", "within", "without",
  "over", "under", "between", "among", "through", "during",
  "before", "after", "since", "until", "till",
  "about", "against", "around", "behind", "beside", "besides", "beyond",
  "despite", "down", "except", "inside", "near", "outside", "past",
  "toward", "towards", "underneath", "unlike",
  "than", "that", "when", "while", "if", "though", "although",
];

export const MINOR_WORDS_SET = new Set([
  ...ID_CONJUNCTIONS_AND_PREPOSITIONS,
  ...EN_CONJUNCTIONS_AND_PREPOSITIONS,
]);

/**
 * Formats an event title so the first letter of every word is capitalized,
 * EXCEPT Indonesian & English conjunctions/prepositions/articles (unless it is the very first word).
 * Example: "ayam saya dan jago" -> "Ayam Saya dan Jago"
 */
export function toSmartTitleCase(input, { preserveSpaces = false } = {}) {
  if (typeof input !== "string" || !input) return "";

  const normalized = preserveSpaces ? input : input.trim().replace(/\s+/g, " ");
  if (!normalized) return "";

  const tokens = normalized.split(/(\s+)/);
  let wordIndex = 0;

  return tokens
    .map((token) => {
      if (/^\s+$/.test(token)) return token;
      const currentWordIndex = wordIndex++;

      // Handle hyphenated or slash-separated compounds while keeping punctuation prefix/suffix
      const match = token.match(/^([^a-zA-Z0-9]*)([a-zA-Z0-9][a-zA-Z0-9'-]*?)([^a-zA-Z0-9]*)$/);
      if (!match) return token;

      const [, prefix, core, suffix] = match;
      const lowerCore = core.toLowerCase();

      // Always capitalize the very first word of the title; subsequent minor words stay lowercase
      if (currentWordIndex > 0 && MINOR_WORDS_SET.has(lowerCore)) {
        return `${prefix}${lowerCore}${suffix}`;
      }

      // Preserve intentional all-caps acronyms (2-5 chars like FM, BSD, ECU, V6, BBQ)
      if (
        core.length >= 2 &&
        core.length <= 5 &&
        core === core.toUpperCase() &&
        /[A-Z]/.test(core) &&
        !MINOR_WORDS_SET.has(lowerCore)
      ) {
        return `${prefix}${core}${suffix}`;
      }

      const capitalized = lowerCore.charAt(0).toUpperCase() + lowerCore.slice(1);
      return `${prefix}${capitalized}${suffix}`;
    })
    .join("");
}

