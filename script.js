// =======================
// GLOBAL VARIABLES
// =======================
let map;
let layers = {};
let environmentalLayer;
let currentAnalysisMarkers = [];
let optimizationResults = [];
let activeFilters = {
    capacity: 500,
    status: 'all',
    region: 'all'
};

// API configuration
const API_CONFIG = {
    baseUrl: 'backend/',
    endpoints: {
        solar: 'solar.php',
        soil: 'soil.php',
        water: 'water.php',
        route: 'route.php'
    }
};

// Sample infrastructure data (replace with actual database data)
const sampleInfrastructure = {
    production: [
        { id: 1, lat: 23.0225, lng: 72.5714, name: "Gujarat Mega Solar-H₂ Plant", capacity: 250, status: "operational", technology: "PEM", investment: 350 },
        { id: 2, lat: 22.2587, lng: 71.8292, name: "Kutch Green Hydrogen Hub", capacity: 180, status: "construction", technology: "Alkaline", investment: 280 },
        { id: 3, lat: 15.3173, lng: 75.7139, name: "Karnataka Solar H₂ Facility", capacity: 120, status: "operational", technology: "PEM", investment: 200 },
        { id: 4, lat: 26.9124, lng: 75.7873, name: "Rajasthan Desert H₂ Plant", capacity: 300, status: "planned", technology: "SOEC", investment: 450 },
        { id: 5, lat: 19.0760, lng: 72.8777, name: "Mumbai Port H₂ Terminal", capacity: 90, status: "construction", technology: "PEM", investment: 150 }
    ],
    storage: [
        { id: 1, lat: 23.0324, lng: 72.5874, name: "Gujarat Central Storage", capacity: 50, type: "Compressed Gas", status: "operational" },
        { id: 2, lat: 22.3072, lng: 73.1812, name: "Vadodara H₂ Storage", capacity: 35, type: "Liquid H₂", status: "construction" },
        { id: 3, lat: 15.3373, lng: 75.7339, name: "Hubli Storage Facility", capacity: 25, type: "Ammonia", status: "operational" },
        { id: 4, lat: 26.9324, lng: 75.8073, name: "Jaipur H₂ Depot", capacity: 40, type: "Compressed Gas", status: "planned" }
    ],
    pipelines: [
        { start: [23.0225, 72.5714], end: [22.2587, 71.8292], name: "Gujarat Coastal Pipeline", length: 95, status: "operational" },
        { start: [22.3072, 73.1812], end: [23.0225, 72.5714], name: "Vadodara-Ahmedabad Link", length: 120, status: "construction" },
        { start: [15.3173, 75.7139], end: [12.9716, 77.5946], name: "Karnataka Corridor", length: 180, status: "planned" },
        { start: [26.9124, 75.7873], end: [28.7041, 77.1025], name: "Rajasthan-Delhi Pipeline", length: 250, status: "planned" }
    ],
    distribution: [
        { id: 1, lat: 28.7041, lng: 77.1025, name: "Delhi Distribution Hub", capacity: 150, connections: 25, status: "operational" },
        { id: 2, lat: 19.0760, lng: 72.8777, name: "Mumbai Port Hub", capacity: 200, connections: 35, status: "construction" },
        { id: 3, lat: 13.0827, lng: 80.2707, name: "Chennai Industrial Hub", capacity: 120, connections: 20, status: "planned" },
        { id: 4, lat: 22.5726, lng: 88.3639, name: "Kolkata Export Terminal", capacity: 100, connections: 18, status: "operational" }
    ],
    renewable: [
        { id: 1, lat: 27.0238, lng: 74.2179, name: "Rajasthan Solar Park", capacity: 2000, type: "Solar", efficiency: 92 },
        { id: 2, lat: 22.2587, lng: 71.8292, name: "Kutch Wind Farm", capacity: 1500, type: "Wind", efficiency: 85 },
        { id: 3, lat: 23.2599, lng: 77.4126, name: "MP Solar Complex", capacity: 1200, type: "Solar", efficiency: 88 },
        { id: 4, lat: 15.9129, lng: 79.7400, name: "Andhra Wind Corridor", capacity: 1800, type: "Wind", efficiency: 87 }
    ]
};

// Location database for search
const locationDatabase = {
    'gujarat': { lat: 23.0225, lng: 72.5714, type: 'state', hasInfrastructure: true },
    'ahmedabad': { lat: 23.0225, lng: 72.5714, type: 'city', hasInfrastructure: true },
    'kutch': { lat: 22.2587, lng: 71.8292, type: 'district', hasInfrastructure: true },
    'rajasthan': { lat: 26.9124, lng: 75.7873, type: 'state', hasInfrastructure: true },
    'jaipur': { lat: 26.9124, lng: 75.7873, type: 'city', hasInfrastructure: true },
    'mumbai': { lat: 19.0760, lng: 72.8777, type: 'city', hasInfrastructure: true },
    'delhi': { lat: 28.7041, lng: 77.1025, type: 'city', hasInfrastructure: true },
    'karnataka': { lat: 15.3173, lng: 75.7139, type: 'state', hasInfrastructure: true },
    'bangalore': { lat: 12.9716, lng: 77.5946, type: 'city', hasInfrastructure: false },
    'chennai': { lat: 13.0827, lng: 80.2707, type: 'city', hasInfrastructure: true },
    'kolkata': { lat: 22.5726, lng: 88.3639, type: 'city', hasInfrastructure: true }
};

// =======================
// MAP INITIALIZATION
// =======================
function initializeMap() {
    try {
        // Initialize layer groups
        layers.production = L.layerGroup().addTo(map);
        layers.storage = L.layerGroup().addTo(map);
        layers.pipeline = L.layerGroup().addTo(map);
        layers.distribution = L.layerGroup().addTo(map);
        layers.renewable = L.layerGroup().addTo(map);
        layers.environmental = L.layerGroup();

        // Load initial infrastructure data
        loadInfrastructureData();
        
        // Set up event listeners
        setupEventListeners();
        
        // Initialize calculator
        updateCalculator();
        
        console.log('Map initialized successfully');
    } catch (error) {
        console.error('Error initializing map:', error);
    }
}

// =======================
// DATA LOADING FUNCTIONS
// =======================
function loadInfrastructureData() {
    // Load Production Plants
    sampleInfrastructure.production.forEach(plant => {
        if (shouldShowItem(plant)) {
            const marker = createProductionMarker(plant);
            layers.production.addLayer(marker);
        }
    });

    // Load Storage Facilities
    sampleInfrastructure.storage.forEach(storage => {
        if (shouldShowItem(storage)) {
            const marker = createStorageMarker(storage);
            layers.storage.addLayer(marker);
        }
    });

    // Load Pipelines
    sampleInfrastructure.pipelines.forEach(pipeline => {
        if (shouldShowPipeline(pipeline)) {
            const line = createPipelinePolyline(pipeline);
            layers.pipeline.addLayer(line);
        }
    });

    // Load Distribution Hubs
    sampleInfrastructure.distribution.forEach(hub => {
        if (shouldShowItem(hub)) {
            const marker = createDistributionMarker(hub);
            layers.distribution.addLayer(marker);
        }
    });

    // Load Renewable Sources
    sampleInfrastructure.renewable.forEach(source => {
        if (shouldShowItem(source)) {
            const marker = createRenewableMarker(source);
            layers.renewable.addLayer(marker);
        }
    });

    updateStats();
}

// =======================
// MARKER CREATION FUNCTIONS
// =======================
function createProductionMarker(plant) {
    const icon = L.divIcon({
        className: 'custom-marker production-marker',
        html: `<div style="background: #4CAF50; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 12px; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"><i class="fas fa-industry"></i></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });

    const marker = L.marker([plant.lat, plant.lng], { icon })
        .bindPopup(`
            <div style="min-width: 200px;">
                <h3 style="margin: 0 0 10px 0; color: #4CAF50;">${plant.name}</h3>
                <div style="margin-bottom: 8px;"><strong>Capacity:</strong> ${plant.capacity} MW</div>
                <div style="margin-bottom: 8px;"><strong>Technology:</strong> ${plant.technology}</div>
                <div style="margin-bottom: 8px;"><strong>Status:</strong> <span class="status-badge status-${plant.status}">${plant.status.charAt(0).toUpperCase() + plant.status.slice(1)}</span></div>
                <div style="margin-bottom: 10px;"><strong>Investment:</strong> ₹${plant.investment}Cr</div>
                <button onclick="analyzeLocation(${plant.lat}, ${plant.lng}, '${plant.name}')" style="width: 100%; padding: 8px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;">Analyze Site</button>
            </div>
        `);

    return marker;
}

function createStorageMarker(storage) {
    const icon = L.divIcon({
        className: 'custom-marker storage-marker',
        html: `<div style="background: #2196F3; color: white; border-radius: 50%; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; font-size: 10px; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"><i class="fas fa-database"></i></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
    });

    return L.marker([storage.lat, storage.lng], { icon })
        .bindPopup(`
            <div style="min-width: 180px;">
                <h3 style="margin: 0 0 10px 0; color: #2196F3;">${storage.name}</h3>
                <div style="margin-bottom: 8px;"><strong>Capacity:</strong> ${storage.capacity} tons</div>
                <div style="margin-bottom: 8px;"><strong>Type:</strong> ${storage.type}</div>
                <div style="margin-bottom: 10px;"><strong>Status:</strong> <span class="status-badge status-${storage.status}">${storage.status.charAt(0).toUpperCase() + storage.status.slice(1)}</span></div>
                <button onclick="analyzeLocation(${storage.lat}, ${storage.lng}, '${storage.name}')" style="width: 100%; padding: 8px; background: #2196F3; color: white; border: none; border-radius: 5px; cursor: pointer;">Analyze Site</button>
            </div>
        `);
}

function createPipelinePolyline(pipeline) {
    const line = L.polyline([pipeline.start, pipeline.end], {
        color: getStatusColor(pipeline.status),
        weight: 4,
        opacity: 0.8,
        dashArray: pipeline.status === 'planned' ? '10, 5' : null
    }).bindPopup(`
        <div style="min-width: 180px;">
            <h3 style="margin: 0 0 10px 0; color: #FF9800;">${pipeline.name}</h3>
            <div style="margin-bottom: 8px;"><strong>Length:</strong> ${pipeline.length} km</div>
            <div style="margin-bottom: 10px;"><strong>Status:</strong> <span class="status-badge status-${pipeline.status}">${pipeline.status.charAt(0).toUpperCase() + pipeline.status.slice(1)}</span></div>
        </div>
    `);

    return line;
}

function createDistributionMarker(hub) {
    const icon = L.divIcon({
        className: 'custom-marker distribution-marker',
        html: `<div style="background: #9C27B0; color: white; border-radius: 50%; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; font-size: 10px; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"><i class="fas fa-shipping-fast"></i></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
    });

    return L.marker([hub.lat, hub.lng], { icon })
        .bindPopup(`
            <div style="min-width: 180px;">
                <h3 style="margin: 0 0 10px 0; color: #9C27B0;">${hub.name}</h3>
                <div style="margin-bottom: 8px;"><strong>Capacity:</strong> ${hub.capacity} tons/day</div>
                <div style="margin-bottom: 8px;"><strong>Connections:</strong> ${hub.connections}</div>
                <div style="margin-bottom: 10px;"><strong>Status:</strong> <span class="status-badge status-${hub.status}">${hub.status.charAt(0).toUpperCase() + hub.status.slice(1)}</span></div>
                <button onclick="analyzeLocation(${hub.lat}, ${hub.lng}, '${hub.name}')" style="width: 100%; padding: 8px; background: #9C27B0; color: white; border: none; border-radius: 5px; cursor: pointer;">Analyze Hub</button>
            </div>
        `);
}

function createRenewableMarker(source) {
    const color = source.type === 'Solar' ? '#FFC107' : '#4CAF50';
    const icon = L.divIcon({
        className: 'custom-marker renewable-marker',
        html: `<div style="background: ${color}; color: white; border-radius: 50%; width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; font-size: 8px; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"><i class="fas fa-${source.type === 'Solar' ? 'sun' : 'wind'}"></i></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });

    return L.marker([source.lat, source.lng], { icon })
        .bindPopup(`
            <div style="min-width: 180px;">
                <h3 style="margin: 0 0 10px 0; color: ${color};">${source.name}</h3>
                <div style="margin-bottom: 8px;"><strong>Type:</strong> ${source.type}</div>
                <div style="margin-bottom: 8px;"><strong>Capacity:</strong> ${source.capacity} MW</div>
                <div style="margin-bottom: 10px;"><strong>Efficiency:</strong> ${source.efficiency}%</div>
                <button onclick="analyzeLocation(${source.lat}, ${source.lng}, '${source.name}')" style="width: 100%; padding: 8px; background: ${color}; color: white; border: none; border-radius: 5px; cursor: pointer;">Analyze Source</button>
            </div>
        `);
}

// =======================
// FILTERING FUNCTIONS
// =======================
function shouldShowItem(item) {
    // Capacity filter
    if (item.capacity && item.capacity > activeFilters.capacity) {
        return false;
    }
    
    // Status filter
    if (activeFilters.status !== 'all' && item.status !== activeFilters.status) {
        return false;
    }
    
    // Region filter (simplified - in real implementation would use geographic boundaries)
    if (activeFilters.region !== 'all') {
        const isInRegion = checkRegion(item.lat, item.lng, activeFilters.region);
        if (!isInRegion) return false;
    }
    
    return true;
}

function shouldShowPipeline(pipeline) {
    return activeFilters.status === 'all' || pipeline.status === activeFilters.status;
}

function checkRegion(lat, lng, region) {
    // Simplified region checking - in real implementation would use proper geospatial queries
    switch(region) {
        case 'north-india':
            return lat > 24;
        case 'south-india':
            return lat < 20;
        case 'west-india':
            return lng < 76;
        case 'east-india':
            return lng > 80;
        default:
            return true;
    }
}

function getStatusColor(status) {
    switch(status) {
        case 'operational': return '#4CAF50';
        case 'construction': return '#FF9800';
        case 'planned': return '#2196F3';
        default: return '#757575';
    }
}

// =======================
// EVENT LISTENERS SETUP
// =======================
function setupEventListeners() {
    // Layer toggle switches
    document.querySelectorAll('.toggle-switch').forEach(toggle => {
        toggle.addEventListener('click', function() {
            const layerName = this.dataset.layer;
            this.classList.toggle('active');
            
            if (this.classList.contains('active')) {
                if (layers[layerName]) {
                    map.addLayer(layers[layerName]);
                }
            } else {
                if (layers[layerName]) {
                    map.removeLayer(layers[layerName]);
                }
            }
        });
    });

    // Filter controls
    document.getElementById('capacityRange').addEventListener('input', function() {
        activeFilters.capacity = parseInt(this.value);
        document.getElementById('capacityValue').textContent = this.value;
        refreshLayers();
    });

    document.getElementById('statusFilter').addEventListener('change', function() {
        activeFilters.status = this.value;
        refreshLayers();
    });

    document.getElementById('regionFilter').addEventListener('change', function() {
        activeFilters.region = this.value;
        refreshLayers();
    });

    // Calculator inputs
    document.getElementById('calcCapacity').addEventListener('input', updateCalculator);
    document.getElementById('techType').addEventListener('change', updateCalculator);

    // Search functionality
    setupSearchListeners();
    
    // Map click handler for environmental analysis
    map.on('click', handleMapClick);
}

// =======================
// SEARCH FUNCTIONALITY
// =======================
function setupSearchListeners() {
    const searchInput = document.getElementById('searchInput');
    const searchSuggestions = document.getElementById('searchSuggestions');
    const clearBtn = document.getElementById('clearBtn');

    searchInput.addEventListener('input', function() {
        const query = this.value.toLowerCase().trim();
        
        if (query.length > 0) {
            clearBtn.style.display = 'block';
            showSearchSuggestions(query);
        } else {
            clearBtn.style.display = 'none';
            searchSuggestions.style.display = 'none';
        }
    });

    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const query = this.value.toLowerCase().trim();
            searchLocation(query);
        }
    });

    // Hide suggestions when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.search-container')) {
            searchSuggestions.style.display = 'none';
        }
    });
}

function showSearchSuggestions(query) {
    const suggestions = document.getElementById('searchSuggestions');
    const matches = Object.keys(locationDatabase)
        .filter(key => key.includes(query))
        .slice(0, 5);

    if (matches.length > 0) {
        suggestions.innerHTML = matches.map(location => {
            const data = locationDatabase[location];
            const icon = getLocationIcon(data.type);
            const infrastructure = data.hasInfrastructure ? 'Has Infrastructure' : 'No Infrastructure';
            
            return `
                <div class="suggestion-item" onclick="selectLocation('${location}')">
                    <i class="${icon} suggestion-icon"></i>
                    <div class="suggestion-text">
                        <div style="font-weight: 500; color: #333;">${location.charAt(0).toUpperCase() + location.slice(1)}</div>
                        <div style="font-size: 11px; color: #666;">${infrastructure}</div>
                    </div>
                    <span class="suggestion-type">${data.type}</span>
                </div>
            `;
        }).join('');
        
        suggestions.style.display = 'block';
    } else {
        suggestions.style.display = 'none';
    }
}

function getLocationIcon(type) {
    switch(type) {
        case 'state': return 'fas fa-map';
        case 'city': return 'fas fa-city';
        case 'district': return 'fas fa-map-marker-alt';
        default: return 'fas fa-location-dot';
    }
}

function selectLocation(locationKey) {
    const location = locationDatabase[locationKey];
    if (location) {
        map.setView([location.lat, location.lng], 8);
        document.getElementById('searchInput').value = locationKey.charAt(0).toUpperCase() + locationKey.slice(1);
        document.getElementById('searchSuggestions').style.display = 'none';
        
        // Trigger environmental analysis for the location
        setTimeout(() => {
            analyzeLocation(location.lat, location.lng, locationKey.charAt(0).toUpperCase() + locationKey.slice(1));
        }, 500);
    }
}

function searchLocation(query) {
    const location = locationDatabase[query];
    if (location) {
        selectLocation(query);
    } else {
        // Try partial match
        const partialMatch = Object.keys(locationDatabase).find(key => key.includes(query));
        if (partialMatch) {
            selectLocation(partialMatch);
        } else {
            alert('Location not found. Try searching for: Gujarat, Mumbai, Delhi, Rajasthan, etc.');
        }
    }
}

function clearSearch() {
    document.getElementById('searchInput').value = '';
    document.getElementById('clearBtn').style.display = 'none';
    document.getElementById('searchSuggestions').style.display = 'none';
}

// =======================
// API INTEGRATION FUNCTIONS
// =======================
async function fetchSolar(lat, lon) {
    try {
        const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.solar}?lat=${lat}&lon=${lon}`);
        const data = await response.json();
        
        if (data.properties && data.properties.parameter.ALLSKY_SFC_SW_DWN) {
            const values = data.properties.parameter.ALLSKY_SFC_SW_DWN;
            const avg = Object.values(values).reduce((a, b) => a + b, 0) / Object.values(values).length;
            
            return {
                avgGHI: avg.toFixed(2),
                suitability: avg > 5 ? 'Excellent' : avg > 4 ? 'Good' : 'Moderate',
                data: values
            };
        }
    } catch (error) {
        console.error('Solar data fetch error:', error);
        // Return mock data for demo
        return {
            avgGHI: (4.5 + Math.random() * 2).toFixed(2),
            suitability: 'Good',
            data: {}
        };
    }
}

async function fetchSoil(lat, lon) {
    try {
        const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.soil}?lat=${lat}&lon=${lon}`);
        const data = await response.json();
        
        if (data.properties) {
            const ph = data.properties.phh2o?.M?.sl1?.mean ?? null;
            return {
                ph: ph ? ph.toFixed(1) : 'N/A',
                suitability: ph ? (ph > 6.5 && ph < 8.5 ? 'Suitable' : 'Moderate') : 'Unknown'
            };
        }
    } catch (error) {
        console.error('Soil data fetch error:', error);
        // Return mock data for demo
        return {
            ph: (6.5 + Math.random() * 2).toFixed(1),
            suitability: 'Suitable'
        };
    }
}

async function fetchWater(lat, lon) {
    try {
        const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.water}?lat=${lat}&lon=${lon}`);
        const data = await response.json();
        
        return {
            availability: data.message || 'Moderate',
            quality: 'Good', // Would come from actual API
            distance: Math.floor(Math.random() * 10) + 'km'
        };
    } catch (error) {
        console.error('Water data fetch error:', error);
        // Return mock data for demo
        return {
            availability: 'Good',
            quality: 'Good',
            distance: Math.floor(Math.random() * 10) + 'km'
        };
    }
}

async function fetchRoute(start, end) {
    try {
        const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.route}?start=${start[1]},${start[0]}&end=${end[1]},${end[0]}`);
        const data = await response.json();
        
        if (data.features && data.features[0]) {
            const coords = data.features[0].geometry.coordinates.map(c => [c[1], c[0]]);
            return {
                coordinates: coords,
                distance: data.features[0].properties.segments[0].distance,
                duration: data.features[0].properties.segments[0].duration
            };
        }
    } catch (error) {
        console.error('Route data fetch error:', error);
        // Return mock route for demo
        return {
            coordinates: [start, end],
            distance: Math.floor(Math.random() * 500) + 100,
            duration: Math.floor(Math.random() * 300) + 60
        };
    }
}

// =======================
// ENVIRONMENTAL ANALYSIS
// =======================
async function analyzeLocation(lat, lon, name) {
    const analysisPanel = document.getElementById('analysisPanel');
    const analysisContent = document.getElementById('analysisContent');
    
    // Show panel with loading state
    analysisPanel.style.display = 'block';
    analysisContent.innerHTML = `
        <div class="loading-indicator">
            <div class="spinner"></div>
            Analyzing ${name}...
        </div>
    `;

    try {
        // Fetch all environmental data
        const [solarData, soilData, waterData] = await Promise.all([
            fetchSolar(lat, lon),
            fetchSoil(lat, lon),
            fetchWater(lat, lon)
        ]);

        // Calculate overall suitability score
        const suitabilityScore = calculateSuitabilityScore(solarData, soilData, waterData);

        // Update analysis panel
        analysisContent.innerHTML = `
            <div class="environmental-data">
                <div class="env-item">
                    <span class="env-label">Solar Potential</span>
                    <span class="env-value">${solarData.avgGHI} kWh/m²/day</span>
                </div>
                <div class="env-item">
                    <span class="env-label">Soil pH</span>
                    <span class="env-value">${soilData.ph}</span>
                </div>
                <div class="env-item">
                    <span class="env-label">Water Availability</span>
                    <span class="env-value">${waterData.availability}</span>
                </div>
                <div class="env-item">
                    <span class="env-label">Water Distance</span>
                    <span class="env-value">${waterData.distance}</span>
                </div>
                <div class="env-item" style="background: rgba(76, 175, 80, 0.2); border: 1px solid #4CAF50;">
                    <span class="env-label">Site Suitability</span>
                    <span class="env-value">${suitabilityScore.score}/100</span>
                </div>
            </div>
            <div style="margin-top: 15px; padding: 10px; background: rgba(33, 150, 243, 0.1); border-radius: 8px; font-size: 13px; color: #333;">
                <strong>Recommendations:</strong><br>
                ${suitabilityScore.recommendations.join('<br>')}
            </div>
            <button onclick="showOptimizationResults(${lat}, ${lon})" style="width: 100%; padding: 10px; background: #4CAF50; color: white; border: none; border-radius: 8px; cursor: pointer; margin-top: 10px;">
                <i class="fas fa-chart-line"></i> View Optimization
            </button>
        `;

        // Add analysis marker to map
        clearAnalysisMarkers();
        const analysisMarker = L.marker([lat, lon], {
            icon: L.divIcon({
                className: 'analysis-marker',
                html: `<div style="background: #00BCD4; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 12px; border: 3px solid white; box-shadow: 0 3px 8px rgba(0,0,0,0.3); animation: pulse 2s infinite;"><i class="fas fa-crosshairs"></i></div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            })
        }).addTo(map);
        
        currentAnalysisMarkers.push(analysisMarker);

    } catch (error) {
        console.error('Analysis error:', error);
        analysisContent.innerHTML = `
            <div style="text-align: center; color: #f44336; padding: 20px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 10px;"></i><br>
                Analysis failed. Please try again.
            </div>
        `;
    }
}

function calculateSuitabilityScore(solarData, soilData, waterData) {
    let score = 0;
    let recommendations = [];

    // Solar potential (40% weight)
    const solarScore = parseFloat(solarData.avgGHI);
    if (solarScore > 5.5) {
        score += 40;
        recommendations.push("☀️ Excellent solar conditions for H₂ production");
    } else if (solarScore > 4.5) {
        score += 30;
        recommendations.push("☀️ Good solar potential");
    } else {
        score += 20;
        recommendations.push("⚠️ Consider wind power supplementation");
    }

    // Soil conditions (20% weight)
    const ph = parseFloat(soilData.ph);
    if (ph >= 6.5 && ph <= 8.5) {
        score += 20;
        recommendations.push("🌱 Suitable soil conditions for construction");
    } else {
        score += 10;
        recommendations.push("⚠️ Soil treatment may be required");
    }

    // Water availability (30% weight)
    if (waterData.availability === 'Good' || waterData.availability === 'Excellent') {
        score += 30;
        recommendations.push("💧 Adequate water supply for electrolysis");
    } else {
        score += 15;
        recommendations.push("⚠️ Water sourcing strategy needed");
    }

    // Infrastructure proximity (10% weight)
    score += 10; // Simplified - would calculate based on actual distance to existing infrastructure

    return {
        score: Math.round(score),
        recommendations: recommendations
    };
}

// =======================
// MAP INTERACTION HANDLERS
// =======================
function handleMapClick(e) {
    const lat = e.latlng.lat.toFixed(4);
    const lon = e.latlng.lng.toFixed(4);
    
    // Show quick analysis popup
    const popup = L.popup()
        .setLatLng(e.latlng)
        .setContent(`
            <div style="text-align: center; min-width: 150px;">
                <h4 style="margin: 0 0 10px 0; color: #4CAF50;">Site Analysis</h4>
                <div style="margin-bottom: 10px; font-size: 12px; color: #666;">
                    Coordinates: ${lat}, ${lon}
                </div>
                <button onclick="analyzeLocation(${lat}, ${lon}, 'Selected Location')" style="width: 100%; padding: 8px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; margin-bottom: 5px;">
                    <i class="fas fa-search"></i> Full Analysis
                </button>
                <button onclick="runOptimizationForPoint(${lat}, ${lon})" style="width: 100%; padding: 8px; background: #2196F3; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    <i class="fas fa-cogs"></i> Optimize Site
                </button>
            </div>
        `)
        .openOn(map);
}

// =======================
// OPTIMIZATION FUNCTIONS
// =======================
function runOptimization() {
    showNotification('Running site optimization analysis...', 'info');
    
    setTimeout(() => {
        // Clear previous results
        clearOptimizationMarkers();
        
        // Generate optimization results
        const results = generateOptimizationResults();
        
        // Display results on map
        displayOptimizationResults(results);
        
        showNotification('Optimization complete! Check the map for recommended sites.', 'success');
        
        // Update stats
        updateStats();
    }, 2000);
}

function runOptimizationForPoint(lat, lon) {
    showNotification('Analyzing site optimization...', 'info');
    
    setTimeout(() => {
        const score = 75 + Math.random() * 20; // Mock optimization score
        const recommendations = generateSiteRecommendations(lat, lon, score);
        
        const optimizationMarker = L.marker([lat, lon], {
            icon: L.divIcon({
                className: 'optimization-marker',
                html: `<div style="background: #FF5722; color: white; border-radius: 50%; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; font-size: 12px; border: 3px solid white; box-shadow: 0 3px 8px rgba(0,0,0,0.4);"><i class="fas fa-cogs"></i></div>`,
                iconSize: [32, 32],
                iconAnchor: [16, 16]
            })
        }).addTo(map);
        
        optimizationMarker.bindPopup(`
            <div style="min-width: 220px;">
                <h3 style="margin: 0 0 10px 0; color: #FF5722;">Optimization Results</h3>
                <div style="margin-bottom: 10px; font-size: 14px;">
                    <strong>Site Score:</strong> <span style="color: ${score > 80 ? '#4CAF50' : score > 60 ? '#FF9800' : '#F44336'};">${score.toFixed(1)}/100</span>
                </div>
                <div style="font-size: 12px; color: #666; line-height: 1.4;">
                    ${recommendations.join('<br>')}
                </div>
            </div>
        `).openPopup();
        
        currentAnalysisMarkers.push(optimizationMarker);
        showNotification('Site analysis complete!', 'success');
    }, 1500);
}

function generateOptimizationResults() {
    // Mock optimization algorithm - in real implementation, this would call backend optimization
    const results = [];
    const bounds = map.getBounds();
    
    for (let i = 0; i < 5; i++) {
        const lat = bounds.getSouth() + Math.random() * (bounds.getNorth() - bounds.getSouth());
        const lng = bounds.getWest() + Math.random() * (bounds.getEast() - bounds.getWest());
        const score = 60 + Math.random() * 40;
        
        results.push({
            id: i + 1,
            lat: lat,
            lng: lng,
            score: score,
            capacity: Math.floor(100 + Math.random() * 200),
            cost: Math.floor(150 + Math.random() * 300),
            type: ['production', 'storage', 'distribution'][Math.floor(Math.random() * 3)]
        });
    }
    
    return results.sort((a, b) => b.score - a.score);
}

function displayOptimizationResults(results) {
    results.forEach((result, index) => {
        const color = index === 0 ? '#4CAF50' : index < 3 ? '#FF9800' : '#757575';
        const priority = index === 0 ? 'Highest Priority' : index < 3 ? 'Medium Priority' : 'Low Priority';
        
        const marker = L.marker([result.lat, result.lng], {
            icon: L.divIcon({
                className: 'optimization-result-marker',
                html: `<div style="background: ${color}; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 12px; border: 3px solid white; box-shadow: 0 3px 8px rgba(0,0,0,0.4); font-weight: bold;">${index + 1}</div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            })
        }).addTo(map);
        
        marker.bindPopup(`
            <div style="min-width: 200px;">
                <h3 style="margin: 0 0 10px 0; color: ${color};">Optimization Result #${index + 1}</h3>
                <div style="margin-bottom: 8px;"><strong>Priority:</strong> <span style="color: ${color};">${priority}</span></div>
                <div style="margin-bottom: 8px;"><strong>Score:</strong> ${result.score.toFixed(1)}/100</div>
                <div style="margin-bottom: 8px;"><strong>Recommended Type:</strong> ${result.type}</div>
                <div style="margin-bottom: 8px;"><strong>Capacity:</strong> ${result.capacity} MW</div>
                <div style="margin-bottom: 10px;"><strong>Est. Cost:</strong> ₹${result.cost}Cr</div>
                <button onclick="analyzeLocation(${result.lat}, ${result.lng}, 'Optimized Site #${index + 1}')" style="width: 100%; padding: 8px; background: ${color}; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    <i class="fas fa-search"></i> Detailed Analysis
                </button>
            </div>
        `);
        
        optimizationResults.push(marker);
    });
}

function generateSiteRecommendations(lat, lon, score) {
    const recommendations = [];
    
    if (score > 80) {
        recommendations.push("✅ Excellent site for hydrogen production");
        recommendations.push("💰 High ROI potential");
        recommendations.push("🔌 Strong renewable energy access");
    } else if (score > 60) {
        recommendations.push("✅ Good site with minor optimization needed");
        recommendations.push("⚡ Consider hybrid renewable systems");
        recommendations.push("🚛 Evaluate transport connectivity");
    } else {
        recommendations.push("⚠️ Site requires significant infrastructure");
        recommendations.push("🔄 Consider alternative locations");
        recommendations.push("📊 Additional feasibility study needed");
    }
    
    return recommendations;
}

// =======================
// UTILITY FUNCTIONS
// =======================
function refreshLayers() {
    // Clear all layers
    Object.values(layers).forEach(layer => {
        if (layer.clearLayers) {
            layer.clearLayers();
        }
    });
    
    // Reload data with current filters
    loadInfrastructureData();
}

function updateStats() {
    // Filter data based on current filters
    const filteredProduction = sampleInfrastructure.production.filter(shouldShowItem);
    const filteredStorage = sampleInfrastructure.storage.filter(shouldShowItem);
    const filteredDistribution = sampleInfrastructure.distribution.filter(shouldShowItem);
    
    const totalProjects = filteredProduction.length + filteredStorage.length + filteredDistribution.length;
    const totalCapacity = filteredProduction.reduce((sum, p) => sum + p.capacity, 0);
    const activeProjects = [...filteredProduction, ...filteredStorage, ...filteredDistribution]
        .filter(item => item.status === 'operational' || item.status === 'construction').length;
    const totalInvestment = filteredProduction.reduce((sum, p) => sum + p.investment, 0);

    document.getElementById('totalProjects').textContent = totalProjects;
    document.getElementById('totalCapacity').textContent = totalCapacity.toLocaleString();
    document.getElementById('activeProjects').textContent = activeProjects;
    document.getElementById('totalInvestment').textContent = `₹${(totalInvestment/100).toFixed(1)}L Cr`;
}

function updateCalculator() {
    const capacity = document.getElementById('calcCapacity').value || 100;
    const techType = document.getElementById('techType').value;
    
    // Cost calculation based on technology type (₹Cr per MW)
    const costPerMW = {
        'pem': 1.8,
        'alkaline': 1.5,
        'soec': 2.2
    };
    
    const baseCost = capacity * costPerMW[techType];
    const minCost = baseCost * 0.9;
    const maxCost = baseCost * 1.3;
    
    document.getElementById('calcResult').innerHTML = `
        Estimated Cost: ₹${minCost.toFixed(0)}Cr - ₹${maxCost.toFixed(0)}Cr
        <div style="font-size: 11px; margin-top: 5px; opacity: 0.8;">
            Technology: ${techType.toUpperCase()} | Capacity: ${capacity} MW
        </div>
    `;
}

function clearAnalysisMarkers() {
    currentAnalysisMarkers.forEach(marker => {
        map.removeLayer(marker);
    });
    currentAnalysisMarkers = [];
}

function clearOptimizationMarkers() {
    optimizationResults.forEach(marker => {
        map.removeLayer(marker);
    });
    optimizationResults = [];
}

// =======================
// REPORT GENERATION
// =======================
function generateReport() {
    showNotification('Generating comprehensive infrastructure report...', 'info');
    
    setTimeout(() => {
        const reportData = {
            timestamp: new Date().toLocaleString(),
            totalProjects: document.getElementById('totalProjects').textContent,
            totalCapacity: document.getElementById('totalCapacity').textContent,
            activeProjects: document.getElementById('activeProjects').textContent,
            totalInvestment: document.getElementById('totalInvestment').textContent,
            optimizationResults: optimizationResults.length
        };
        
        const reportContent = `
GREEN HYDROGEN INFRASTRUCTURE REPORT
Generated: ${reportData.timestamp}

EXECUTIVE SUMMARY
================
• Total Projects: ${reportData.totalProjects}
• Total Capacity: ${reportData.totalCapacity} MW
• Active Projects: ${reportData.activeProjects}
• Total Investment: ${reportData.totalInvestment}
• Optimization Sites: ${reportData.optimizationResults}

INFRASTRUCTURE BREAKDOWN
========================
Production Plants: ${sampleInfrastructure.production.length} facilities
Storage Facilities: ${sampleInfrastructure.storage.length} locations
Pipeline Network: ${sampleInfrastructure.pipelines.length} routes
Distribution Hubs: ${sampleInfrastructure.distribution.length} terminals
Renewable Sources: ${sampleInfrastructure.renewable.length} power plants

RECOMMENDATIONS
===============
1. Focus development in Gujarat and Rajasthan regions
2. Prioritize coastal areas for export infrastructure
3. Develop integrated renewable-hydrogen parks
4. Establish pipeline corridors between major hubs
5. Consider hybrid storage solutions for grid stability

Report generated by Green Hydrogen Infrastructure Platform
        `;
        
        downloadTextFile('hydrogen_infrastructure_report.txt', reportContent);
        showNotification('Report downloaded successfully!', 'success');
    }, 2000);
}

function downloadTextFile(filename, content) {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

// =======================
// ENVIRONMENTAL ANALYSIS PANEL
// =======================
function analyzeEnvironmental() {
    showNotification('Activating environmental data layer...', 'info');
    
    // Toggle environmental layer
    const environmentalToggle = document.querySelector('[data-layer="environmental"]');
    if (!environmentalToggle.classList.contains('active')) {
        environmentalToggle.classList.add('active');
        map.addLayer(layers.environmental);
    }
    
    // Add environmental data overlay
    if (!environmentalLayer) {
        environmentalLayer = L.layerGroup();
        
        // Add some environmental monitoring points
        const environmentalPoints = [
            { lat: 23.0225, lng: 72.5714, type: 'Air Quality', value: 'Good', color: '#4CAF50' },
            { lat: 22.2587, lng: 71.8292, type: 'Water Quality', value: 'Excellent', color: '#2196F3' },
            { lat: 26.9124, lng: 75.7873, type: 'Soil Health', value: 'Good', color: '#8BC34A' },
            { lat: 19.0760, lng: 72.8777, type: 'Noise Level', value: 'Moderate', color: '#FF9800' },
            { lat: 28.7041, lng: 77.1025, type: 'Carbon Footprint', value: 'Low', color: '#4CAF50' }
        ];
        
        environmentalPoints.forEach(point => {
            const marker = L.circleMarker([point.lat, point.lng], {
                radius: 8,
                fillColor: point.color,
                color: 'white',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
            }).bindPopup(`
                <div style="min-width: 150px;">
                    <h4 style="margin: 0 0 8px 0; color: ${point.color};">${point.type}</h4>
                    <div style="margin-bottom: 8px;"><strong>Status:</strong> ${point.value}</div>
                    <div style="font-size: 11px; color: #666;">Environmental monitoring active</div>
                </div>
            `);
            
            environmentalLayer.addLayer(marker);
        });
        
        layers.environmental = environmentalLayer;
    }
    
    map.addLayer(environmentalLayer);
    showNotification('Environmental data layer activated', 'success');
}

function closeAnalysisPanel() {
    document.getElementById('analysisPanel').style.display = 'none';
    clearAnalysisMarkers();
}

function showOptimizationResults(lat, lon) {
    closeAnalysisPanel();
    runOptimizationForPoint(lat, lon);
}

// =======================
// UI CONTROL FUNCTIONS
// =======================
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('collapsed');
    
    // Update toggle button
    const toggleBtn = document.querySelector('.toggle-sidebar i');
    if (sidebar.classList.contains('collapsed')) {
        toggleBtn.className = 'fas fa-chevron-right';
    } else {
        toggleBtn.className = 'fas fa-bars';
    }
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 10000;
        padding: 15px 25px;
        border-radius: 25px;
        color: white;
        font-weight: 500;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        backdrop-filter: blur(10px);
        animation: slideIn 0.3s ease;
        max-width: 400px;
        text-align: center;
    `;
    
    // Set background based on type
    switch(type) {
        case 'success':
            notification.style.background = 'linear-gradient(45deg, #4CAF50, #45a049)';
            break;
        case 'error':
            notification.style.background = 'linear-gradient(45deg, #f44336, #d32f2f)';
            break;
        case 'warning':
            notification.style.background = 'linear-gradient(45deg, #FF9800, #F57C00)';
            break;
        default:
            notification.style.background = 'linear-gradient(45deg, #2196F3, #1976D2)';
    }
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// =======================
// ADVANCED FEATURES
// =======================
function performClusterAnalysis() {
    // K-means clustering algorithm for optimal hub placement
    const demandPoints = [
        ...sampleInfrastructure.production,
        ...sampleInfrastructure.distribution
    ].map(item => ({ lat: item.lat, lng: item.lng, demand: item.capacity || 100 }));
    
    const k = 3; // Number of clusters
    const clusters = kmeansClustering(demandPoints, k);
    
    // Display cluster centers
    clusters.forEach((cluster, index) => {
        const center = calculateClusterCenter(cluster);
        const marker = L.marker([center.lat, center.lng], {
            icon: L.divIcon({
                className: 'cluster-marker',
                html: `<div style="background: #E91E63; color: white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-size: 14px; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.4); font-weight: bold;">C${index + 1}</div>`,
                iconSize: [34, 34],
                iconAnchor: [17, 17]
            })
        }).addTo(map);
        
        marker.bindPopup(`
            <div style="min-width: 180px;">
                <h3 style="margin: 0 0 10px 0; color: #E91E63;">Cluster Hub ${index + 1}</h3>
                <div style="margin-bottom: 8px;"><strong>Points Served:</strong> ${cluster.length}</div>
                <div style="margin-bottom: 8px;"><strong>Total Demand:</strong> ${cluster.reduce((sum, p) => sum + p.demand, 0)} MW</div>
                <div style="margin-bottom: 10px;"><strong>Recommended Hub Size:</strong> ${Math.ceil(cluster.reduce((sum, p) => sum + p.demand, 0) * 0.3)} MW</div>
            </div>
        `);
        
        currentAnalysisMarkers.push(marker);
    });
}

function kmeansClustering(points, k) {
    // Simplified K-means implementation
    let centroids = [];
    
    // Initialize centroids randomly
    for (let i = 0; i < k; i++) {
        centroids.push({
            lat: points[Math.floor(Math.random() * points.length)].lat,
            lng: points[Math.floor(Math.random() * points.length)].lng
        });
    }
    
    let clusters = [];
    
    // Perform clustering iterations
    for (let iter = 0; iter < 10; iter++) {
        clusters = Array(k).fill().map(() => []);
        
        // Assign points to nearest centroid
        points.forEach(point => {
            let minDist = Infinity;
            let clusterIndex = 0;
            
            centroids.forEach((centroid, index) => {
                const dist = calculateDistance(point, centroid);
                if (dist < minDist) {
                    minDist = dist;
                    clusterIndex = index;
                }
            });
            
            clusters[clusterIndex].push(point);
        });
        
        // Update centroids
        centroids = clusters.map(cluster => {
            if (cluster.length === 0) return centroids[0];
            return calculateClusterCenter(cluster);
        });
    }
    
    return clusters;
}

function calculateDistance(point1, point2) {
    const R = 6371; // Earth's radius in km
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLng = (point2.lng - point1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function calculateClusterCenter(cluster) {
    const center = {
        lat: cluster.reduce((sum, p) => sum + p.lat, 0) / cluster.length,
        lng: cluster.reduce((sum, p) => sum + p.lng, 0) / cluster.length
    };
    return center;
}

// =======================
// ROUTE OPTIMIZATION
// =======================
async function optimizeRoutes() {
    showNotification('Optimizing transport routes...', 'info');
    
    // Get all production and distribution points
    const productionPoints = sampleInfrastructure.production.filter(p => p.status === 'operational');
    const distributionPoints = sampleInfrastructure.distribution.filter(d => d.status === 'operational');
    
    // Clear existing route overlays
    map.eachLayer(layer => {
        if (layer.options && layer.options.className === 'optimized-route') {
            map.removeLayer(layer);
        }
    });
    
    // Calculate optimal routes between production and distribution
    for (let production of productionPoints) {
        for (let distribution of distributionPoints) {
            try {
                const routeData = await fetchRoute([production.lat, production.lng], [distribution.lat, distribution.lng]);
                
                if (routeData.coordinates) {
                    const routeLine = L.polyline(routeData.coordinates, {
                        color: '#00BCD4',
                        weight: 3,
                        opacity: 0.7,
                        dashArray: '5, 10',
                        className: 'optimized-route'
                    }).addTo(map);
                    
                    routeLine.bindPopup(`
                        <div style="min-width: 180px;">
                            <h4 style="margin: 0 0 8px 0; color: #00BCD4;">Optimized Route</h4>
                            <div style="margin-bottom: 5px;"><strong>From:</strong> ${production.name}</div>
                            <div style="margin-bottom: 5px;"><strong>To:</strong> ${distribution.name}</div>
                            <div style="margin-bottom: 5px;"><strong>Distance:</strong> ${routeData.distance} km</div>
                            <div><strong>Est. Time:</strong> ${Math.floor(routeData.duration / 60)} hours</div>
                        </div>
                    `);
                }
            } catch (error) {
                console.error('Route optimization error:', error);
            }
        }
    }
    
    showNotification('Route optimization complete!', 'success');
}

// =======================
// DATA EXPORT FUNCTIONS
// =======================
function exportData(format = 'json') {
    const exportData = {
        infrastructure: sampleInfrastructure,
        filters: activeFilters,
        optimizationResults: optimizationResults.map(marker => ({
            lat: marker.getLatLng().lat,
            lng: marker.getLatLng().lng
        })),
        timestamp: new Date().toISOString()
    };
    
    let content, filename;
    
    if (format === 'csv') {
        content = convertToCSV(exportData);
        filename = 'hydrogen_infrastructure_data.csv';
    } else {
        content = JSON.stringify(exportData, null, 2);
        filename = 'hydrogen_infrastructure_data.json';
    }
    
    downloadTextFile(filename, content);
    showNotification(`Data exported as ${format.toUpperCase()}`, 'success');
}

function convertToCSV(data) {
    let csv = 'Type,Name,Latitude,Longitude,Capacity,Status,Investment\n';
    
    // Add production data
    data.infrastructure.production.forEach(item => {
        csv += `Production,"${item.name}",${item.lat},${item.lng},${item.capacity},${item.status},${item.investment}\n`;
    });
    
    // Add storage data
    data.infrastructure.storage.forEach(item => {
        csv += `Storage,"${item.name}",${item.lat},${item.lng},${item.capacity},${item.status},N/A\n`;
    });
    
    // Add distribution data
    data.infrastructure.distribution.forEach(item => {
        csv += `Distribution,"${item.name}",${item.lat},${item.lng},${item.capacity},${item.status},N/A\n`;
    });
    
    return csv;
}

// =======================
// REAL-TIME DATA SIMULATION
// =======================
function simulateRealTimeData() {
    setInterval(() => {
        // Update production capacity randomly
        const totalCapacityElement = document.getElementById('totalCapacity');
        const currentCapacity = parseInt(totalCapacityElement.textContent.replace(',', ''));
        const newCapacity = currentCapacity + Math.floor(Math.random() * 10) - 5;
        totalCapacityElement.textContent = Math.max(1000, newCapacity).toLocaleString();
        
        // Update active projects count
        const activeElement = document.getElementById('activeProjects');
        const currentActive = parseInt(activeElement.textContent);
        const newActive = Math.max(50, currentActive + Math.floor(Math.random() * 6) - 3);
        activeElement.textContent = newActive;
        
        // Simulate data source status changes
        updateDataSourceStatus();
    }, 30000); // Update every 30 seconds
}

function updateDataSourceStatus() {
    const statusDots = document.querySelectorAll('.status-dot');
    statusDots.forEach(dot => {
        // Randomly change status (mostly stay online)
        const random = Math.random();
        if (random > 0.95) {
            dot.className = 'status-dot status-loading';
            dot.parentElement.querySelector('span').textContent = 'Loading';
        } else if (random > 0.98) {
            dot.className = 'status-dot status-offline';
            dot.parentElement.querySelector('span').textContent = 'Offline';
        } else {
            dot.className = 'status-dot status-online';
            dot.parentElement.querySelector('span').textContent = 'Online';
        }
    });
}

// =======================
// ADVANCED ANALYTICS
// =======================
function performDemandAnalysis() {
    showNotification('Analyzing hydrogen demand patterns...', 'info');
    
    // Simulate demand analysis
    setTimeout(() => {
        const demandHeatmap = [];
        const bounds = map.getBounds();
        
        // Generate demand heatmap data
        for (let i = 0; i < 20; i++) {
            const lat = bounds.getSouth() + Math.random() * (bounds.getNorth() - bounds.getSouth());
            const lng = bounds.getWest() + Math.random() * (bounds.getEast() - bounds.getWest());
            const intensity = Math.random();
            
            demandHeatmap.push([lat, lng, intensity]);
        }
        
        // Create heatmap overlay (simplified visualization)
        demandHeatmap.forEach(point => {
            const circle = L.circle([point[0], point[1]], {
                radius: 20000 * point[2],
                fillColor: point[2] > 0.7 ? '#FF5722' : point[2] > 0.4 ? '#FF9800' : '#4CAF50',
                color: 'transparent',
                fillOpacity: 0.3
            }).addTo(map);
            
            circle.bindPopup(`
                <div style="text-align: center;">
                    <h4 style="margin: 0 0 8px 0;">Demand Analysis</h4>
                    <div><strong>Demand Intensity:</strong> ${(point[2] * 100).toFixed(0)}%</div>
                    <div style="font-size: 11px; color: #666; margin-top: 5px;">
                        ${point[2] > 0.7 ? 'High Priority Area' : point[2] > 0.4 ? 'Medium Priority' : 'Low Priority'}
                    </div>
                </div>
            `);
            
            currentAnalysisMarkers.push(circle);
        });
        
        showNotification('Demand analysis complete! High-demand areas highlighted.', 'success');
    }, 2000);
}

function calculateSupplyChainEfficiency() {
    // Calculate efficiency metrics for current infrastructure
    const production = sampleInfrastructure.production.filter(p => p.status === 'operational');
    const storage = sampleInfrastructure.storage.filter(s => s.status === 'operational');
    const distribution = sampleInfrastructure.distribution.filter(d => d.status === 'operational');
    
    const metrics = {
        productionCapacity: production.reduce((sum, p) => sum + p.capacity, 0),
        storageCapacity: storage.reduce((sum, s) => sum + s.capacity, 0),
        distributionCapacity: distribution.reduce((sum, d) => sum + d.capacity, 0),
        efficiency: 0
    };
    
    // Simple efficiency calculation
    metrics.efficiency = Math.min(
        metrics.storageCapacity / metrics.productionCapacity * 100,
        metrics.distributionCapacity / metrics.productionCapacity * 100
    );
    
    showNotification(`Supply Chain Efficiency: ${metrics.efficiency.toFixed(1)}%`, 'info');
    
    return metrics;
}

// =======================
// COST OPTIMIZATION
// =======================
function optimizeInvestmentStrategy() {
    showNotification('Optimizing investment strategy...', 'info');
    
    setTimeout(() => {
        const strategy = {
            phase1: {
                priority: 'High',
                locations: ['Gujarat', 'Rajasthan'],
                investment: '₹500Cr',
                timeline: '2-3 years'
            },
            phase2: {
                priority: 'Medium',
                locations: ['Karnataka', 'Maharashtra'],
                investment: '₹350Cr',
                timeline: '3-5 years'
            },
            phase3: {
                priority: 'Low',
                locations: ['Andhra Pradesh', 'Tamil Nadu'],
                investment: '₹250Cr',
                timeline: '5-7 years'
            }
        };
        
        // Display strategy on map
        const strategyOverlay = L.control({ position: 'topleft' });
        strategyOverlay.onAdd = function() {
            const div = L.DomUtil.create('div', 'investment-strategy');
            div.style.cssText = `
                background: rgba(255, 255, 255, 0.95);
                padding: 15px;
                border-radius: 10px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                max-width: 300px;
                margin: 80px 0 0 20px;
            `;
            
            div.innerHTML = `
                <h4 style="margin: 0 0 10px 0; color: #333;">Investment Strategy</h4>
                <div style="font-size: 12px; line-height: 1.4;">
                    <div style="margin-bottom: 8px;"><strong>Phase 1:</strong> ${strategy.phase1.locations.join(', ')} - ${strategy.phase1.investment}</div>
                    <div style="margin-bottom: 8px;"><strong>Phase 2:</strong> ${strategy.phase2.locations.join(', ')} - ${strategy.phase2.investment}</div>
                    <div style="margin-bottom: 8px;"><strong>Phase 3:</strong> ${strategy.phase3.locations.join(', ')} - ${strategy.phase3.investment}</div>
                </div>
                <button onclick="this.parentElement.remove()" style="width: 100%; padding: 5px; background: #f44336; color: white; border: none; border-radius: 5px; cursor: pointer; margin-top: 10px; font-size: 11px;">Close</button>
            `;
            
            return div;
        };
        
        strategyOverlay.addTo(map);
        showNotification('Investment strategy analysis complete!', 'success');
    }, 2500);
}

// =======================
// PERFORMANCE MONITORING
// =======================
function monitorSystemPerformance() {
    const performanceData = {
        mapLoadTime: performance.now(),
        markersCount: Object.values(layers).reduce((count, layer) => {
            return count + (layer.getLayers ? layer.getLayers().length : 0);
        }, 0),
        memoryUsage: performance.memory ? performance.memory.usedJSHeapSize : 'N/A',
        activeFilters: Object.keys(activeFilters).filter(key => activeFilters[key] !== 'all').length
    };
    
    console.log('Platform Performance Metrics:', performanceData);
    
    // Update performance indicator
    if (performanceData.markersCount > 100) {
        showNotification('High marker count detected. Consider using clustering for better performance.', 'warning');
    }
}

// =======================
// INTEGRATION FUNCTIONS
// =======================
function integrateWithBackend() {
    // Function to sync with backend database
    // In real implementation, this would handle CRUD operations
    
    const syncData = {
        infrastructure: sampleInfrastructure,
        filters: activeFilters,
        userActions: {
            searchQueries: [], // Would track user searches
            analysisRequests: [], // Would track analysis requests
            optimizationRuns: [] // Would track optimization runs
        }
    };
    
    // Mock API call to backend
    console.log('Syncing with backend:', syncData);
    showNotification('Data synchronized with backend', 'success');
}

function handleAPIError(error, context) {
    console.error(`API Error in ${context}:`, error);
    
    // Show user-friendly error message
    showNotification(`${context} temporarily unavailable. Using cached data.`, 'warning');
    
    // Implement fallback behavior
    return null;
}

// =======================
// INITIALIZATION AND STARTUP
// =======================
// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    try {
        // Initialize map
        map = L.map('map').setView([20.5937, 78.9629], 5);
        
        // Add base tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18
        }).addTo(map);
        
        // Initialize platform
        initializeMap();
        
        // Start real-time data simulation
        simulateRealTimeData();
        
        // Monitor performance
        setTimeout(monitorSystemPerformance, 5000);
        
        console.log('Green Hydrogen Platform initialized successfully');
        showNotification('Platform ready! Click anywhere on the map for site analysis.', 'success');
        
    } catch (error) {
        console.error('Platform initialization error:', error);
        document.getElementById('map').innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; flex-direction: column; color: white; font-size: 18px; text-align: center; padding: 20px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 20px; color: #f44336;"></i>
                <div>Platform initialization failed</div>
                <div style="font-size: 14px; margin-top: 10px; opacity: 0.8;">Please refresh the page and try again</div>
            </div>
        `;
    }
});

// =======================
// CSS ANIMATIONS (to be added to your CSS)
// =======================
const additionalCSS = `
@keyframes fadeOut {
    from { opacity: 1; transform: translateX(-50%) translateY(0); }
    to { opacity: 0; transform: translateX(-50%) translateY(-20px); }
}

.custom-marker {
    transition: all 0.3s ease;
}

.custom-marker:hover {
    transform: scale(1.2);
}

.analysis-marker {
    animation: pulse 2s infinite;
}

.cluster-marker {
    animation: bounce 2s infinite;
}

@keyframes bounce {
    0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
    40% { transform: translateY(-10px); }
    60% { transform: translateY(-5px); }
}

.investment-strategy {
    animation: slideInRight 0.5s ease;
}
`;

// Add additional CSS dynamically
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalCSS;
document.head.appendChild(styleSheet);

// =======================
// EXPORT GLOBAL FUNCTIONS
// =======================
// Make sure these functions are available globally
window.toggleSidebar = toggleSidebar;
window.clearSearch = clearSearch;
window.runOptimization = runOptimization;
window.generateReport = generateReport;
window.analyzeEnvironmental = analyzeEnvironmental;
window.analyzeLocation = analyzeLocation;
window.closeAnalysisPanel = closeAnalysisPanel;
window.showOptimizationResults = showOptimizationResults;
window.selectLocation = selectLocation;
window.runOptimizationForPoint = runOptimizationForPoint;

// Additional utility functions for advanced features
window.performClusterAnalysis = performClusterAnalysis;
window.optimizeRoutes = optimizeRoutes;
window.performDemandAnalysis = performDemandAnalysis;
window.optimizeInvestmentStrategy = optimizeInvestmentStrategy;
window.exportData = exportData;
window.integrateWithBackend = integrateWithBackend;

console.log('Green Hydrogen Infrastructure Platform v2.0 loaded successfully');