// Offline gazetteer used to turn a typed birthplace into coordinates + IANA time zone.
// Birth details are stored as free text ("City, State, Country"), so a place that is
// not listed here cannot be charted; the workspace reports that instead of guessing.
// Format: name, state/region, lat, lon, IANA zone.
const IN = 'Asia/Kolkata'
const ROWS = [
  ['Chennai', 'Tamil Nadu', 13.0827, 80.2707, IN], ['Madras', 'Tamil Nadu', 13.0827, 80.2707, IN],
  ['Coimbatore', 'Tamil Nadu', 11.0168, 76.9558, IN], ['Madurai', 'Tamil Nadu', 9.9252, 78.1198, IN],
  ['Tiruchirappalli', 'Tamil Nadu', 10.7905, 78.7047, IN], ['Trichy', 'Tamil Nadu', 10.7905, 78.7047, IN],
  ['Salem', 'Tamil Nadu', 11.6643, 78.146, IN], ['Tirunelveli', 'Tamil Nadu', 8.7139, 77.7567, IN],
  ['Erode', 'Tamil Nadu', 11.341, 77.7172, IN], ['Vellore', 'Tamil Nadu', 12.9165, 79.1325, IN],
  ['Thanjavur', 'Tamil Nadu', 10.787, 79.1378, IN], ['Tiruppur', 'Tamil Nadu', 11.1085, 77.3411, IN],
  ['Thoothukudi', 'Tamil Nadu', 8.7642, 78.1348, IN], ['Kanyakumari', 'Tamil Nadu', 8.0883, 77.5385, IN],
  ['Puducherry', 'Puducherry', 11.9416, 79.8083, IN], ['Pondicherry', 'Puducherry', 11.9416, 79.8083, IN],
  ['Bengaluru', 'Karnataka', 12.9716, 77.5946, IN], ['Bangalore', 'Karnataka', 12.9716, 77.5946, IN],
  ['Mysuru', 'Karnataka', 12.2958, 76.6394, IN], ['Mysore', 'Karnataka', 12.2958, 76.6394, IN],
  ['Mangaluru', 'Karnataka', 12.9141, 74.856, IN], ['Hubballi', 'Karnataka', 15.3647, 75.124, IN],
  ['Hyderabad', 'Telangana', 17.385, 78.4867, IN], ['Warangal', 'Telangana', 17.9689, 79.5941, IN],
  ['Visakhapatnam', 'Andhra Pradesh', 17.6868, 83.2185, IN], ['Vijayawada', 'Andhra Pradesh', 16.5062, 80.648, IN],
  ['Tirupati', 'Andhra Pradesh', 13.6288, 79.4192, IN], ['Guntur', 'Andhra Pradesh', 16.3067, 80.4365, IN],
  ['Kochi', 'Kerala', 9.9312, 76.2673, IN], ['Cochin', 'Kerala', 9.9312, 76.2673, IN],
  ['Thiruvananthapuram', 'Kerala', 8.5241, 76.9366, IN], ['Trivandrum', 'Kerala', 8.5241, 76.9366, IN],
  ['Kozhikode', 'Kerala', 11.2588, 75.7804, IN], ['Thrissur', 'Kerala', 10.5276, 76.2144, IN],
  ['Mumbai', 'Maharashtra', 19.076, 72.8777, IN], ['Bombay', 'Maharashtra', 19.076, 72.8777, IN],
  ['Pune', 'Maharashtra', 18.5204, 73.8567, IN], ['Nagpur', 'Maharashtra', 21.1458, 79.0882, IN],
  ['Nashik', 'Maharashtra', 19.9975, 73.7898, IN], ['Aurangabad', 'Maharashtra', 19.8762, 75.3433, IN],
  ['Ahmedabad', 'Gujarat', 23.0225, 72.5714, IN], ['Surat', 'Gujarat', 21.1702, 72.8311, IN],
  ['Vadodara', 'Gujarat', 22.3072, 73.1812, IN], ['Rajkot', 'Gujarat', 22.3039, 70.8022, IN],
  ['Delhi', 'Delhi', 28.6139, 77.209, IN], ['New Delhi', 'Delhi', 28.6139, 77.209, IN],
  ['Gurugram', 'Haryana', 28.4595, 77.0266, IN], ['Chandigarh', 'Chandigarh', 30.7333, 76.7794, IN],
  ['Jaipur', 'Rajasthan', 26.9124, 75.7873, IN], ['Jodhpur', 'Rajasthan', 26.2389, 73.0243, IN],
  ['Udaipur', 'Rajasthan', 24.5854, 73.7125, IN], ['Lucknow', 'Uttar Pradesh', 26.8467, 80.9462, IN],
  ['Kanpur', 'Uttar Pradesh', 26.4499, 80.3319, IN], ['Varanasi', 'Uttar Pradesh', 25.3176, 82.9739, IN],
  ['Agra', 'Uttar Pradesh', 27.1767, 78.0081, IN], ['Noida', 'Uttar Pradesh', 28.5355, 77.391, IN],
  ['Prayagraj', 'Uttar Pradesh', 25.4358, 81.8463, IN], ['Allahabad', 'Uttar Pradesh', 25.4358, 81.8463, IN],
  ['Patna', 'Bihar', 25.5941, 85.1376, IN], ['Ranchi', 'Jharkhand', 23.3441, 85.3096, IN],
  ['Kolkata', 'West Bengal', 22.5726, 88.3639, IN], ['Calcutta', 'West Bengal', 22.5726, 88.3639, IN],
  ['Bhubaneswar', 'Odisha', 20.2961, 85.8245, IN], ['Cuttack', 'Odisha', 20.4625, 85.883, IN],
  ['Guwahati', 'Assam', 26.1445, 91.7362, IN], ['Bhopal', 'Madhya Pradesh', 23.2599, 77.4126, IN],
  ['Indore', 'Madhya Pradesh', 22.7196, 75.8577, IN], ['Raipur', 'Chhattisgarh', 21.2514, 81.6296, IN],
  ['Dehradun', 'Uttarakhand', 30.3165, 78.0322, IN], ['Haridwar', 'Uttarakhand', 29.9457, 78.1642, IN],
  ['Amritsar', 'Punjab', 31.634, 74.8723, IN], ['Ludhiana', 'Punjab', 30.901, 75.8573, IN],
  ['Panaji', 'Goa', 15.4909, 73.8278, IN], ['Goa', 'Goa', 15.2993, 74.124, IN],
  ['Colombo', 'Sri Lanka', 6.9271, 79.8612, 'Asia/Colombo'], ['Jaffna', 'Sri Lanka', 9.6615, 80.0255, 'Asia/Colombo'],
  ['Kathmandu', 'Nepal', 27.7172, 85.324, 'Asia/Kathmandu'], ['Dhaka', 'Bangladesh', 23.8103, 90.4125, 'Asia/Dhaka'],
  ['Singapore', 'Singapore', 1.3521, 103.8198, 'Asia/Singapore'], ['Kuala Lumpur', 'Malaysia', 3.139, 101.6869, 'Asia/Kuala_Lumpur'],
  ['Dubai', 'UAE', 25.2048, 55.2708, 'Asia/Dubai'], ['Abu Dhabi', 'UAE', 24.4539, 54.3773, 'Asia/Dubai'],
  ['Doha', 'Qatar', 25.2854, 51.531, 'Asia/Qatar'], ['Riyadh', 'Saudi Arabia', 24.7136, 46.6753, 'Asia/Riyadh'],
  ['London', 'United Kingdom', 51.5072, -0.1276, 'Europe/London'], ['New York', 'United States', 40.7128, -74.006, 'America/New_York'],
  ['San Francisco', 'United States', 37.7749, -122.4194, 'America/Los_Angeles'], ['Los Angeles', 'United States', 34.0522, -118.2437, 'America/Los_Angeles'],
  ['Chicago', 'United States', 41.8781, -87.6298, 'America/Chicago'], ['Toronto', 'Canada', 43.6532, -79.3832, 'America/Toronto'],
  ['Sydney', 'Australia', -33.8688, 151.2093, 'Australia/Sydney'], ['Melbourne', 'Australia', -37.8136, 144.9631, 'Australia/Melbourne'],
]

const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim()

/**
 * Finds a place from free text like "Coimbatore, TN" or "Chennai, Tamil Nadu, India".
 * Matches any comma-separated part against a listed city name.
 * Returns { name, region, lat, lon, timeZone } or null when the place is not in the gazetteer.
 */
export function findBirthPlace(text) {
  const parts = String(text || '').split(',').map(normalize).filter(Boolean)
  for (const part of parts) {
    const hit = ROWS.find(([name]) => normalize(name) === part)
    if (hit) return { name: hit[0], region: hit[1], lat: hit[2], lon: hit[3], timeZone: hit[4] }
  }
  const whole = normalize(text)
  const hit = ROWS.find(([name]) => whole.includes(normalize(name)))
  return hit ? { name: hit[0], region: hit[1], lat: hit[2], lon: hit[3], timeZone: hit[4] } : null
}
