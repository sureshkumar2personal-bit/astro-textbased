# Vedic chart calculation (src/utils/vedicChart.js)

Inputs: birth date (YYYY-MM-DD), birth time (HH:MM, local wall clock), birthplace.

1. **Location** – profile latitude/longitude/timezone when supplied (valid only for the profile's own birthplace);
   otherwise the offline city list in `src/data/birthPlaces.js`. Unknown place => no chart, clear message.
2. **Time zone** – local wall time -> UTC through the place's IANA zone via `Intl` (historical offsets included).
3. **Positions** – `astronomy-engine` geocentric apparent vectors, converted to the true ecliptic of date.
   Rahu = mean lunar node (125.0445479 - 1934.1362891 T + 0.0020754 T^2); Ketu = Rahu + 180.
4. **Ayanamsa** – Lahiri, Swiss-Ephemeris definition: 22.460148 deg at 1900.0 + general precession
   (5028.796195" T + 1.1054348" T^2). Sidereal longitude = tropical - ayanamsa.
5. **Lagna** – ascendant from apparent sidereal time, local longitude, mean obliquity and latitude:
   `atan2(cos RAMC, -(sin RAMC cos e + tan phi sin e))`, then minus ayanamsa. Houses are whole-sign.
6. **Nakshatra / Pada** – Moon longitude / 13 deg 20'; pada = quarter of that span.
7. **Panchang** – Thithi = floor((Moon - Sun)/12 deg); Yogam = floor((Sun + Moon)/13 deg 20');
   Karanam = half-thithi (6 deg) index (Kimstughna, 7 repeating movable, Shakuni/Chatushpada/Naga).
8. **Navamsa (D9)** – sign = floor(sidereal longitude / 3 deg 20') mod 12.
9. **Doshas** – Mangal (Mars in houses 1,2,4,7,8,12 from Lagna; reduced in own/exalted sign),
   Kaal Sarp (all seven planets on one side of the Rahu-Ketu axis), Guru Chandal (Jupiter with Rahu),
   Sade Sati / Shani Dhaiya (transit Saturn, today's date, vs natal Moon sign).

Known limits: mean (not true) node; whole-sign houses only; no divisional charts beyond D1/D9;
no dasha; Mangal checked from Lagna only; places outside the city list need profile coordinates.
