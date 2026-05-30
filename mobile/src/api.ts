import { API_URLS } from './config';

export const submitNoiseReading = async (latitude: number, longitude: number, decibel: number) => {
  const response = await fetch(API_URLS.submitReading, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({ latitude, longitude, decibel }),
  });
  
  const data = await response.json();
  if (!response.ok) {
      throw new Error(data.error || 'Failed to submit reading');
  }
  return data;
};

export const fetchHeatmapData = async (lat: number, lng: number, radius: number, timeFilter: string) => {
  const url = `${API_URLS.getHeatmap}?lat=${lat}&lng=${lng}&radius=${radius}&time_filter=${timeFilter}`;
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch heatmap data');
  }
  return data; // Array of { latitude, longitude, weight }
};

export const fetchAreaReport = async (minLng: number, minLat: number, maxLng: number, maxLat: number) => {
  const url = `${API_URLS.getReport}?minLng=${minLng}&minLat=${minLat}&maxLng=${maxLng}&maxLat=${maxLat}`;
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) {
     throw new Error(data.error || 'Failed to fetch report');
  }
  return data; // { avg, max, count }
};
