export interface WindStats {
  maxSpeed: number;
  minSpeed: number;
  avgSpeed: number;
  maxTemp: number;
  minTemp: number;
  avgTemp: number;
  maxW: number;
  minW: number;
  totalPoints: number;
  activeFaces: number;
  dominantDirection: string;
  jetStreamAlt: number;
  dataSource: string;
}

export interface WindPoint {
  lat: number;
  lon: number;
  u: number;
  v: number;
  speed: number;
  level: number;
}

export interface LevelData {
  level: number;
  altitudeKm: number;
  avgU: number;
  avgV: number;
  avgSpeed: number;
  avgTemp: number;
  avgW: number;
  maxSpeed: number;
}

export interface ProfilePoint {
  level: number;
  altitudeKm: number;
  speed: number;
  u: number;
  v: number;
  temperature: number;
  w: number;
  pressure: number;
}

export interface HistogramBin {
  binStart: number;
  binEnd: number;
  binLabel: string;
  count: number;
  frequency: number;
}

export interface BarEntry {
  label: string;
  level: number;
  altitudeKm: number;
  avgSpeed: number;
  avgU: number;
  avgV: number;
  region: string;
}

export interface ParticleField {
  width: number;
  height: number;
  uField: number[];
  vField: number[];
  uMin: number;
  uMax: number;
  vMin: number;
  vMax: number;
  dataSource: string;
}

export interface DashboardControls {
  face: number;
  level: number;
  year: number;
}
