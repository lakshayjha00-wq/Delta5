// All 194 UN member countries with approximate centroid coordinates and region
const countries = [
  // AFRICA
  { name: "Algeria", lat: 28.03, lng: 1.66, region: "AF" },
  { name: "Angola", lat: -11.20, lng: 17.87, region: "AF" },
  { name: "Benin", lat: 9.31, lng: 2.31, region: "AF" },
  { name: "Botswana", lat: -22.33, lng: 24.68, region: "AF" },
  { name: "Burkina Faso", lat: 12.24, lng: -1.56, region: "AF" },
  { name: "Burundi", lat: -3.37, lng: 29.92, region: "AF" },
  { name: "Cabo Verde", lat: 16.00, lng: -24.01, region: "AF" },
  { name: "Cameroon", lat: 7.37, lng: 12.35, region: "AF" },
  { name: "Central African Republic", lat: 6.61, lng: 20.94, region: "AF" },
  { name: "Chad", lat: 15.45, lng: 18.73, region: "AF" },
  { name: "Comoros", lat: -11.65, lng: 43.33, region: "AF" },
  { name: "Congo (DRC)", lat: -4.04, lng: 21.76, region: "AF" },
  { name: "Congo (Republic)", lat: -0.23, lng: 15.83, region: "AF" },
  { name: "Cote d'Ivoire", lat: 7.54, lng: -5.55, region: "AF" },
  { name: "Djibouti", lat: 11.59, lng: 43.15, region: "AF" },
  { name: "Egypt", lat: 26.82, lng: 30.80, region: "AF" },
  { name: "Equatorial Guinea", lat: 1.65, lng: 10.27, region: "AF" },
  { name: "Eritrea", lat: 15.18, lng: 39.78, region: "AF" },
  { name: "Eswatini", lat: -26.52, lng: 31.47, region: "AF" },
  { name: "Ethiopia", lat: 9.15, lng: 40.49, region: "AF" },
  { name: "Gabon", lat: -0.80, lng: 11.61, region: "AF" },
  { name: "Gambia", lat: 13.44, lng: -15.31, region: "AF" },
  { name: "Ghana", lat: 7.95, lng: -1.02, region: "AF" },
  { name: "Guinea", lat: 9.95, lng: -9.70, region: "AF" },
  { name: "Guinea-Bissau", lat: 11.80, lng: -15.18, region: "AF" },
  { name: "Kenya", lat: -0.02, lng: 37.91, region: "AF" },
  { name: "Lesotho", lat: -29.61, lng: 28.23, region: "AF" },
  { name: "Liberia", lat: 6.43, lng: -9.43, region: "AF" },
  { name: "Libya", lat: 26.34, lng: 17.23, region: "AF" },
  { name: "Madagascar", lat: -18.77, lng: 46.87, region: "AF" },
  { name: "Malawi", lat: -13.25, lng: 34.30, region: "AF" },
  { name: "Mali", lat: 17.57, lng: -3.99, region: "AF" },
  { name: "Mauritania", lat: 21.01, lng: -10.94, region: "AF" },
  { name: "Mauritius", lat: -20.35, lng: 57.55, region: "AF" },
  { name: "Morocco", lat: 31.79, lng: -7.09, region: "AF" },
  { name: "Mozambique", lat: -18.67, lng: 35.53, region: "AF" },
  { name: "Namibia", lat: -22.96, lng: 18.49, region: "AF" },
  { name: "Niger", lat: 17.61, lng: 8.08, region: "AF" },
  { name: "Nigeria", lat: 9.08, lng: 8.68, region: "AF" },
  { name: "Rwanda", lat: -1.94, lng: 29.87, region: "AF" },
  { name: "Sao Tome and Principe", lat: 0.19, lng: 6.61, region: "AF" },
  { name: "Senegal", lat: 14.50, lng: -14.45, region: "AF" },
  { name: "Seychelles", lat: -4.68, lng: 55.49, region: "AF" },
  { name: "Sierra Leone", lat: 8.46, lng: -11.78, region: "AF" },
  { name: "Somalia", lat: 5.15, lng: 46.20, region: "AF" },
  { name: "South Africa", lat: -30.56, lng: 22.94, region: "AF" },
  { name: "South Sudan", lat: 6.88, lng: 31.31, region: "AF" },
  { name: "Sudan", lat: 12.86, lng: 30.22, region: "AF" },
  { name: "Tanzania", lat: -6.37, lng: 34.89, region: "AF" },
  { name: "Togo", lat: 8.62, lng: 0.82, region: "AF" },
  { name: "Tunisia", lat: 33.89, lng: 9.54, region: "AF" },
  { name: "Uganda", lat: 1.37, lng: 32.29, region: "AF" },
  { name: "Zambia", lat: -13.13, lng: 27.85, region: "AF" },
  { name: "Zimbabwe", lat: -19.02, lng: 29.15, region: "AF" },

  // ASIA
  { name: "Afghanistan", lat: 33.94, lng: 67.71, region: "AS" },
  { name: "Bahrain", lat: 26.07, lng: 50.56, region: "AS" },
  { name: "Bangladesh", lat: 23.68, lng: 90.36, region: "AS" },
  { name: "Bhutan", lat: 27.51, lng: 90.43, region: "AS" },
  { name: "Brunei", lat: 4.54, lng: 114.73, region: "AS" },
  { name: "Cambodia", lat: 12.57, lng: 104.99, region: "AS" },
  { name: "China", lat: 35.86, lng: 104.20, region: "AS" },
  { name: "India", lat: 20.59, lng: 78.96, region: "AS" },
  { name: "Indonesia", lat: -0.79, lng: 113.92, region: "AS" },
  { name: "Iran", lat: 32.43, lng: 53.69, region: "AS" },
  { name: "Iraq", lat: 33.22, lng: 43.68, region: "AS" },
  { name: "Israel", lat: 31.05, lng: 34.85, region: "AS" },
  { name: "Japan", lat: 36.20, lng: 138.25, region: "AS" },
  { name: "Jordan", lat: 30.59, lng: 36.24, region: "AS" },
  { name: "Kazakhstan", lat: 48.02, lng: 66.92, region: "AS" },
  { name: "Kuwait", lat: 29.31, lng: 47.48, region: "AS" },
  { name: "Kyrgyzstan", lat: 41.20, lng: 74.77, region: "AS" },
  { name: "Laos", lat: 19.86, lng: 102.50, region: "AS" },
  { name: "Lebanon", lat: 33.85, lng: 35.86, region: "AS" },
  { name: "Malaysia", lat: 4.21, lng: 101.98, region: "AS" },
  { name: "Maldives", lat: 3.20, lng: 73.22, region: "AS" },
  { name: "Mongolia", lat: 46.86, lng: 103.85, region: "AS" },
  { name: "Myanmar", lat: 21.91, lng: 95.96, region: "AS" },
  { name: "Nepal", lat: 28.39, lng: 84.12, region: "AS" },
  { name: "North Korea", lat: 40.34, lng: 127.51, region: "AS" },
  { name: "Oman", lat: 21.47, lng: 55.98, region: "AS" },
  { name: "Pakistan", lat: 30.38, lng: 69.35, region: "AS" },
  { name: "Palestine", lat: 31.95, lng: 35.23, region: "AS" },
  { name: "Philippines", lat: 12.88, lng: 121.77, region: "AS" },
  { name: "Qatar", lat: 25.35, lng: 51.18, region: "AS" },
  { name: "Saudi Arabia", lat: 23.89, lng: 45.08, region: "AS" },
  { name: "Singapore", lat: 1.35, lng: 103.82, region: "AS" },
  { name: "South Korea", lat: 35.91, lng: 127.77, region: "AS" },
  { name: "Sri Lanka", lat: 7.87, lng: 80.77, region: "AS" },
  { name: "Syria", lat: 34.80, lng: 39.00, region: "AS" },
  { name: "Taiwan", lat: 23.70, lng: 121.00, region: "AS" },
  { name: "Tajikistan", lat: 38.86, lng: 71.28, region: "AS" },
  { name: "Thailand", lat: 15.87, lng: 100.99, region: "AS" },
  { name: "Timor-Leste", lat: -8.87, lng: 125.73, region: "AS" },
  { name: "Turkmenistan", lat: 38.97, lng: 59.56, region: "AS" },
  { name: "UAE", lat: 23.42, lng: 53.85, region: "AS" },
  { name: "Uzbekistan", lat: 41.38, lng: 64.59, region: "AS" },
  { name: "Vietnam", lat: 14.06, lng: 108.28, region: "AS" },
  { name: "Yemen", lat: 15.55, lng: 48.52, region: "AS" },

  // EUROPE
  { name: "Albania", lat: 41.15, lng: 20.17, region: "EU" },
  { name: "Andorra", lat: 42.55, lng: 1.60, region: "EU" },
  { name: "Austria", lat: 47.52, lng: 14.55, region: "EU" },
  { name: "Belarus", lat: 53.71, lng: 27.95, region: "EU" },
  { name: "Belgium", lat: 50.50, lng: 4.47, region: "EU" },
  { name: "Bosnia and Herzegovina", lat: 43.92, lng: 17.68, region: "EU" },
  { name: "Bulgaria", lat: 42.73, lng: 25.49, region: "EU" },
  { name: "Croatia", lat: 45.10, lng: 15.20, region: "EU" },
  { name: "Cyprus", lat: 35.13, lng: 33.43, region: "EU" },
  { name: "Czech Republic", lat: 49.82, lng: 15.47, region: "EU" },
  { name: "Denmark", lat: 56.26, lng: 9.50, region: "EU" },
  { name: "Estonia", lat: 58.60, lng: 25.01, region: "EU" },
  { name: "Finland", lat: 61.92, lng: 25.75, region: "EU" },
  { name: "France", lat: 46.23, lng: 2.21, region: "EU" },
  { name: "Germany", lat: 51.17, lng: 10.45, region: "EU" },
  { name: "Greece", lat: 39.07, lng: 21.82, region: "EU" },
  { name: "Hungary", lat: 47.16, lng: 19.50, region: "EU" },
  { name: "Iceland", lat: 64.96, lng: -19.02, region: "EU" },
  { name: "Ireland", lat: 53.14, lng: -7.69, region: "EU" },
  { name: "Italy", lat: 41.87, lng: 12.57, region: "EU" },
  { name: "Latvia", lat: 56.88, lng: 24.60, region: "EU" },
  { name: "Liechtenstein", lat: 47.17, lng: 9.56, region: "EU" },
  { name: "Lithuania", lat: 55.17, lng: 23.88, region: "EU" },
  { name: "Luxembourg", lat: 49.82, lng: 6.13, region: "EU" },
  { name: "Malta", lat: 35.94, lng: 14.38, region: "EU" },
  { name: "Moldova", lat: 47.41, lng: 28.37, region: "EU" },
  { name: "Monaco", lat: 43.75, lng: 7.41, region: "EU" },
  { name: "Montenegro", lat: 42.71, lng: 19.37, region: "EU" },
  { name: "Netherlands", lat: 52.13, lng: 5.29, region: "EU" },
  { name: "North Macedonia", lat: 41.51, lng: 21.75, region: "EU" },
  { name: "Norway", lat: 60.47, lng: 8.47, region: "EU" },
  { name: "Poland", lat: 51.92, lng: 19.15, region: "EU" },
  { name: "Portugal", lat: 39.40, lng: -8.22, region: "EU" },
  { name: "Romania", lat: 45.94, lng: 24.97, region: "EU" },
  { name: "Russia", lat: 61.52, lng: 105.32, region: "EU" },
  { name: "San Marino", lat: 43.94, lng: 12.46, region: "EU" },
  { name: "Serbia", lat: 44.02, lng: 21.01, region: "EU" },
  { name: "Slovakia", lat: 48.67, lng: 19.70, region: "EU" },
  { name: "Slovenia", lat: 46.15, lng: 14.99, region: "EU" },
  { name: "Spain", lat: 40.46, lng: -3.75, region: "EU" },
  { name: "Sweden", lat: 60.13, lng: 18.64, region: "EU" },
  { name: "Switzerland", lat: 46.82, lng: 8.23, region: "EU" },
  { name: "Turkey", lat: 38.96, lng: 35.24, region: "EU" },
  { name: "Ukraine", lat: 48.38, lng: 31.17, region: "EU" },
  { name: "United Kingdom", lat: 55.38, lng: -3.44, region: "EU" },

  // NORTH AMERICA
  { name: "Antigua and Barbuda", lat: 17.06, lng: -61.80, region: "NA" },
  { name: "Bahamas", lat: 25.03, lng: -77.40, region: "NA" },
  { name: "Barbados", lat: 13.19, lng: -59.54, region: "NA" },
  { name: "Belize", lat: 17.19, lng: -88.50, region: "NA" },
  { name: "Canada", lat: 56.13, lng: -106.35, region: "NA" },
  { name: "Costa Rica", lat: 9.75, lng: -83.75, region: "NA" },
  { name: "Cuba", lat: 21.52, lng: -77.78, region: "NA" },
  { name: "Dominica", lat: 15.41, lng: -61.37, region: "NA" },
  { name: "Dominican Republic", lat: 18.74, lng: -70.16, region: "NA" },
  { name: "El Salvador", lat: 13.79, lng: -88.90, region: "NA" },
  { name: "Grenada", lat: 12.26, lng: -61.60, region: "NA" },
  { name: "Guatemala", lat: 15.78, lng: -90.23, region: "NA" },
  { name: "Haiti", lat: 18.97, lng: -72.29, region: "NA" },
  { name: "Honduras", lat: 15.20, lng: -86.24, region: "NA" },
  { name: "Jamaica", lat: 18.11, lng: -77.30, region: "NA" },
  { name: "Mexico", lat: 23.63, lng: -102.55, region: "NA" },
  { name: "Nicaragua", lat: 12.87, lng: -85.21, region: "NA" },
  { name: "Panama", lat: 8.54, lng: -80.78, region: "NA" },
  { name: "Saint Kitts and Nevis", lat: 17.36, lng: -62.78, region: "NA" },
  { name: "Saint Lucia", lat: 13.91, lng: -60.98, region: "NA" },
  { name: "Saint Vincent", lat: 12.98, lng: -61.29, region: "NA" },
  { name: "Trinidad and Tobago", lat: 10.69, lng: -61.22, region: "NA" },
  { name: "United States", lat: 37.09, lng: -95.71, region: "NA" },

  // SOUTH AMERICA
  { name: "Argentina", lat: -38.42, lng: -63.62, region: "SA" },
  { name: "Bolivia", lat: -16.29, lng: -63.59, region: "SA" },
  { name: "Brazil", lat: -14.24, lng: -51.93, region: "SA" },
  { name: "Chile", lat: -35.68, lng: -71.54, region: "SA" },
  { name: "Colombia", lat: 4.57, lng: -74.30, region: "SA" },
  { name: "Ecuador", lat: -1.83, lng: -78.18, region: "SA" },
  { name: "Guyana", lat: 4.86, lng: -58.93, region: "SA" },
  { name: "Paraguay", lat: -23.44, lng: -58.44, region: "SA" },
  { name: "Peru", lat: -9.19, lng: -75.02, region: "SA" },
  { name: "Suriname", lat: 3.92, lng: -56.03, region: "SA" },
  { name: "Uruguay", lat: -32.52, lng: -55.77, region: "SA" },
  { name: "Venezuela", lat: 6.42, lng: -66.59, region: "SA" },

  // OCEANIA
  { name: "Australia", lat: -25.27, lng: 133.78, region: "OC" },
  { name: "Fiji", lat: -17.71, lng: 178.07, region: "OC" },
  { name: "Kiribati", lat: -3.37, lng: -168.73, region: "OC" },
  { name: "Marshall Islands", lat: 7.13, lng: 171.18, region: "OC" },
  { name: "Micronesia", lat: 7.43, lng: 150.55, region: "OC" },
  { name: "Nauru", lat: -0.52, lng: 166.93, region: "OC" },
  { name: "New Zealand", lat: -40.90, lng: 174.89, region: "OC" },
  { name: "Palau", lat: 7.51, lng: 134.58, region: "OC" },
  { name: "Papua New Guinea", lat: -6.31, lng: 143.96, region: "OC" },
  { name: "Samoa", lat: -13.76, lng: -172.10, region: "OC" },
  { name: "Solomon Islands", lat: -9.65, lng: 160.16, region: "OC" },
  { name: "Tonga", lat: -21.18, lng: -175.20, region: "OC" },
  { name: "Tuvalu", lat: -7.11, lng: 177.65, region: "OC" },
  { name: "Vanuatu", lat: -15.38, lng: 166.96, region: "OC" },
];

// Haversine distance in km between two lat/lng points
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Generate connections: each country connects to its nearest N neighbors within the same region
// plus a few strategic cross-region links via hub countries
export function generateConnections() {
  const connections = [];
  const regionGroups = {};

  countries.forEach((c, i) => {
    if (!regionGroups[c.region]) regionGroups[c.region] = [];
    regionGroups[c.region].push({ ...c, index: i });
  });

  // Intra-region: connect each country to its 2 nearest neighbors
  Object.values(regionGroups).forEach((group) => {
    group.forEach((country) => {
      const distances = group
        .filter((other) => other.index !== country.index)
        .map((other) => ({
          from: country,
          to: other,
          dist: haversine(country.lat, country.lng, other.lat, other.lng),
        }))
        .sort((a, b) => a.dist - b.dist);

      distances.slice(0, 2).forEach((d) => {
        const key = [Math.min(d.from.index, d.to.index), Math.max(d.from.index, d.to.index)].join('-');
        if (!connections.find((c) => c.key === key)) {
          connections.push({
            key,
            from: [d.from.lat, d.from.lng],
            to: [d.to.lat, d.to.lng],
            type: 'regional',
          });
        }
      });
    });
  });

  // Cross-region strategic hub links
  const hubs = {
    NA: countries.find((c) => c.name === 'United States'),
    SA: countries.find((c) => c.name === 'Brazil'),
    EU: countries.find((c) => c.name === 'United Kingdom'),
    AF: countries.find((c) => c.name === 'Egypt'),
    AS: countries.find((c) => c.name === 'India'),
    OC: countries.find((c) => c.name === 'Australia'),
  };

  const hubLinks = [
    ['NA', 'EU'], ['NA', 'SA'], ['EU', 'AF'], ['EU', 'AS'],
    ['AS', 'OC'], ['AS', 'AF'], ['NA', 'AS'], ['SA', 'AF'],
    ['EU', 'NA'], ['OC', 'NA'],
  ];

  hubLinks.forEach(([r1, r2]) => {
    const h1 = hubs[r1];
    const h2 = hubs[r2];
    if (h1 && h2) {
      connections.push({
        key: `hub-${r1}-${r2}`,
        from: [h1.lat, h1.lng],
        to: [h2.lat, h2.lng],
        type: 'strategic',
      });
    }
  });

  return connections;
}

export default countries;
