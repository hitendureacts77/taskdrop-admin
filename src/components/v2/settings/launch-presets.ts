/** Ready-made launch areas: city centre and a radius that covers the city (admin v2, WP8a). Pure. */
export const LAUNCH_PRESETS = [
  { key: 'hyderabad', name: 'Hyderabad', lat: 17.385, lng: 78.4867, radiusKm: 40 },
  { key: 'bengaluru', name: 'Bengaluru', lat: 12.9716, lng: 77.5946, radiusKm: 35 },
  { key: 'chennai', name: 'Chennai', lat: 13.0827, lng: 80.2707, radiusKm: 35 },
  { key: 'mumbai', name: 'Mumbai', lat: 19.076, lng: 72.8777, radiusKm: 40 },
  { key: 'pune', name: 'Pune', lat: 18.5204, lng: 73.8567, radiusKm: 30 },
  { key: 'delhi', name: 'Delhi NCR', lat: 28.6139, lng: 77.209, radiusKm: 45 },
  { key: 'kolkata', name: 'Kolkata', lat: 22.5726, lng: 88.3639, radiusKm: 30 },
  { key: 'vijayawada', name: 'Vijayawada', lat: 16.5062, lng: 80.648, radiusKm: 20 },
  { key: 'visakhapatnam', name: 'Visakhapatnam', lat: 17.6868, lng: 83.2185, radiusKm: 25 },
] as const;

export function presetFor(key: string) {
  return LAUNCH_PRESETS.find((p) => p.key === key) ?? null;
}
