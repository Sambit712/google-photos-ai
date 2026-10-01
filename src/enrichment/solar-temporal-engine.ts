import { TimeOfDayBucket } from '../types/media.js';

/**
 * Astronomical Solar Calculator
 * Computes approximate solar elevation based on latitude, longitude, and date/time.
 */
export function calculateSolarElevation(latitude: number, longitude: number, date: Date): number {
  const dayOfYear = getDayOfYear(date);
  const timeInHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;

  // Fractional year in radians
  const gamma = ((2 * Math.PI) / 365) * (dayOfYear - 1 + (timeInHours - 12) / 24);

  // Equation of time in minutes
  const eqtime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));

  // Solar declination angle in radians
  const decl =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);

  // True solar time in minutes
  const timeOffset = eqtime + 4 * longitude;
  let tst = timeInHours * 60 + timeOffset;
  while (tst < 0) tst += 1440;
  while (tst >= 1440) tst -= 1440;

  // Solar hour angle in degrees
  let ha = tst / 4 - 180;
  if (ha < -180) ha += 360;
  const haRad = (ha * Math.PI) / 180;

  const latRad = (latitude * Math.PI) / 180;

  // Solar zenith angle
  const cosZenith =
    Math.sin(latRad) * Math.sin(decl) +
    Math.cos(latRad) * Math.cos(decl) * Math.cos(haRad);
  
  const zenithRad = Math.acos(Math.max(-1, Math.min(1, cosZenith)));
  const elevationDeg = 90 - (zenithRad * 180) / Math.PI;

  return elevationDeg;
}

function getDayOfYear(date: Date): number {
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 0));
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

/**
 * Classifies an astronomical timestamp and GPS location into human experiential buckets:
 * dawn, morning, afternoon, golden_hour, evening, night
 */
export function determineTimeOfDayBucket(
  latitude: number,
  longitude: number,
  isoTimestamp: string
): TimeOfDayBucket {
  const date = new Date(isoTimestamp);
  const elevation = calculateSolarElevation(latitude, longitude, date);

  // Approximate local solar time in hours
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60;
  let localSolarHour = (utcHours + longitude / 15) % 24;
  if (localSolarHour < 0) localSolarHour += 24;

  const isBeforeSolarNoon = localSolarHour < 12.5;

  // 1. Sun is above horizon
  if (elevation > 0) {
    if (isBeforeSolarNoon) {
      if (elevation < 12) return 'dawn';
      return 'morning';
    } else {
      // Afternoon or Golden Hour before sunset
      if (elevation <= 12 && localSolarHour >= 16.5) return 'golden_hour';
      return 'afternoon';
    }
  }

  // 2. Sun is below horizon
  // Evening: civil twilight or post-sunset social dinner hours (local solar hour ~17:30 to 22:00)
  if (localSolarHour >= 17.5 && localSolarHour <= 22.0) {
    return 'evening';
  }

  // Late night / dawn transition
  if (localSolarHour >= 4.5 && localSolarHour < 6.5) {
    return 'dawn';
  }

  return 'night';
}
