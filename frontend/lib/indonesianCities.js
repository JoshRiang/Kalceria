// Indonesian Cities & Regencies dataset for client-side validation and autocompletion
export const INDONESIAN_CITIES = [
  // DKI Jakarta & Greater Areas
  "Jakarta",
  "Jakarta Pusat",
  "Jakarta Selatan",
  "Jakarta Barat",
  "Jakarta Timur",
  "Jakarta Utara",
  "Kepulauan Seribu",
  "Bintaro",
  "Tangerang Selatan",
  "Tangerang",
  "Depok",
  "Bekasi",
  "Bogor",
  "Cikarang",
  "Cibinong",

  // Banten
  "Serang",
  "Cilegon",
  "Pandeglang",
  "Lebak",

  // Jawa Barat
  "Bandung",
  "Bandung Barat",
  "Cimahi",
  "Cirebon",
  "Sukabumi",
  "Tasikmalaya",
  "Banjar",
  "Garut",
  "Karawang",
  "Purwakarta",
  "Subang",
  "Sumedang",
  "Cianjur",
  "Indramayu",
  "Majalengka",
  "Kuningan",
  "Ciamis",
  "Pangandaran",

  // Jawa Tengah
  "Semarang",
  "Surakarta",
  "Solo",
  "Magelang",
  "Pekalongan",
  "Salatiga",
  "Tegal",
  "Purwokerto",
  "Banyumas",
  "Cilacap",
  "Kudus",
  "Jepara",
  "Klaten",
  "Boyolali",
  "Sukoharjo",
  "Karanganyar",
  "Wonogiri",
  "Sragen",
  "Grobogan",
  "Blora",
  "Rembang",
  "Pati",
  "Demak",
  "Kendal",
  "Batang",
  "Pemalang",
  "Brebes",
  "Purbalingga",
  "Banjarnegara",
  "Kebumen",
  "Purworejo",
  "Wonosobo",
  "Temanggung",

  // DI Yogyakarta
  "Yogyakarta",
  "Jogja",
  "Sleman",
  "Bantul",
  "Gunungkidul",
  "Kulon Progo",

  // Jawa Timur
  "Surabaya",
  "Malang",
  "Batu",
  "Sidoarjo",
  "Gresik",
  "Mojokerto",
  "Pasuruan",
  "Probolinggo",
  "Kediri",
  "Blitar",
  "Madiun",
  "Banyuwangi",
  "Jember",
  "Lamongan",
  "Tuban",
  "Bojonegoro",
  "Ngawi",
  "Magetan",
  "Ponorogo",
  "Pacitan",
  "Trenggalek",
  "Tulungagung",
  "Nganjuk",
  "Jombang",
  "Lumajang",
  "Bondowoso",
  "Situbondo",
  "Bangkalan",
  "Sampang",
  "Pamekasan",
  "Sumenep",

  // Bali & Nusa Tenggara
  "Denpasar",
  "Badung",
  "Gianyar",
  "Tabanan",
  "Buleleng",
  "Klungkung",
  "Bangli",
  "Karangasem",
  "Jembrana",
  "Bali",
  "Mataram",
  "Bima",
  "Lombok Barat",
  "Lombok Tengah",
  "Lombok Timur",
  "Sumbawa",
  "Kupang",
  "Manggarai",

  // Sumatera
  "Banda Aceh",
  "Sabang",
  "Lhokseumawe",
  "Langsa",
  "Subulussalam",
  "Medan",
  "Binjai",
  "Tebing Tinggi",
  "Pematangsiantar",
  "Tanjungbalai",
  "Sibolga",
  "Padangsidimpuan",
  "Gunungsitoli",
  "Deli Serdang",
  "Padang",
  "Bukittinggi",
  "Payakumbuh",
  "Pariaman",
  "Solok",
  "Sawahlunto",
  "Padang Panjang",
  "Pekanbaru",
  "Dumai",
  "Batam",
  "Tanjung Pinang",
  "Bintan",
  "Karimun",
  "Jambi",
  "Sungai Penuh",
  "Palembang",
  "Prabumulih",
  "Pagar Alam",
  "Lubuklinggau",
  "Pangkalpinang",
  "Belitung",
  "Bengkulu",
  "Bandar Lampung",
  "Metro",

  // Kalimantan
  "Pontianak",
  "Singkawang",
  "Palangka Raya",
  "Banjarmasin",
  "Banjarbaru",
  "Samarinda",
  "Balikpapan",
  "Bontang",
  "Tarakan",
  "Kutai Kartanegara",

  // Sulawesi
  "Manado",
  "Bitung",
  "Tomohon",
  "Kotamobagu",
  "Palu",
  "Makassar",
  "Parepare",
  "Palopo",
  "Kendari",
  "Bau-Bau",
  "Gorontalo",
  "Mamuju",

  // Maluku & Papua
  "Ambon",
  "Tual",
  "Ternate",
  "Tidore",
  "Jayapura",
  "Sorong",
  "Merauke",
  "Timika",
  "Manokwari"
];

// Helper to normalize city input for comparison
function cleanCityStr(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/^(kota|kabupaten|kab\.|dki)\s+/i, "")
    .replace(/[^\w\s]/gi, "")
    .trim();
}

const CLEANED_CITIES = INDONESIAN_CITIES.map(c => ({
  name: c,
  clean: cleanCityStr(c)
}));

/**
 * Validates whether a given city name matches a real Indonesian city
 */
export function isIndonesianCity(input) {
  const query = cleanCityStr(input);
  if (!query || query.length < 3) return false;

  // Direct or exact clean match
  return CLEANED_CITIES.some(item => 
    item.clean === query ||
    query === item.clean.replace(/\s+/g, "") ||
    (query.length >= 4 && (item.clean.startsWith(query) || query.startsWith(item.clean)))
  );
}

/**
 * Returns matching Indonesian city suggestions for autocompletion
 */
export function getCitySuggestions(query, limit = 6) {
  const q = cleanCityStr(query);
  if (!q || q.length < 1) return [];

  const matched = [];
  for (const item of CLEANED_CITIES) {
    if (item.clean.startsWith(q)) {
      matched.push(item.name);
    } else if (item.clean.includes(q)) {
      matched.push(item.name);
    }
    if (matched.length >= limit) break;
  }
  return [...new Set(matched)];
}

