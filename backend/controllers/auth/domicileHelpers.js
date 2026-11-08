import argon2 from 'argon2';
import { sanitizeProfilePictureUrl } from '../../utils/profileDefaults.js';

export const CITY_COORDS = {
  jakarta: [-6.2088, 106.8456],
  bintaro: [-6.2715, 106.7135],
  tangerang: [-6.1783, 106.6319],
  tangsel: [-6.2886, 106.7179],
  depok: [-6.4025, 106.7942],
  bekasi: [-6.2383, 106.9756],
  bogor: [-6.5971, 106.8060],
  bandung: [-6.9175, 107.6191],
  semarang: [-6.9667, 110.4167],
  yogyakarta: [-7.7956, 110.3695],
  jogja: [-7.7956, 110.3695],
  surabaya: [-7.2575, 112.7521],
  malang: [-7.9666, 112.6326],
  bali: [-8.6705, 115.2126],
  denpasar: [-8.6705, 115.2126],
  medan: [3.5952, 98.6722],
  makassar: [-5.1477, 119.4327],
};

export function resolveDomicileCoords(domicile, domicileLat, domicileLng) {
  if (domicileLat !== undefined || domicileLng !== undefined) {
    return [
      domicileLat === undefined ? 0 : Number(domicileLat),
      domicileLng === undefined ? 0 : Number(domicileLng),
    ];
  }
  if (typeof domicile === 'string' && domicile.trim()) {
    const key = domicile.trim().toLowerCase();
    for (const [city, coords] of Object.entries(CITY_COORDS)) {
      if (key.includes(city)) return coords;
    }
  }
  return [0, 0];
}

export function sanitizeProfilePicture(value) {
  return sanitizeProfilePictureUrl(value);
}

// Verified against when no account matches, so unknown and known accounts take
// comparable time and login timing does not reveal which emails exist.
let dummyPasswordHash;
export const getDummyPasswordHash = () => (dummyPasswordHash ??= argon2.hash('timing-equalization-placeholder'));
