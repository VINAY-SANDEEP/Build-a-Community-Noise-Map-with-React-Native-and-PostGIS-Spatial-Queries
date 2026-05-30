// Clean architecture: Repository pattern for database access
import { pool } from "./db";

export interface Reading {
  id: number;
  decibel_level: number;
  created_at: Date;
}

export const createReading = async (
  lat: number,
  lng: number,
  decibel: number,
): Promise<number> => {
  const query = `
    INSERT INTO readings(decibel_level, location) 
    VALUES ($1, ST_SetSRID(ST_MakePoint($2,$3),4326)) 
    RETURNING id
  `;
  const values = [decibel, lng, lat]; // ST_MakePoint takes (lon, lat)
  const result = await pool.query(query, values);
  return result.rows[0].id;
};

export const getHeatmap = async (
  lat: number,
  lng: number,
  radius: number,
  time_filter: string,
) => {
  let timeClause = "";
  if (time_filter === "hour") {
    timeClause = "AND created_at >= NOW() - INTERVAL '1 hour'";
  } else if (time_filter === "day") {
    timeClause = "AND created_at >= NOW() - INTERVAL '1 day'";
  } // 'all' requires no clause

  const query = `
    SELECT 
      ST_Y(location::geometry) as latitude, 
      ST_X(location::geometry) as longitude, 
      decibel_level as weight
    FROM readings
    WHERE ST_DWithin(location::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
    ${timeClause}
  `;
  // Parameter 1: lng, Parameter 2: lat (for ST_MakePoint)
  const values = [lng, lat, radius];
  const result = await pool.query(query, values);
  return result.rows;
};

export const getReport = async (
  minLng: number,
  minLat: number,
  maxLng: number,
  maxLat: number,
) => {
  const query = `
    SELECT 
      AVG(decibel_level) as avg,
      MAX(decibel_level) as max,
      COUNT(*) as count
    FROM readings
    WHERE location && ST_MakeEnvelope($1, $2, $3, $4, 4326)
  `;
  const values = [minLng, minLat, maxLng, maxLat];
  const result = await pool.query(query, values);
  return result.rows[0]; // will return { avg: null, max: null, count: '0' } if no data
};
