// calculate distance between two coordinates using the Haversine formula
function haversineDistance(userLat, userLon, jobLat, jobLon) {
  function toRad(degree) {
    return (degree * Math.PI) / 180;
  }

  const lat1 = toRad(userLat);
  const lon1 = toRad(userLon);
  const lat2 = toRad(jobLat);
  const lon2 = toRad(jobLon);

  const { sin, cos, sqrt, atan2 } = Math;

  // earth radius in km
  const R = 6371.2;
  // differences in coordinates
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  // Haversine formula
  const a = sin(dLat / 2) * sin(dLat / 2) + cos(lat1) * cos(lat2) * sin(dLon / 2) * sin(dLon / 2);
  const c = 2 * atan2(sqrt(a), sqrt(1 - a));
  const d = R * c;
  // distance in km
  return d;
}

module.exports = haversineDistance;
