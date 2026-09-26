export interface KnownCity {
  name: string;
  lat: number;
  lng: number;
}

export const KNOWN_CITIES: KnownCity[] = [
  { name: "New Delhi", lat: 28.6139, lng: 77.209 },
  { name: "Hyderabad", lat: 17.385, lng: 78.4867 },
  { name: "Mumbai", lat: 19.076, lng: 72.8777 },
  { name: "Bengaluru", lat: 12.9716, lng: 77.5946 },
  { name: "Chennai", lat: 13.0827, lng: 80.2707 },
  { name: "Kolkata", lat: 22.5726, lng: 88.3639 },
  { name: "Pune", lat: 18.5204, lng: 73.8567 },
  { name: "Ahmedabad", lat: 23.0225, lng: 72.5714 },
  { name: "Jaipur", lat: 26.9124, lng: 75.7873 },
  { name: "Lucknow", lat: 26.8467, lng: 80.9462 },
  { name: "Chandigarh", lat: 30.7333, lng: 76.7794 },
  { name: "Bhopal", lat: 23.2599, lng: 77.4126 },
  { name: "Nagpur", lat: 21.1458, lng: 79.0882 },
  { name: "Patna", lat: 25.5941, lng: 85.1376 },
  { name: "Kochi", lat: 9.9312, lng: 76.2673 },
  { name: "Indore", lat: 22.7196, lng: 75.8577 },
  { name: "Surat", lat: 21.1702, lng: 72.8311 },
  { name: "Visakhapatnam", lat: 17.6868, lng: 83.2185 },
  { name: "Coimbatore", lat: 11.0168, lng: 76.9558 },
  { name: "Guwahati", lat: 26.1445, lng: 91.7362 },
];

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(a));
}

export function nearestCity(
  lat: number,
  lng: number
): { city: KnownCity; distanceKm: number } {
  let best = KNOWN_CITIES[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const city of KNOWN_CITIES) {
    const distance = haversineKm(lat, lng, city.lat, city.lng);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = city;
    }
  }
  return { city: best, distanceKm: bestDistance };
}

export function resolveCity(lat: number, lng: number): string {
  const { city, distanceKm } = nearestCity(lat, lng);
  if (distanceKm <= 150) return city.name;
  return `Uncharted region (${lat.toFixed(2)}, ${lng.toFixed(2)})`;
}
