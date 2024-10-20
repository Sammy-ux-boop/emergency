const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

require('dotenv').config(); // Load environment variables from .env file

// Supabase client setup
const SUPABASE_URL = process.env.SUPABASE_URL; // Get URL from environment variable
const SUPABASE_KEY = process.env.SUPABASE_KEY; // Get Key from environment variable
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Middleware to set the correct MIME type for JavaScript files
app.get('/leaflet-routing-machine-3.2.12/leaflet-routing-machine.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(path.join(__dirname, 'public', 'leaflet-routing-machine-3.2.12', 'dist', 'leaflet-routing-machine.js'));
});


app.use(cors());
app.use(express.static('public')); // Serve static files from the "public" folder

// Serve the index.html file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html')); // Adjust the path accordingly
});

// API endpoint to fetch hospitals
app.get('/api/hospitals', async (req, res) => {
  const { data, error } = await supabase
    .from('hospitals')
    .select('id, name, geom');

  if (error) {
    console.error('Database query error:', error);
    return res.status(500).json({ error: 'Error fetching hospitals data' });
  }

  // Transform to GeoJSON
  const geoJson = {
    type: "FeatureCollection",
    features: data.map(hospital => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [hospital.geom.coordinates[0], hospital.geom.coordinates[1]]
      },
      properties: {
        id: hospital.id,
        name: hospital.name
      }
    }))
  };

  res.json(geoJson);
});

// API to find nearest hospital using the Supabase function
app.get('/api/nearest-hospital', async (req, res) => {
  const { start_lat, start_lng } = req.query;

  // Validate incoming parameters
  if (!start_lat || !start_lng || isNaN(start_lat) || isNaN(start_lng) ||
      start_lat < -90 || start_lat > 90 || start_lng < -180 || start_lng > 180) {
    return res.status(400).json({ error: 'Invalid start coordinates' });
  }

  // Call the nearest_hospital function in Supabase
  const { data, error } = await supabase
    .rpc('nearest_hospital', { start_lat: parseFloat(start_lat), start_lng: parseFloat(start_lng) });

  if (error) {
    console.error('Error finding nearest hospital:', error);
    return res.status(500).json({ error: 'Error finding nearest hospital' });
  }

  if (!data || data.length === 0) {
    return res.status(404).json({ error: 'No hospitals found' });
  }

  const hospital = data[0];

  // Send the nearest hospital coordinates to the client
  res.json({
    id: hospital.id,
    name: hospital.name,
    latitude: hospital.latitude,
    longitude: hospital.longitude
  });
});

// Fetch fire tips from Supabase
app.get('/api/fire-tips', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('fire_tips')
      .select('tip');

    if (error) {
      console.error('Error fetching fire tips:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching fire tips:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Fetch accident tips from Supabase
app.get('/api/accident-tips', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('accident_tips')
      .select('tip');

    if (error) {
      console.error('Error fetching accident tips:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching accident tips:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Fetch flood tips from Supabase
app.get('/api/flood-tips', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('flood_tips')
      .select('tip');

    if (error) {
      console.error('Error fetching flood tips:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching flood tips:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Fetch collapse tips from Supabase
app.get('/api/collapse-tips', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('collapse_tips')
      .select('tip');

    if (error) {
      console.error('Error fetching collapse tips:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching collapse tips:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Fetch emergency contact information
app.get('/api/emergency-contacts', async (req, res) => {
  const { data, error } = await supabase
    .from('emergency_contacts')
    .select('emergency_type, contact_number, description');

  if (error) {
    console.error('Error fetching emergency contacts:', error);
    return res.status(500).json({ error: 'Error fetching emergency contacts' });
  }

  res.json(data);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
