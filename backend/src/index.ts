import express from 'express';
import cors from 'cors';
import { createReading, getHeatmap, getReport } from './models/Reading';
import { rateLimiter } from './middleware/rateLimiter';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Create reading
app.post('/api/readings', rateLimiter, async (req, res) => {
  try {
    const { latitude, longitude, decibel } = req.body;
    
    // API validation
    if (latitude === undefined || longitude === undefined || decibel === undefined) {
      return res.status(400).json({ error: 'latitude, longitude, and decibel are required fields' });
    }
    
    if (typeof latitude !== 'number' || typeof longitude !== 'number' || typeof decibel !== 'number') {
      return res.status(400).json({ error: 'latitude, longitude, and decibel must be numbers' });
    }

    const id = await createReading(latitude, longitude, decibel);
    res.status(201).json({ status: 'success', id });
  } catch (error) {
    console.error('Error in POST /api/readings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get heatmap data
app.get('/api/readings/heatmap', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const radius = parseFloat(req.query.radius as string) || 5000; // default 5km
    const time_filter = (req.query.time_filter as string) || 'all';

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'Valid lat and lng query parameters are required' });
    }

    const data = await getHeatmap(lat, lng, radius, time_filter);
    res.json(data);
  } catch (error) {
    console.error('Error in GET /api/readings/heatmap:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get report
app.get('/api/readings/report', async (req, res) => {
  try {
    const minLng = parseFloat(req.query.minLng as string);
    const minLat = parseFloat(req.query.minLat as string);
    const maxLng = parseFloat(req.query.maxLng as string);
    const maxLat = parseFloat(req.query.maxLat as string);

    if (isNaN(minLng) || isNaN(minLat) || isNaN(maxLng) || isNaN(maxLat)) {
      return res.status(400).json({ error: 'minLng, minLat, maxLng, maxLat query parameters are required' });
    }

    const report = await getReport(minLng, minLat, maxLng, maxLat);
    res.json({
      avg: report.avg ? parseFloat(report.avg).toFixed(1) : null,
      max: report.max ? parseFloat(report.max).toFixed(1) : null,
      count: parseInt(report.count, 10)
    });
  } catch (error) {
    console.error('Error in GET /api/readings/report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
