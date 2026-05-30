// Configuration for API and Calibration
import { Platform } from 'react-native';

// NOTE: Use your local IP address here when testing on a physical device with Expo Go, e.g., 'http://192.168.1.100:3000'
// const BASE_URL = 'http://192.168.1.100:3000';
const BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

export const API_URLS = {
  submitReading: `${BASE_URL}/api/readings`,
  getHeatmap: `${BASE_URL}/api/readings/heatmap`,
  getReport: `${BASE_URL}/api/readings/report`,
};

// Calibration offset as per documentation: SPL ≈ dBFS + CalibrationOffset
export const CALIBRATION_OFFSET = 95;
