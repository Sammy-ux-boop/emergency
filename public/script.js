// Initialize the map and set the default view to a specific location
const map = L.map('map').setView([-1.2985, 36.8219], 12); // Default location (Nairobi)

// Add a base layer to the map (OpenStreetMap)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
}).addTo(map);

// Define a custom icon for hospitals
const hospitalIcon = L.icon({
    iconUrl: 'images/hospitals.png', // Ensure this path is correct
    iconSize: [30, 30], // Icon dimensions
    iconAnchor: [15, 30], // Point of the icon that is anchored to the map
    popupAnchor: [0, -30] // Popup position relative to the icon
});

let routeControl = null; // Will store the routing control for navigation

// Function to fetch and display hospitals on the map
async function getHospitals() {
    try {
        const response = await fetch('/api/hospitals');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();

        // Add each hospital as a marker on the map with a popup
        data.features.forEach(feature => {
            const { coordinates } = feature.geometry;
            L.marker(coordinates.reverse(), { icon: hospitalIcon })
                .bindPopup(`<strong>${feature.properties.name}</strong>`)
                .addTo(map);
        });
    } catch (error) {
        console.error('Error fetching hospitals:', error);
    }
}

// Function to draw route from a starting point to the nearest hospital
async function drawRoute(startLat, startLng) {
    try {
        const response = await fetch(`/api/nearest-hospital?start_lat=${startLat}&start_lng=${startLng}`);
        if (!response.ok) throw new Error('Network response was not ok');
        const nearestHospital = await response.json();

        if (!nearestHospital || !nearestHospital.latitude || !nearestHospital.longitude) {
            alert('No hospitals found.');
            return;
        }

        // Remove any existing route before adding a new one
        if (routeControl) {
            map.removeControl(routeControl);
        }

        // Create and display the route from start point to the nearest hospital
        routeControl = L.Routing.control({
            waypoints: [
                L.latLng(startLat, startLng),
                L.latLng(nearestHospital.latitude, nearestHospital.longitude)
            ],
            router: L.Routing.osrmv1({
                serviceUrl: 'https://router.project-osrm.org/route/v1'
            }),
            showAlternatives: false,
            lineOptions: {
                styles: [{ color: 'blue', weight: 4 }]
            }
        }).addTo(map);
    } catch (error) {
        console.error('Error drawing route:', error);
    }
}

// Form submission handler to trigger routing
async function submitRouteRequest() {
    const startLat = parseFloat(document.getElementById('start_lat').value);
    const startLng = parseFloat(document.getElementById('start_lng').value);

    if (isNaN(startLat) || isNaN(startLng)) {
        alert('Please enter valid latitude and longitude.');
        return;
    }

    await drawRoute(startLat, startLng);
}

// Fetch and display first aid tips for different emergency types
async function getFirstAidTips(emergencyType) {
    const urlMap = {
        'Fire': '/api/fire-tips',
        'Accident': '/api/accident-tips',
        'Flood': '/api/flood-tips',
        'Building Collapse': '/api/collapse-tips'
    };

    const url = urlMap[emergencyType];
    if (!url) return;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        const tips = await response.json();

        const tipsContainer = document.getElementById('first-aid-tips');
        tipsContainer.innerHTML = ''; // Clear any previous tips

        tips.forEach(tip => {
            const tipElement = document.createElement('p');
            tipElement.textContent = tip.tip;
            tipsContainer.appendChild(tipElement);
        });
    } catch (error) {
        console.error('Error fetching first aid tips:', error);
    }
}

// Fetch and display emergency contacts
async function getEmergencyContacts() {
    try {
        const response = await fetch('/api/emergency-contacts');
        if (!response.ok) throw new Error('Network response was not ok');
        const contacts = await response.json();

        const contactsContainer = document.getElementById('emergency-contacts');
        contactsContainer.innerHTML = ''; // Clear previous contacts

        contacts.forEach(contact => {
            const contactElement = document.createElement('div');
            contactElement.innerHTML = `
                <strong>${contact.emergency_type}</strong><br>
                ${contact.contact_number}<br>
                <small>${contact.description}</small>
                <hr>
            `;
            contactsContainer.appendChild(contactElement);
        });
    } catch (error) {
        console.error('Error fetching emergency contacts:', error);
    }
}

// Fetch and display disaster news
async function getDisasterNews() {
    try {
        const response = await fetch('/api/disaster-news');
        if (!response.ok) throw new Error('Network response was not ok');
        const newsData = await response.json();

        await displayBreakingNews(newsData); // Pass the full news data
    } catch (error) {
        console.error('Error fetching disaster news:', error);
    }
}

// Display breaking news with a fade-out effect
async function displayBreakingNews(newsData) {
    const breakingNewsContainer = document.getElementById('breaking-news');
    breakingNewsContainer.innerHTML = ''; // Clear any previous news

    const breakingNews = newsData.breaking_news;
    let currentIndex = 0;

    function updateNews() {
        if (currentIndex >= breakingNews.length) {
            // All breaking news displayed, start showing all news
            changeHeadingAndShowAllNews(newsData);
            return;
        }

        const newsItem = breakingNews[currentIndex];
        const newsElement = document.createElement('div');
        newsElement.className = 'news-item';
        newsElement.innerHTML = `<strong>${newsItem.title}</strong><br>${newsItem.description}<br><em>${newsItem.reported_time}</em>`;
        
        breakingNewsContainer.appendChild(newsElement);

        // Fade out effect
        setTimeout(() => {
            newsElement.style.opacity = 0; // Start fading out
            setTimeout(() => {
                breakingNewsContainer.removeChild(newsElement);
                currentIndex++; // Move to the next news item
                updateNews(); // Call the function again for the next item
            }, 1000); // Fade out duration
        }, 15000); // Display duration for each news item
    }

    updateNews();
}

// Change heading and start showing all news
async function changeHeadingAndShowAllNews(newsData) {
    const allNewsContainer = document.getElementById('all-news');
    allNewsContainer.innerHTML = ''; // Clear any previous news

    const allNewsHeading = document.getElementById('news-heading');
    allNewsHeading.innerText = 'News Headlines For the Last 24 Hours'; // Change heading

    // Display all news from the fetched data
    displayAllNews(newsData.all_news);
}

// Display all non-breaking news one by one
async function displayAllNews(allNews) {
    const allNewsContainer = document.getElementById('all-news');
    let currentIndex = 0;

    function updateAllNews() {
        if (currentIndex >= allNews.length) return;

        const newsItem = allNews[currentIndex];
        const newsElement = document.createElement('div');
        newsElement.className = 'news-item';
        newsElement.innerHTML = `<strong>${newsItem.title}</strong><br>${newsItem.description}<br><em>${newsItem.reported_time}</em>`;
        
        allNewsContainer.appendChild(newsElement);

        // Fade out effect for all news
        setTimeout(() => {
            allNewsContainer.removeChild(newsElement);
            currentIndex++; // Move to the next news item
            updateAllNews(); // Call the function again for the next item
        }, 15000); // Display time per news item
    }

    updateAllNews();
}

// Event listeners for form submission and page load
document.getElementById('emergency-type').addEventListener('change', event => {
    getFirstAidTips(event.target.value);
});

document.getElementById('submit').addEventListener('click', event => {
    event.preventDefault();
    submitRouteRequest();
});

// Load hospitals, emergency contacts, and disaster news on page load
document.addEventListener('DOMContentLoaded', () => {
    getHospitals(); // Load hospitals onto the map
    getEmergencyContacts(); // Display emergency contacts
    getDisasterNews(); // Display disaster news
});
