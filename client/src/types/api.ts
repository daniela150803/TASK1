export interface WindStats {
  maxSpeed: number;
  avgSpeed: number;
  jetAltitude: number;
  jetDirection: string;
  tempRange: number;
  avgTemp: number;
  maxTemp: number;
  maxOmega: number;
  minOmega: number;
  omegaCount: number;
}

export interface WindVector {
  lat: number;
  lon: number;
  u: number;
  v: number;
  speed: number;
}

export interface HeatmapPoint {
  lat: number;
  lon: number;
  speed: number;
}

export interface ParticlePoint {
  lat: number;
  lon: number;
  u: number;
  v: number;
}

export interface LevelData {
  level: number;
  altitudeKm: number;
  avgSpeed: number;
  avgOmega: number;
  avgTemp: number;
  avgW: number;
}

export interface ProfilePoint {
  level: number;
  altitudeKm: number;
  speed: number;
  temperature: number;
  omega: number;
}

export interface HistogramBin {
  bin: number;
  count: number;
}

export interface BarEntry {
  month: number;
  speed: number;
}
