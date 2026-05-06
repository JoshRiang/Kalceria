/**
 * Mock reverse geocoding.
 * In production: swap with Google Maps Geocoding API or Nominatim.
 *
 * Input : precise lat/lng
 * Output: district string (hides exact address)
 */

const DISTRICT_GRID = [
  { minLat: -6.30, maxLat: -6.25, minLng: 106.82, maxLng: 106.87, name: 'Kecamatan Sukmajaya' },
  { minLat: -6.25, maxLat: -6.20, minLng: 106.82, maxLng: 106.87, name: 'Kecamatan Cimanggis' },
  { minLat: -6.35, maxLat: -6.30, minLng: 106.78, maxLng: 106.83, name: 'Kecamatan Pancoran Mas' },
  { minLat: -6.20, maxLat: -6.15, minLng: 106.84, maxLng: 106.90, name: 'Kecamatan Tapos' },
  { minLat: -6.30, maxLat: -6.25, minLng: 106.75, maxLng: 106.82, name: 'Kecamatan Bojonggede' },
];

export function maskLocationToDistrict(lat, lng) {
  const match = DISTRICT_GRID.find(
    (d) => lat >= d.minLat && lat < d.maxLat && lng >= d.minLng && lng < d.maxLng
  );
  return match ? match.name : 'Area Depok';
}
