const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs'); // To read the JSON file
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

require('dotenv').config(); // Load environment variables from .env file

// Supabase client setup
const SUPABASE_URL = process.env.SUPABASE_URL; // Get URL from environment variable
const SUPABASE_KEY = process.env.SUPABASE_KEY; // Get Key from environment variable
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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

// API endpoint to fetch disaster news from JSON file
app.get('/api/disaster-news', async (req, res) => {
    const jsonFilePath = path.join(__dirname, 'public', 'news.json'); // Adjust the path as needed

    fs.readFile(jsonFilePath, 'utf8', async (err, data) => {
        if (err) {
            console.error("Error reading JSON file:", err);
            return res.status(500).json({ error: 'Could not read the file.' });
        }

        try {
            const newsItems = JSON.parse(data);

            // Get current time
            const currentTime = new Date();

            // Filter news items for breaking news (reported within the last hour)
            const breakingNews = newsItems.filter(item => {
                const reportedTime = new Date(item.date); // Changed from reported_time to date
                const timeDifference = (currentTime - reportedTime) / (1000 * 60); // Difference in minutes
                return timeDifference <= 60; // News within the last hour
            });

            // Filter news older than 24 hours to be deleted
            const newsToKeep = newsItems.filter(item => {
                const reportedTime = new Date(item.date); // Changed from reported_time to date
                const timeDifference = (currentTime - reportedTime) / (1000 * 60 * 60); // Difference in hours
                return timeDifference <= 24; // News within 24 hours
            });

            // Write the filtered news back to the JSON file
            fs.writeFile(jsonFilePath, JSON.stringify(newsToKeep, null, 2), (writeErr) => {
                if (writeErr) {
                    console.error("Error writing JSON file:", writeErr);
                    return res.status(500).json({ error: 'Could not update the file.' });
                }
            });

            // Insert breaking news into the Supabase database
            if (breakingNews.length > 0) {
                const { data: supabaseData, error: supabaseError } = await supabase
                    .from('news')
                    .insert(breakingNews.map(item => ({
                        title: item.title,
                        content: item.description,
                        reported_at: item.date // Assuming 'reported_at' is the column for date in Supabase
                    })));

                if (supabaseError) {
                    console.error("Error inserting news into Supabase:", supabaseError);
                }
            }

            res.json({
                breaking_news: breakingNews,
                all_news: newsToKeep
            });
        } catch (parseError) {
            console.error("Error parsing JSON:", parseError);
            return res.status(500).json({ error: 'Could not parse the JSON data.' });
        }
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
