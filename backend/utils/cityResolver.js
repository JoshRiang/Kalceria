import crypto from 'node:crypto';
import { redis } from '../lib/redis.js';

const CITY_CACHE_TTL_SEC = 24 * 60 * 60; // 24 hours
const CITY_HMAC_SECRET =
  process.env.LOCATION_HMAC_SECRET ||
  process.env.JWT_SECRET ||
  'kalceria-city-validation-secret';

// Bounded fallback memory cache if Redis is temporarily unavailable
const fallbackMem = new Map();
const MAX_MEM_ENTRIES = 3000;

async function getCached(key) {
  if (redis && redis.status === 'ready') {
    try {
      const raw = await redis.get(key);
      if (raw) return JSON.parse(raw);
    } catch {}
  }
  const entry = fallbackMem.get(key);
  if (!entry) return null;
  if (Date.now() > entry.exp) {
    fallbackMem.delete(key);
    return null;
  }
  return entry.val;
}

async function setCached(key, val, ttlSec = CITY_CACHE_TTL_SEC) {
  if (redis && redis.status === 'ready') {
    try {
      await redis.set(key, JSON.stringify(val), 'EX', ttlSec);
      return;
    } catch {}
  }
  if (fallbackMem.size >= MAX_MEM_ENTRIES) {
    const oldest = fallbackMem.keys().next().value;
    if (oldest !== undefined) fallbackMem.delete(oldest);
  }
  fallbackMem.set(key, { val, exp: Date.now() + ttlSec * 1000 });
}

export function normalizeCityKey(raw) {
  return String(raw || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(kota\s+administrasi|kabupaten\s+administrasi|kota\s+madya|kotamadya|kabupaten|kab\.|kota|dki|daerah\s+khusus\s+ibukota|city\s+of|municipality\s+of)\b/gi, ' ')
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function signCityToken(cityName, lat = 0, lng = 0) {
  const norm = normalizeCityKey(cityName);
  const latFixed = Number.isFinite(Number(lat)) ? Number(lat).toFixed(4) : '0.0000';
  const lngFixed = Number.isFinite(Number(lng)) ? Number(lng).toFixed(4) : '0.0000';
  return crypto
    .createHmac('sha256', CITY_HMAC_SECRET)
    .update(`city:v1:${norm}:${latFixed}:${lngFixed}`)
    .digest('hex');
}

export function verifyCityToken(cityName, lat, lng, token) {
  if (!token || typeof token !== 'string' || !cityName) return false;
  const expected = signCityToken(cityName, lat, lng);
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// Comprehensive Indonesia Priority City & Regency Index with Representative Coordinates
// Prioritized #1 for kalceria.id while worldwide cities are resolved dynamically via Geocoder + Redis cache
export const INDONESIAN_CITY_INDEX = [
  // DKI Jakarta & Jabodetabek
  { name: 'Jakarta', province: 'DKI Jakarta', lat: -6.2088, lng: 106.8456, aliases: ['dki jakarta', 'special capital region of jakarta'] },
  { name: 'Jakarta Pusat', province: 'DKI Jakarta', lat: -6.1865, lng: 106.8341, aliases: ['central jakarta', 'menteng', 'tanah abang', 'kemayoran', 'gambir', 'senen', 'cikini', 'cempaka putih'] },
  { name: 'Jakarta Selatan', province: 'DKI Jakarta', lat: -6.2615, lng: 106.8106, aliases: ['south jakarta', 'kebayoran baru', 'kebayoran lama', 'pesanggrahan', 'cilandak', 'pasar minggu', 'jagakarsa', 'mampang prapatan', 'pancoran', 'tebet', 'setiabudi', 'pondok indah', 'kemang', 'senopati', 'blok m'] },
  { name: 'Jakarta Barat', province: 'DKI Jakarta', lat: -6.1683, lng: 106.7588, aliases: ['west jakarta', 'kebon jeruk', 'kembangan', 'palmerah', 'grogol petamburan', 'cengkareng', 'kalideres', 'tamansari', 'tambora', 'puri indah'] },
  { name: 'Jakarta Timur', province: 'DKI Jakarta', lat: -6.2250, lng: 106.9004, aliases: ['east jakarta', 'jatinegara', 'duren sawit', 'kramat jati', 'cakung', 'pulogadung', 'matraman', 'makasar', 'ciracas', 'cipayung', 'pasar rebo', 'rawamangun', 'cibubur'] },
  { name: 'Jakarta Utara', province: 'DKI Jakarta', lat: -6.1384, lng: 106.8639, aliases: ['north jakarta', 'kelapa gading', 'penjaringan', 'pademangan', 'tanjung priok', 'koja', 'cilincing', 'pik', 'pantai indah kapuk', 'pluit', 'sunter'] },
  { name: 'Kepulauan Seribu', province: 'DKI Jakarta', lat: -5.7985, lng: 106.5072, aliases: ['thousand islands'] },
  { name: 'Tangerang Selatan', province: 'Banten', lat: -6.2886, lng: 106.7179, aliases: ['tangsel', 'south tangerang', 'pondok aren', 'serpong', 'serpong utara', 'ciputat', 'ciputat timur', 'pamulang', 'setu', 'bsd', 'bsd city', 'alam sutera'] },
  { name: 'Bintaro', province: 'Banten', lat: -6.2715, lng: 106.7135, aliases: ['bintaro jaya'] },
  { name: 'Tangerang', province: 'Banten', lat: -6.1783, lng: 106.6319, aliases: ['karawaci', 'ciledug', 'cipondoh', 'jatiuwung', 'benda', 'batuceper', 'negalsari', 'pinang', 'periuk', 'larangan', 'karang tengah', 'gading serpong', 'lippo karawaci', 'pik 2', 'cikupa', 'balaraja', 'curug', 'kelapa dua', 'pagedangan', 'cisauk', 'legok', 'pasar kemis', 'tigaraksa'] },
  { name: 'Depok', province: 'Jawa Barat', lat: -6.4025, lng: 106.7942, aliases: ['margonda', 'beji', 'cimanggis', 'cinere', 'limo', 'pancoran mas', 'sawangan', 'sukmajaya', 'tapos', 'cilodong', 'bojongsari', 'cipayung depok'] },
  { name: 'Bekasi', province: 'Jawa Barat', lat: -6.2383, lng: 106.9756, aliases: ['jatiasih', 'pondok gede', 'bekasi barat', 'bekasi selatan', 'bekasi timur', 'bekasi utara', 'medan satria', 'rawalu', 'mustikajaya', 'bantargebang', 'pondokmelati', 'jatiraden', 'summarecon bekasi', 'harapan indah', 'tambun', 'cibitung'] },
  { name: 'Cikarang', province: 'Jawa Barat', lat: -6.3069, lng: 107.1520, aliases: ['lippo cikarang', 'jababeka', 'cikarang selatan', 'cikarang utara', 'cikarang barat', 'cikarang pusat', 'cikarang timur'] },
  { name: 'Bogor', province: 'Jawa Barat', lat: -6.5971, lng: 106.8060, aliases: ['bogor tengah', 'bogor selatan', 'bogor utara', 'bogor timur', 'bogor barat', 'tanah sareal', 'sentul', 'ciawi', 'cisarua', 'puncak', 'gunung putri', 'cileungsi', 'parung'] },
  { name: 'Cibinong', province: 'Jawa Barat', lat: -6.4816, lng: 106.8540, aliases: [] },

  // Banten
  { name: 'Serang', province: 'Banten', lat: -6.1104, lng: 106.1640, aliases: [] },
  { name: 'Cilegon', province: 'Banten', lat: -6.0025, lng: 106.0111, aliases: ['merak'] },
  { name: 'Pandeglang', province: 'Banten', lat: -6.3086, lng: 106.1067, aliases: [] },
  { name: 'Lebak', province: 'Banten', lat: -6.5644, lng: 106.2522, aliases: ['rangkasbitung'] },

  // Jawa Barat
  { name: 'Bandung', province: 'Jawa Barat', lat: -6.9175, lng: 107.6191, aliases: ['coblong', 'dago', 'buahbatu', 'lengkong', 'cicendo', 'sukajadi', 'cidadap', 'antapani', 'arcamanik', 'gedebage', 'kiaracondong', 'sumur bandung', 'bandung wetan', 'lembang', 'dayeuhkolot', 'bojongsoang', 'jatinangor', 'soreang'] },
  { name: 'Bandung Barat', province: 'Jawa Barat', lat: -6.8452, lng: 107.5023, aliases: ['ngamprah', 'padalarang'] },
  { name: 'Cimahi', province: 'Jawa Barat', lat: -6.8722, lng: 107.5425, aliases: [] },
  { name: 'Cirebon', province: 'Jawa Barat', lat: -6.7320, lng: 108.5523, aliases: ['sumber'] },
  { name: 'Sukabumi', province: 'Jawa Barat', lat: -6.9277, lng: 106.9300, aliases: ['palabuhanratu'] },
  { name: 'Tasikmalaya', province: 'Jawa Barat', lat: -7.3274, lng: 108.2207, aliases: ['singaparna'] },
  { name: 'Banjar', province: 'Jawa Barat', lat: -7.3706, lng: 108.5342, aliases: [] },
  { name: 'Garut', province: 'Jawa Barat', lat: -7.2279, lng: 107.9087, aliases: [] },
  { name: 'Karawang', province: 'Jawa Barat', lat: -6.3227, lng: 107.3376, aliases: [] },
  { name: 'Purwakarta', province: 'Jawa Barat', lat: -6.5569, lng: 107.4433, aliases: [] },
  { name: 'Subang', province: 'Jawa Barat', lat: -6.5715, lng: 107.7587, aliases: [] },
  { name: 'Sumedang', province: 'Jawa Barat', lat: -6.8586, lng: 107.9207, aliases: [] },
  { name: 'Cianjur', province: 'Jawa Barat', lat: -6.8168, lng: 107.1425, aliases: ['cipanas'] },
  { name: 'Indramayu', province: 'Jawa Barat', lat: -6.3276, lng: 108.3249, aliases: [] },
  { name: 'Majalengka', province: 'Jawa Barat', lat: -6.8364, lng: 108.2279, aliases: [] },
  { name: 'Kuningan', province: 'Jawa Barat', lat: -6.9757, lng: 108.4831, aliases: [] },
  { name: 'Ciamis', province: 'Jawa Barat', lat: -7.3257, lng: 108.3534, aliases: [] },
  { name: 'Pangandaran', province: 'Jawa Barat', lat: -7.6841, lng: 108.6500, aliases: [] },

  // Jawa Tengah
  { name: 'Semarang', province: 'Jawa Tengah', lat: -6.9667, lng: 110.4167, aliases: ['ungaran', 'tembalang', 'banyumanik', 'pedurungan', 'semarang tengah', 'semarang selatan', 'semarang barat'] },
  { name: 'Surakarta', province: 'Jawa Tengah', lat: -7.5755, lng: 110.8243, aliases: ['laweyan', 'banjarsari', 'jebres'] },
  { name: 'Solo', province: 'Jawa Tengah', lat: -7.5755, lng: 110.8243, aliases: [] },
  { name: 'Magelang', province: 'Jawa Tengah', lat: -7.4797, lng: 110.2177, aliases: ['mungkid'] },
  { name: 'Pekalongan', province: 'Jawa Tengah', lat: -6.8886, lng: 109.6753, aliases: ['kajen'] },
  { name: 'Salatiga', province: 'Jawa Tengah', lat: -7.3305, lng: 110.5084, aliases: [] },
  { name: 'Tegal', province: 'Jawa Tengah', lat: -6.8694, lng: 109.1402, aliases: ['slawi'] },
  { name: 'Purwokerto', province: 'Jawa Tengah', lat: -7.4244, lng: 109.2302, aliases: [] },
  { name: 'Banyumas', province: 'Jawa Tengah', lat: -7.5142, lng: 109.2942, aliases: [] },
  { name: 'Cilacap', province: 'Jawa Tengah', lat: -7.7279, lng: 109.0079, aliases: [] },
  { name: 'Kudus', province: 'Jawa Tengah', lat: -6.8048, lng: 110.8405, aliases: [] },
  { name: 'Jepara', province: 'Jawa Tengah', lat: -6.5888, lng: 110.6684, aliases: [] },
  { name: 'Klaten', province: 'Jawa Tengah', lat: -7.7058, lng: 110.6064, aliases: [] },
  { name: 'Boyolali', province: 'Jawa Tengah', lat: -7.5322, lng: 110.5955, aliases: [] },
  { name: 'Sukoharjo', province: 'Jawa Tengah', lat: -7.6830, lng: 110.8416, aliases: ['solo baru'] },
  { name: 'Karanganyar', province: 'Jawa Tengah', lat: -7.5960, lng: 110.9508, aliases: [] },
  { name: 'Wonogiri', province: 'Jawa Tengah', lat: -7.8135, lng: 110.9242, aliases: [] },
  { name: 'Sragen', province: 'Jawa Tengah', lat: -7.4265, lng: 111.0221, aliases: [] },
  { name: 'Grobogan', province: 'Jawa Tengah', lat: -7.0869, lng: 110.9163, aliases: ['purwodadi'] },
  { name: 'Blora', province: 'Jawa Tengah', lat: -6.9698, lng: 111.4184, aliases: ['cepu'] },
  { name: 'Rembang', province: 'Jawa Tengah', lat: -6.7086, lng: 111.3416, aliases: [] },
  { name: 'Pati', province: 'Jawa Tengah', lat: -6.7559, lng: 111.0380, aliases: [] },
  { name: 'Demak', province: 'Jawa Tengah', lat: -6.8943, lng: 110.6386, aliases: [] },
  { name: 'Kendal', province: 'Jawa Tengah', lat: -6.9240, lng: 110.2038, aliases: [] },
  { name: 'Batang', province: 'Jawa Tengah', lat: -6.9080, lng: 109.7303, aliases: [] },
  { name: 'Pemalang', province: 'Jawa Tengah', lat: -6.8906, lng: 109.3808, aliases: [] },
  { name: 'Brebes', province: 'Jawa Tengah', lat: -6.8706, lng: 109.0426, aliases: [] },
  { name: 'Purbalingga', province: 'Jawa Tengah', lat: -7.3881, lng: 109.3639, aliases: [] },
  { name: 'Banjarnegara', province: 'Jawa Tengah', lat: -7.3976, lng: 109.6953, aliases: [] },
  { name: 'Kebumen', province: 'Jawa Tengah', lat: -7.6687, lng: 109.6520, aliases: [] },
  { name: 'Purworejo', province: 'Jawa Tengah', lat: -7.7136, lng: 110.0086, aliases: [] },
  { name: 'Wonosobo', province: 'Jawa Tengah', lat: -7.3632, lng: 109.9001, aliases: [] },
  { name: 'Temanggung', province: 'Jawa Tengah', lat: -7.3168, lng: 110.1755, aliases: [] },

  // DI Yogyakarta
  { name: 'Yogyakarta', province: 'Daerah Istimewa Yogyakarta', lat: -7.7956, lng: 110.3695, aliases: ['gondokusuman', 'umbulharjo', 'kotagede', 'malioboro'] },
  { name: 'Jogja', province: 'Daerah Istimewa Yogyakarta', lat: -7.7956, lng: 110.3695, aliases: [] },
  { name: 'Sleman', province: 'Daerah Istimewa Yogyakarta', lat: -7.7161, lng: 110.3556, aliases: ['depok sleman', 'mlati', 'ngaglik', 'gamping', 'seturan', 'jakal'] },
  { name: 'Bantul', province: 'Daerah Istimewa Yogyakarta', lat: -7.8879, lng: 110.3289, aliases: ['kasihan', 'sewon', 'banguntapan'] },
  { name: 'Gunungkidul', province: 'Daerah Istimewa Yogyakarta', lat: -7.9659, lng: 110.6026, aliases: ['wonosari', 'gunung kidul'] },
  { name: 'Kulon Progo', province: 'Daerah Istimewa Yogyakarta', lat: -7.8568, lng: 110.1592, aliases: ['wates'] },

  // Jawa Timur
  { name: 'Surabaya', province: 'Jawa Timur', lat: -7.2575, lng: 112.7521, aliases: ['gubeng', 'wonokromo', 'tegalsari', 'sukolilo', 'rungkut', 'wiyung', 'lakarsantri', 'sambikerep', 'pakuwon'] },
  { name: 'Malang', province: 'Jawa Timur', lat: -7.9666, lng: 112.6326, aliases: ['lowokwaru', 'klojen', 'blimbing', 'kepanjen', 'singosari'] },
  { name: 'Batu', province: 'Jawa Timur', lat: -7.8671, lng: 112.5239, aliases: [] },
  { name: 'Sidoarjo', province: 'Jawa Timur', lat: -7.4478, lng: 112.7183, aliases: ['waru', 'gedangan', 'taman sidoarjo'] },
  { name: 'Gresik', province: 'Jawa Timur', lat: -7.1567, lng: 112.6555, aliases: [] },
  { name: 'Mojokerto', province: 'Jawa Timur', lat: -7.4726, lng: 112.4341, aliases: [] },
  { name: 'Pasuruan', province: 'Jawa Timur', lat: -7.6453, lng: 112.9075, aliases: [] },
  { name: 'Probolinggo', province: 'Jawa Timur', lat: -7.7543, lng: 113.2159, aliases: [] },
  { name: 'Kediri', province: 'Jawa Timur', lat: -7.8169, lng: 112.0114, aliases: ['pare'] },
  { name: 'Blitar', province: 'Jawa Timur', lat: -8.0983, lng: 112.1681, aliases: [] },
  { name: 'Madiun', province: 'Jawa Timur', lat: -7.6298, lng: 111.5239, aliases: [] },
  { name: 'Banyuwangi', province: 'Jawa Timur', lat: -8.2192, lng: 114.3691, aliases: [] },
  { name: 'Jember', province: 'Jawa Timur', lat: -8.1724, lng: 113.7007, aliases: [] },
  { name: 'Lamongan', province: 'Jawa Timur', lat: -7.1186, lng: 112.4165, aliases: [] },
  { name: 'Tuban', province: 'Jawa Timur', lat: -6.8976, lng: 112.0468, aliases: [] },
  { name: 'Bojonegoro', province: 'Jawa Timur', lat: -7.1502, lng: 111.8817, aliases: [] },
  { name: 'Ngawi', province: 'Jawa Timur', lat: -7.4038, lng: 111.4461, aliases: [] },
  { name: 'Magetan', province: 'Jawa Timur', lat: -7.6540, lng: 111.3283, aliases: [] },
  { name: 'Ponorogo', province: 'Jawa Timur', lat: -7.8685, lng: 111.4620, aliases: [] },
  { name: 'Pacitan', province: 'Jawa Timur', lat: -8.1945, lng: 111.1045, aliases: [] },
  { name: 'Trenggalek', province: 'Jawa Timur', lat: -8.0500, lng: 111.7167, aliases: [] },
  { name: 'Tulungagung', province: 'Jawa Timur', lat: -8.0657, lng: 111.9026, aliases: [] },
  { name: 'Nganjuk', province: 'Jawa Timur', lat: -7.6050, lng: 111.9035, aliases: [] },
  { name: 'Jombang', province: 'Jawa Timur', lat: -7.5460, lng: 112.2331, aliases: [] },
  { name: 'Lumajang', province: 'Jawa Timur', lat: -8.1335, lng: 113.2248, aliases: [] },
  { name: 'Bondowoso', province: 'Jawa Timur', lat: -7.9135, lng: 113.8214, aliases: [] },
  { name: 'Situbondo', province: 'Jawa Timur', lat: -7.7062, lng: 114.0098, aliases: [] },
  { name: 'Bangkalan', province: 'Jawa Timur', lat: -7.0455, lng: 112.7351, aliases: [] },
  { name: 'Sampang', province: 'Jawa Timur', lat: -7.1872, lng: 113.2394, aliases: [] },
  { name: 'Pamekasan', province: 'Jawa Timur', lat: -7.1568, lng: 113.4746, aliases: [] },
  { name: 'Sumenep', province: 'Jawa Timur', lat: -7.0167, lng: 113.8667, aliases: [] },

  // Bali & Nusa Tenggara
  { name: 'Denpasar', province: 'Bali', lat: -8.6705, lng: 115.2126, aliases: ['sanur', 'renon', 'denpasar selatan', 'denpasar barat', 'denpasar timur', 'denpasar utara'] },
  { name: 'Badung', province: 'Bali', lat: -8.5819, lng: 115.1770, aliases: ['kuta', 'seminyak', 'canggu', 'kerobokan', 'jimbaran', 'nusa dua', 'uluwatu', 'mengwi'] },
  { name: 'Gianyar', province: 'Bali', lat: -8.5449, lng: 115.3255, aliases: ['ubud'] },
  { name: 'Tabanan', province: 'Bali', lat: -8.5411, lng: 115.1253, aliases: [] },
  { name: 'Buleleng', province: 'Bali', lat: -8.1120, lng: 115.0882, aliases: ['singaraja'] },
  { name: 'Klungkung', province: 'Bali', lat: -8.5333, lng: 115.4000, aliases: ['nusa penida'] },
  { name: 'Bangli', province: 'Bali', lat: -8.4542, lng: 115.3547, aliases: ['kintamani'] },
  { name: 'Karangasem', province: 'Bali', lat: -8.4482, lng: 115.6127, aliases: ['amlapura'] },
  { name: 'Jembrana', province: 'Bali', lat: -8.3569, lng: 114.6214, aliases: ['negara'] },
  { name: 'Bali', province: 'Bali', lat: -8.4095, lng: 115.1889, aliases: [] },
  { name: 'Mataram', province: 'Nusa Tenggara Barat', lat: -8.5833, lng: 116.1167, aliases: [] },
  { name: 'Bima', province: 'Nusa Tenggara Barat', lat: -8.4601, lng: 118.7267, aliases: [] },
  { name: 'Lombok Barat', province: 'Nusa Tenggara Barat', lat: -8.6953, lng: 116.1167, aliases: ['senggigi', 'gerung'] },
  { name: 'Lombok Tengah', province: 'Nusa Tenggara Barat', lat: -8.7000, lng: 116.2667, aliases: ['praya', 'mandalika'] },
  { name: 'Lombok Timur', province: 'Nusa Tenggara Barat', lat: -8.6500, lng: 116.5333, aliases: ['selong'] },
  { name: 'Sumbawa', province: 'Nusa Tenggara Barat', lat: -8.4932, lng: 117.4202, aliases: ['sumbawa besar'] },
  { name: 'Kupang', province: 'Nusa Tenggara Timur', lat: -10.1772, lng: 123.6070, aliases: [] },
  { name: 'Manggarai', province: 'Nusa Tenggara Timur', lat: -8.4964, lng: 119.8877, aliases: ['labuan bajo', 'manggarai barat'] },

  // Sumatera
  { name: 'Banda Aceh', province: 'Aceh', lat: 5.5483, lng: 95.3238, aliases: [] },
  { name: 'Sabang', province: 'Aceh', lat: 5.8946, lng: 95.3193, aliases: [] },
  { name: 'Lhokseumawe', province: 'Aceh', lat: 5.1801, lng: 97.1507, aliases: [] },
  { name: 'Langsa', province: 'Aceh', lat: 4.4683, lng: 97.9683, aliases: [] },
  { name: 'Subulussalam', province: 'Aceh', lat: 2.6423, lng: 98.0079, aliases: [] },
  { name: 'Medan', province: 'Sumatera Utara', lat: 3.5952, lng: 98.6722, aliases: ['medan baru', 'medan polonia', 'medan petisah', 'medan sunggal'] },
  { name: 'Binjai', province: 'Sumatera Utara', lat: 3.6001, lng: 98.4854, aliases: [] },
  { name: 'Tebing Tinggi', province: 'Sumatera Utara', lat: 3.3285, lng: 99.1625, aliases: [] },
  { name: 'Pematangsiantar', province: 'Sumatera Utara', lat: 2.9595, lng: 99.0682, aliases: ['siantar'] },
  { name: 'Tanjungbalai', province: 'Sumatera Utara', lat: 2.9667, lng: 99.8000, aliases: [] },
  { name: 'Sibolga', province: 'Sumatera Utara', lat: 1.7427, lng: 98.7792, aliases: [] },
  { name: 'Padangsidimpuan', province: 'Sumatera Utara', lat: 1.3779, lng: 99.2719, aliases: [] },
  { name: 'Gunungsitoli', province: 'Sumatera Utara', lat: 1.2856, lng: 97.6197, aliases: [] },
  { name: 'Deli Serdang', province: 'Sumatera Utara', lat: 3.4214, lng: 98.8673, aliases: ['lubuk pakam'] },
  { name: 'Padang', province: 'Sumatera Barat', lat: -0.9471, lng: 100.4172, aliases: [] },
  { name: 'Bukittinggi', province: 'Sumatera Barat', lat: -0.3056, lng: 100.3692, aliases: [] },
  { name: 'Payakumbuh', province: 'Sumatera Barat', lat: -0.2282, lng: 100.6317, aliases: [] },
  { name: 'Pariaman', province: 'Sumatera Barat', lat: -0.6264, lng: 100.1179, aliases: [] },
  { name: 'Solok', province: 'Sumatera Barat', lat: -0.7996, lng: 100.6566, aliases: [] },
  { name: 'Sawahlunto', province: 'Sumatera Barat', lat: -0.6815, lng: 100.7770, aliases: [] },
  { name: 'Padang Panjang', province: 'Sumatera Barat', lat: -0.4648, lng: 100.4004, aliases: [] },
  { name: 'Pekanbaru', province: 'Riau', lat: 0.5071, lng: 101.4478, aliases: [] },
  { name: 'Dumai', province: 'Riau', lat: 1.6667, lng: 101.4500, aliases: [] },
  { name: 'Batam', province: 'Kepulauan Riau', lat: 1.0456, lng: 104.0305, aliases: ['batam kota', 'lubuk baja', 'nagoya'] },
  { name: 'Tanjung Pinang', province: 'Kepulauan Riau', lat: 0.9186, lng: 104.4467, aliases: ['tanjungpinang'] },
  { name: 'Bintan', province: 'Kepulauan Riau', lat: 1.0789, lng: 104.4609, aliases: [] },
  { name: 'Karimun', province: 'Kepulauan Riau', lat: 1.0167, lng: 103.4167, aliases: ['tanjung balai karimun'] },
  { name: 'Jambi', province: 'Jambi', lat: -1.6101, lng: 103.6131, aliases: [] },
  { name: 'Sungai Penuh', province: 'Jambi', lat: -2.0636, lng: 101.3910, aliases: [] },
  { name: 'Palembang', province: 'Sumatera Selatan', lat: -2.9761, lng: 104.7754, aliases: [] },
  { name: 'Prabumulih', province: 'Sumatera Selatan', lat: -3.4328, lng: 104.2356, aliases: [] },
  { name: 'Pagar Alam', province: 'Sumatera Selatan', lat: -4.0209, lng: 103.2530, aliases: [] },
  { name: 'Lubuklinggau', province: 'Sumatera Selatan', lat: -3.2967, lng: 102.8617, aliases: [] },
  { name: 'Pangkalpinang', province: 'Kepulauan Bangka Belitung', lat: -2.1316, lng: 106.1169, aliases: ['pangkal pinang'] },
  { name: 'Belitung', province: 'Kepulauan Bangka Belitung', lat: -2.7410, lng: 107.6386, aliases: ['tanjung pandan'] },
  { name: 'Bengkulu', province: 'Bengkulu', lat: -3.7928, lng: 102.2608, aliases: [] },
  { name: 'Bandar Lampung', province: 'Lampung', lat: -5.3971, lng: 105.2668, aliases: ['lampung', 'tanjung karang'] },
  { name: 'Metro', province: 'Lampung', lat: -5.1131, lng: 105.3067, aliases: [] },

  // Kalimantan
  { name: 'Pontianak', province: 'Kalimantan Barat', lat: -0.0263, lng: 109.3425, aliases: [] },
  { name: 'Singkawang', province: 'Kalimantan Barat', lat: 0.9063, lng: 108.9872, aliases: [] },
  { name: 'Palangka Raya', province: 'Kalimantan Tengah', lat: -2.2136, lng: 113.9108, aliases: ['palangkaraya'] },
  { name: 'Banjarmasin', province: 'Kalimantan Selatan', lat: -3.3194, lng: 114.5908, aliases: [] },
  { name: 'Banjarbaru', province: 'Kalimantan Selatan', lat: -3.4420, lng: 114.8318, aliases: [] },
  { name: 'Samarinda', province: 'Kalimantan Timur', lat: -0.5022, lng: 117.1536, aliases: [] },
  { name: 'Balikpapan', province: 'Kalimantan Timur', lat: -1.2379, lng: 116.8529, aliases: ['ikn', 'nusantara'] },
  { name: 'Bontang', province: 'Kalimantan Timur', lat: 0.1333, lng: 117.5000, aliases: [] },
  { name: 'Tarakan', province: 'Kalimantan Utara', lat: 3.3000, lng: 117.6333, aliases: [] },
  { name: 'Kutai Kartanegara', province: 'Kalimantan Timur', lat: -0.4150, lng: 116.9814, aliases: ['tenggarong'] },

  // Sulawesi
  { name: 'Manado', province: 'Sulawesi Utara', lat: 1.4748, lng: 124.8421, aliases: [] },
  { name: 'Bitung', province: 'Sulawesi Utara', lat: 1.4451, lng: 125.1824, aliases: [] },
  { name: 'Tomohon', province: 'Sulawesi Utara', lat: 1.3238, lng: 124.8390, aliases: [] },
  { name: 'Kotamobagu', province: 'Sulawesi Utara', lat: 0.7277, lng: 124.3117, aliases: [] },
  { name: 'Palu', province: 'Sulawesi Tengah', lat: -0.8917, lng: 119.8707, aliases: [] },
  { name: 'Makassar', province: 'Sulawesi Selatan', lat: -5.1477, lng: 119.4327, aliases: ['ujung pandang', 'panakkukang'] },
  { name: 'Parepare', province: 'Sulawesi Selatan', lat: -4.0135, lng: 119.6255, aliases: [] },
  { name: 'Palopo', province: 'Sulawesi Selatan', lat: -2.9926, lng: 120.1969, aliases: [] },
  { name: 'Kendari', province: 'Sulawesi Tenggara', lat: -3.9985, lng: 122.5130, aliases: [] },
  { name: 'Bau-Bau', province: 'Sulawesi Tenggara', lat: -5.4667, lng: 122.6333, aliases: ['baubau'] },
  { name: 'Gorontalo', province: 'Gorontalo', lat: 0.5435, lng: 123.0568, aliases: [] },
  { name: 'Mamuju', province: 'Sulawesi Barat', lat: -2.6776, lng: 118.8875, aliases: [] },

  // Maluku & Papua
  { name: 'Ambon', province: 'Maluku', lat: -3.6954, lng: 128.1814, aliases: [] },
  { name: 'Tual', province: 'Maluku', lat: -5.6333, lng: 132.7500, aliases: [] },
  { name: 'Ternate', province: 'Maluku Utara', lat: 0.7893, lng: 127.3774, aliases: [] },
  { name: 'Tidore', province: 'Maluku Utara', lat: 0.6833, lng: 127.4000, aliases: [] },
  { name: 'Jayapura', province: 'Papua', lat: -2.5916, lng: 140.6690, aliases: [] },
  { name: 'Sorong', province: 'Papua Barat Daya', lat: -0.8762, lng: 131.2558, aliases: [] },
  { name: 'Merauke', province: 'Papua Selatan', lat: -8.4932, lng: 140.4018, aliases: [] },
  { name: 'Timika', province: 'Papua Tengah', lat: -4.5446, lng: 136.8886, aliases: ['mimika'] },
  { name: 'Manokwari', province: 'Papua Barat', lat: -0.8615, lng: 134.0620, aliases: [] },
];

const PRECOMPUTED_ID_CITIES = INDONESIAN_CITY_INDEX.map((entry) => ({
  ...entry,
  normName: normalizeCityKey(entry.name),
  normAliases: (entry.aliases || []).map((a) => normalizeCityKey(a)),
}));

function buildCityResponseObject({
  name,
  country = 'Indonesia',
  countryCode = 'ID',
  region = '',
  lat = 0,
  lng = 0,
}) {
  const cleanName = String(name || '').trim();
  const upperCode = String(countryCode || 'ID').toUpperCase();
  const isIndonesia = upperCode === 'ID';
  const label = isIndonesia || !country ? cleanName : `${cleanName}, ${country}`;
  const numLat = Number.isFinite(Number(lat)) ? Number(lat) : 0;
  const numLng = Number.isFinite(Number(lng)) ? Number(lng) : 0;
  return {
    name: cleanName,
    label,
    region: String(region || '').trim(),
    country: String(country || (isIndonesia ? 'Indonesia' : '')).trim(),
    countryCode: upperCode,
    isIndonesia,
    lat: numLat,
    lng: numLng,
    cityToken: signCityToken(cleanName, numLat, numLng),
    labelToken: signCityToken(label, numLat, numLng),
  };
}

/**
 * Matches a single candidate string against the Indonesia priority index.
 */
export function matchIndonesianCity(rawCandidate) {
  const norm = normalizeCityKey(rawCandidate);
  if (!norm || norm.length < 3) return null;

  // 1. Exact canonical name match
  for (const item of PRECOMPUTED_ID_CITIES) {
    if (item.normName === norm || item.normName.replace(/\s+/g, '') === norm.replace(/\s+/g, '')) {
      return buildCityResponseObject({
        name: item.name,
        country: 'Indonesia',
        countryCode: 'ID',
        region: item.province,
        lat: item.lat,
        lng: item.lng,
      });
    }
  }

  // 2. Exact alias / district->city match
  for (const item of PRECOMPUTED_ID_CITIES) {
    if (item.normAliases.some((al) => al === norm)) {
      return buildCityResponseObject({
        name: item.name,
        country: 'Indonesia',
        countryCode: 'ID',
        region: item.province,
        lat: item.lat,
        lng: item.lng,
      });
    }
  }

  // 3. Substring scan ordered by longest canonical/alias name first (so "Tangerang Selatan" beats "Tangerang")
  let best = null;
  let bestLen = 0;
  for (const item of PRECOMPUTED_ID_CITIES) {
    const terms = [item.normName, ...item.normAliases];
    for (const term of terms) {
      if (term.length < 4) continue;
      const wordBoundaryRegex = new RegExp(`(?:^|\\b)${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\b|$)`, 'i');
      if (wordBoundaryRegex.test(norm) && term.length > bestLen) {
        best = item;
        bestLen = term.length;
      }
    }
  }

  if (best) {
    return buildCityResponseObject({
      name: best.name,
      country: 'Indonesia',
      countryCode: 'ID',
      region: best.province,
      lat: best.lat,
      lng: best.lng,
    });
  }

  return null;
}

/**
 * Dynamic Worldwide City Search via OpenStreetMap Photon + Nominatim (Zero Hardcoding)
 */
async function queryWorldwidePhotonCities(query, fetchImpl = fetch) {
  const url =
    `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}` +
    `&osm_tag=place:city&osm_tag=place:town&osm_tag=place:municipality&limit=10&lang=en`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2000);
  try {
    const res = await fetchImpl(url, { signal: controller.signal });
    if (!res.ok) return [];
    const data = await res.json();
    const out = [];
    for (const f of data?.features || []) {
      const p = f?.properties || {};
      const rawCity = p.name || p.city || p.county || '';
      if (!rawCity || rawCity.length < 2) continue;
      const [lon, lat] = f?.geometry?.coordinates || [0, 0];
      const countryCode = String(p.countrycode || '').toUpperCase() || 'XX';
      const country = p.country || (countryCode === 'ID' ? 'Indonesia' : '');
      const region = p.state || p.county || '';
      if (countryCode === 'ID') {
        const idMatch = matchIndonesianCity(rawCity);
        if (idMatch) {
          out.push(idMatch);
          continue;
        }
      }
      out.push(
        buildCityResponseObject({
          name: rawCity,
          country,
          countryCode,
          region,
          lat,
          lng: lon,
        })
      );
    }
    return out;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function queryWorldwideNominatimCities(query, fetchImpl = fetch) {
  const url =
    `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1` +
    `&featuretype=city&limit=8&q=${encodeURIComponent(query)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2200);
  try {
    const res = await fetchImpl(url, {
      headers: {
        'User-Agent': 'Kalceria-Platform/1.0 (contact@kalceria.id)',
        'Accept-Language': 'id,en',
      },
      signal: controller.signal,
    });
    if (!res.ok) return [];
    const items = await res.json();
    const out = [];
    for (const item of items || []) {
      const a = item?.address || {};
      const rawCity =
        a.city ||
        a.town ||
        a.municipality ||
        a.city_district ||
        a.county ||
        item.name ||
        '';
      if (!rawCity || rawCity.length < 2) continue;
      const countryCode = String(a.country_code || '').toUpperCase() || 'XX';
      const country = a.country || (countryCode === 'ID' ? 'Indonesia' : '');
      const region = a.state || a.province || a.region || '';
      if (countryCode === 'ID') {
        const idMatch = matchIndonesianCity(rawCity);
        if (idMatch) {
          out.push(idMatch);
          continue;
        }
      }
      out.push(
        buildCityResponseObject({
          name: rawCity,
          country,
          countryCode,
          region,
          lat: item.lat,
          lng: item.lon,
        })
      );
    }
    return out;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Searches Indonesian (prioritized #1) + Worldwide cities dynamically.
 */
export async function searchWorldwideAndIndonesianCities(rawQuery, { limit = 10, fetchImpl = fetch } = {}) {
  const q = String(rawQuery || '').trim();
  if (q.length < 2) return [];

  const normQ = normalizeCityKey(q);
  const cacheKey = `city:search:v1:${normQ}`;
  const cached = await getCached(cacheKey);
  if (Array.isArray(cached) && cached.length > 0) {
    return cached.slice(0, limit);
  }

  // 1. Instant Indonesia Priority Matches
  const idPrefixMatches = [];
  const idContainsMatches = [];
  for (const item of PRECOMPUTED_ID_CITIES) {
    if (item.normName.startsWith(normQ)) {
      idPrefixMatches.push(
        buildCityResponseObject({
          name: item.name,
          country: 'Indonesia',
          countryCode: 'ID',
          region: item.province,
          lat: item.lat,
          lng: item.lng,
        })
      );
    } else if (
      item.normName.includes(normQ) ||
      item.normAliases.some((al) => al.startsWith(normQ))
    ) {
      idContainsMatches.push(
        buildCityResponseObject({
          name: item.name,
          country: 'Indonesia',
          countryCode: 'ID',
          region: item.province,
          lat: item.lat,
          lng: item.lng,
        })
      );
    }
  }

  // 2. Dynamic Worldwide Geocoder Query (Photon + Nominatim)
  const [photonCities, nominatimCities] = await Promise.all([
    queryWorldwidePhotonCities(q, fetchImpl),
    queryWorldwideNominatimCities(q, fetchImpl),
  ]);

  const dynamicIndonesia = [];
  const dynamicWorldwide = [];
  for (const c of [...photonCities, ...nominatimCities]) {
    if (c.isIndonesia) dynamicIndonesia.push(c);
    else dynamicWorldwide.push(c);
  }

  // Deduplicate while keeping Indonesia strictly prioritized first
  const ordered = [
    ...idPrefixMatches,
    ...idContainsMatches,
    ...dynamicIndonesia,
    ...dynamicWorldwide,
  ];

  const seen = new Set();
  const deduped = [];
  for (const item of ordered) {
    const key = `${normalizeCityKey(item.name)}|${item.countryCode}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
    await setCached(`city:verified:v1:${normalizeCityKey(item.name)}`, item);
    await setCached(`city:verified:v1:${normalizeCityKey(item.label)}`, item);
    if (deduped.length >= Math.max(limit, 12)) break;
  }

  if (deduped.length > 0) {
    await setCached(cacheKey, deduped);
  }

  return deduped.slice(0, limit);
}

/**
 * Extracts a 4-digit Birth Year (YYYY) from Google People API birthdays or date strings.
 */
export function extractBirthYearFromGoogle(peopleOrClaims = {}) {
  const currentYear = new Date().getFullYear();
  const isValidYear = (y) => Number.isInteger(y) && y >= 1920 && y <= currentYear;

  // 1. Google People API birthdays array
  const birthdays = Array.isArray(peopleOrClaims?.birthdays) ? peopleOrClaims.birthdays : [];
  if (birthdays.length > 0) {
    // Prefer primary metadata entry that actually contains a 4-digit year
    const sorted = [...birthdays].sort(
      (a, b) => Number(Boolean(b?.metadata?.primary)) - Number(Boolean(a?.metadata?.primary))
    );
    for (const b of sorted) {
      const yearNum = Number(b?.date?.year);
      if (isValidYear(yearNum)) {
        return String(yearNum);
      }
      if (typeof b?.text === 'string') {
        const match = b.text.match(/\b(19\d{2}|20\d{2})\b/);
        if (match && isValidYear(Number(match[1]))) {
          return match[1];
        }
      }
    }
  }

  // 2. Fallback OIDC / string birthdate claim (e.g. "2001-08-17" or "17/08/2001")
  const rawStr = peopleOrClaims?.birthdate || peopleOrClaims?.birthday || peopleOrClaims?.dob || '';
  if (typeof rawStr === 'string' && rawStr.trim()) {
    const match = rawStr.trim().match(/\b(19\d{2}|20\d{2})\b/);
    if (match && isValidYear(Number(match[1]))) {
      return match[1];
    }
  }

  return '';
}

function cleanAddressNoise(str) {
  return String(str || '')
    .replace(/\b(?:jl|jln|jalan|gg|gang|blok|block|rt|rw|no|nomor|apt|apartemen|apartment|suite|ste|unit|lt|lantai|kav|kavling)\.?\s*[a-z0-9./-]*/gi, ' ')
    .replace(/\b\d{4,6}\b/g, ' ') // strip postal codes (5-digit ID/US, 4-digit AU/SG, 6-digit SG/JP)
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts and verifies the user's City (Kota) from Google People API full address(es),
 * prioritizing Indonesia first and dynamically resolving worldwide addresses cleanly.
 */
export async function resolveCityFromGoogleProfile(peopleData = {}, { fetchImpl = fetch } = {}) {
  const addresses = Array.isArray(peopleData?.addresses) ? peopleData.addresses : [];
  if (addresses.length === 0) return null;

  const sorted = [...addresses].sort((a, b) => {
    const aScore = (a?.metadata?.primary ? 2 : 0) + (String(a?.type || '').toLowerCase() === 'home' ? 1 : 0);
    const bScore = (b?.metadata?.primary ? 2 : 0) + (String(b?.type || '').toLowerCase() === 'home' ? 1 : 0);
    return bScore - aScore;
  });

  for (const addr of sorted) {
    const countryCode = String(addr?.countryCode || '').trim().toUpperCase();
    const country = String(addr?.country || '').trim();
    const rawCity = String(addr?.city || '').trim();
    const rawSublocality = String(addr?.sublocality || '').trim();
    const rawRegion = String(addr?.region || '').trim();
    const rawFormatted = String(addr?.formattedValue || '').trim();
    const rawStreet = String(addr?.streetAddress || '').trim();

    const looksIndonesian =
      countryCode === 'ID' ||
      /\bindonesia\b/i.test(country) ||
      /\bindonesia\b/i.test(rawFormatted) ||
      (!countryCode && !country && Boolean(matchIndonesianCity(`${rawCity} ${rawSublocality} ${rawRegion} ${rawFormatted}`)));

    // A. Indonesia Priority Extraction (Structured -> Sublocality -> Full Formatted Address)
    if (looksIndonesian) {
      for (const candidate of [rawCity, rawSublocality, `${rawCity} ${rawRegion}`, rawFormatted, rawStreet]) {
        if (!candidate) continue;
        const idCity = matchIndonesianCity(cleanAddressNoise(candidate));
        if (idCity) {
          await setCached(`city:verified:v1:${normalizeCityKey(idCity.name)}`, idCity);
          return idCity;
        }
      }
    }

    // B. Structured International / Unindexed Indonesian City via Dynamic Worldwide Resolver
    const structuredCandidates = [];
    if (rawCity) {
      const cleanedCity = cleanAddressNoise(rawCity)
        .replace(/-shi$/i, '')
        .trim();
      if (cleanedCity.length >= 2) {
        structuredCandidates.push(
          country ? `${cleanedCity}, ${country}` : cleanedCity,
          cleanedCity
        );
      }
    }

    // C. Parse comma/newline-delimited segments of formattedValue (from locality toward country)
    if (rawFormatted) {
      const segments = rawFormatted
        .split(/[,\n]+/)
        .map((s) => cleanAddressNoise(s))
        .filter((s) => s.length >= 2 && !/^(indonesia|japan|singapore\s+\d+|malaysia|australia|united\s+states|usa|uk|united\s+kingdom)$/i.test(s));

      // Check if any segment matches an Indonesian city first
      for (const seg of segments) {
        const idCity = matchIndonesianCity(seg);
        if (idCity) {
          await setCached(`city:verified:v1:${normalizeCityKey(idCity.name)}`, idCity);
          return idCity;
        }
      }

      // Otherwise add locality-level segments (typically near the end before region/country)
      for (let i = Math.max(0, segments.length - 3); i < segments.length; i++) {
        const seg = segments[i].replace(/-shi$/i, '').trim();
        if (seg.length >= 2) {
          structuredCandidates.push(country ? `${seg}, ${country}` : seg, seg);
        }
      }
    }

    for (const query of structuredCandidates) {
      const found = await searchWorldwideAndIndonesianCities(query, { limit: 3, fetchImpl });
      if (found.length > 0) {
        return found[0];
      }
    }
  }

  return null;
}

/**
 * Resolves & validates a city string + coordinates during registration.
 */
export async function resolveAndValidateCity(
  rawDomicile,
  { domicileLat, domicileLng, cityToken, fetchImpl = fetch } = {}
) {
  const clean = String(rawDomicile || '').trim();
  if (!clean) {
    return { valid: false, coords: [0, 0], city: null };
  }

  // 1. Check Indonesia Priority Index first (0ms)
  const idMatch = matchIndonesianCity(clean);
  if (idMatch) {
    const lat = Number.isFinite(Number(domicileLat)) && Number(domicileLat) !== 0 ? Number(domicileLat) : idMatch.lat;
    const lng = Number.isFinite(Number(domicileLng)) && Number(domicileLng) !== 0 ? Number(domicileLng) : idMatch.lng;
    return { valid: true, coords: [lat, lng], city: idMatch };
  }

  // 2. Check cryptographic cityToken if provided by autocomplete / Google prefill
  if (cityToken && verifyCityToken(clean, domicileLat, domicileLng, cityToken)) {
    return {
      valid: true,
      coords: [Number(domicileLat) || 0, Number(domicileLng) || 0],
      city: buildCityResponseObject({
        name: clean.split(',')[0].trim(),
        country: clean.includes(',') ? clean.split(',').slice(1).join(',').trim() : '',
        countryCode: 'WW',
        lat: domicileLat,
        lng: domicileLng,
      }),
    };
  }

  // 3. Check Redis/Memory verified cache
  const norm = normalizeCityKey(clean);
  const cached = await getCached(`city:verified:v1:${norm}`);
  if (cached) {
    return {
      valid: true,
      coords: [cached.lat || 0, cached.lng || 0],
      city: cached,
    };
  }

  // 4. Live dynamic lookup against Worldwide + Indonesia City Search
  const matches = await searchWorldwideAndIndonesianCities(clean, { limit: 5, fetchImpl });
  const exactOrClose = matches.find((m) => {
    const mName = normalizeCityKey(m.name);
    const mLabel = normalizeCityKey(m.label);
    return mName === norm || mLabel === norm || (norm.length >= 4 && mName.startsWith(norm));
  });

  if (exactOrClose) {
    return {
      valid: true,
      coords: [exactOrClose.lat || 0, exactOrClose.lng || 0],
      city: exactOrClose,
    };
  }

  return { valid: false, coords: [0, 0], city: null };
}

// Express Route Handler: GET /api/location/cities?q=...
export async function searchCitiesEndpoint(req, res) {
  const rawQuery = typeof req.query?.q === 'string' ? req.query.q.trim() : '';
  if (!rawQuery || rawQuery.length < 2 || rawQuery.length > 120) {
    return res.json({ cities: [] });
  }
  const cities = await searchWorldwideAndIndonesianCities(rawQuery, { limit: 10 });
  res.setHeader('Cache-Control', 'public, max-age=300');
  return res.json({ cities });
}

