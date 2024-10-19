// Initialize the map and set the default view to a specific location
const map = L.map('map').setView([-1.2985, 36.8219], 12); // Default location

// Add a base layer to the map
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
}).addTo(map);

// Define a custom icon for hospitals
const hospitalIcon = L.icon({
    iconUrl: 'images/hospitals.png', // Replace with the path to your custom icon
    iconSize: [30, 30], // Size of the icon
    iconAnchor: [15, 30], // Anchor point of the icon
    popupAnchor: [0, -30] // Point from which the popup should open relative to the iconAnchor
});

// Initialize route control
window.routeControl = null; // Initialize routeControl

// Function to fetch and display hospitals on the map
async function getHospitals() {
    try {
        const response = await fetch('/api/hospitals');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();

        // Add hospitals to the map using the custom icon
        data.features.forEach(feature => {
            const { coordinates } = feature.geometry;
            L.marker(coordinates.reverse(), { icon: hospitalIcon })
                .bindPopup(feature.properties.name)
                .addTo(map);
        });
    } catch (error) {
        console.error('Error fetching hospitals:', error);
    }
}

// Function to draw route using Leaflet Routing Machine
async function drawRoute(startLat, startLng) {
    try {
        // Fetch the nearest hospital
        const response = await fetch(`/api/nearest-hospital?start_lat=${startLat}&start_lng=${startLng}`);
        if (!response.ok) throw new Error('Network response was not ok');
        const nearestHospital = await response.json();

        // Check if the nearest hospital data is valid
        if (!nearestHospital || !nearestHospital.latitude || !nearestHospital.longitude) {
            alert('No hospitals found.');
            return;
        }

        console.log('Nearest Hospital:', nearestHospital);

        // Clear any existing route on the map
        if (window.routeControl) {
            console.log('Removing existing route control...');
            map.removeControl(window.routeControl); // Ensure control is removed if it exists
            window.routeControl = null; // Reset control
        }

        // Use Leaflet Routing Machine to calculate and display the route
        window.routeControl = L.Routing.control({
            waypoints: [
                L.latLng(startLat, startLng), // Start point
                L.latLng(nearestHospital.latitude, nearestHospital.longitude) // Nearest hospital coordinates
            ],
            router: L.Routing.osrmv1({
                serviceUrl: 'https://router.project-osrm.org/route/v1' // Public OSRM service
            }),
            showAlternatives: false,
            lineOptions: {
                styles: [{ color: 'blue', weight: 4 }]
            },
            createMarker: function(i, waypoint, n) {
                return L.marker(waypoint.latLng); // Return a marker for each waypoint
            }
        }).addTo(map);
    } catch (error) {
        console.error('Error fetching nearest hospital or drawing route:', error);
    }
}

// Function to handle location submission
async function submitRouteRequest() {
    const startLat = document.getElementById('start_lat').value;
    const startLng = document.getElementById('start_lng').value;

    if (!startLat || !startLng) {
        alert('Please enter both latitude and longitude.');
        return;
    }

    // Draw the route based on input coordinates
    await drawRoute(startLat, startLng);
}

// Fetch first aid tips based on emergency type
async function getFirstAidTips(emergencyType) {
    try {
        let url;
        switch (emergencyType) {
            case 'Fire':
                url = '/api/fire-tips';
                break;
            case 'Accident':
                url = '/api/accident-tips';
                break;
            case 'Flood':
                url = '/api/flood-tips';
                break;
            case 'Building Collapse':
                url = '/api/collapse-tips';
                break;
            default:
                throw new Error('Invalid emergency type');
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        const tips = await response.json();

        // Display tips in a designated area on the webpage
        const tipsContainer = document.getElementById('first-aid-tips');
        tipsContainer.innerHTML = ''; // Clear previous tips

        tips.forEach(tip => {
            const tipElement = document.createElement('p');
            tipElement.textContent = tip.tip; // Use appropriate field for tip text
            tipsContainer.appendChild(tipElement);
        });
    } catch (error) {
        console.error('Error fetching first aid tips:', error);
    }
}

// Fetch emergency contact information from the server
async function getEmergencyContacts() {
    try {
        const response = await fetch('/api/emergency-contacts');
        if (!response.ok) throw new Error('Network response was not ok');
        const contacts = await response.json();

        // Display contacts in the sidebar
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

// Event listener for emergency type selection
document.getElementById('emergency-type').addEventListener('change', (event) => {
    const emergencyType = event.target.value;
    if (emergencyType) {
        getFirstAidTips(emergencyType);
    }
});

// Event listener for form submission
document.getElementById('submit').addEventListener('click', (event) => {
    event.preventDefault(); // Prevent the form from submitting the traditional way
    submitRouteRequest();
});

// Fetch hospitals and contacts on load
getHospitals();
getEmergencyContacts();
