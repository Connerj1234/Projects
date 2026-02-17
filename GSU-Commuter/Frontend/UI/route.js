// atlanta campus buildings and parking decks
const atlantaLocations = {
  "Aderhold Learning Center": {
    coordinates: { lat: 33.7490, lng: -84.3880 },
    address: "30 Pryor Street SW, Atlanta, GA 30303"
  },
  "Andrew Young School": {
    coordinates: { lat: 33.7495, lng: -84.3885 },
    address: "14 Marietta Street NW, Atlanta, GA 30303"
  },
  "Arts & Humanities Building": {
    coordinates: { lat: 33.7492, lng: -84.3878 },
    address: "25 Park Place NE, Atlanta, GA 30303"
  },
  "College of Law": {
    coordinates: { lat: 33.7498, lng: -84.3882 },
    address: "85 Park Place NE, Atlanta, GA 30303"
  },
  "Library North": {
    coordinates: { lat: 33.7493, lng: -84.3875 },
    address: "100 Decatur Street SE, Atlanta, GA 30303"
  },
  "Library South": {
    coordinates: { lat: 33.7491, lng: -84.3876 },
    address: "100 Decatur Street SE, Atlanta, GA 30303"
  },
  "Petit Science Center": {
    coordinates: { lat: 33.7494, lng: -84.3883 },
    address: "100 Piedmont Avenue SE, Atlanta, GA 30303"
  },
  "Student Center": {
    coordinates: { lat: 33.7496, lng: -84.3879 },
    address: "55 Gilmer Street SE, Atlanta, GA 30303"
  },
  "Urban Life Building": {
    coordinates: { lat: 33.7497, lng: -84.3881 },
    address: "140 Decatur Street SE, Atlanta, GA 30303"
  },
  "T Deck": {
    coordinates: { lat: 33.7555, lng: -84.3871 },
    address: "43 Auburn Ave NE, Atlanta, GA 30303"
  },
  "G Deck": {
    coordinates: { lat: 33.7520, lng: -84.3876 },
    address: "121 Collins St, Atlanta, GA 30303"
  },
  "K Deck": {
    coordinates: { lat: 33.7511, lng: -84.3841 },
    address: "99 Gilmer Street, Atlanta, GA 30303"
  },
  "N Deck": {
    coordinates: { lat: 33.7517, lng: -84.3835 },
    address: "99 Gilmer Street, Atlanta, GA 30303"
  },
  "S Deck": {
    coordinates: { lat: 33.7517, lng: -84.3835 },
    address: "99 Gilmer Street, Atlanta, GA 30303"
  }
};

let map;
let directionsService;
let directionsRenderer;
let isMapInitialized = false;

function initMap() {
  map = new google.maps.Map(document.getElementById('map-container'), {
    center: { lat: 33.7490, lng: -84.3880 },
    zoom: 16
  });

  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer({
    map: map
  });
  
  isMapInitialized = true;
  resetDropdowns();
  loadSelectedRoute(); 
  localStorage.removeItem('selectedRoute');
}

function updateEndLocations() {
  const startLocation = document.getElementById('start-location').value;
  const endLocationSelect = document.getElementById('end-location');
  
  endLocationSelect.innerHTML = '<option value="">Select End Location</option>';
  
  Object.entries(atlantaLocations).forEach(([key, location]) => {
    if (key !== startLocation) {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = key;
      endLocationSelect.appendChild(option);
    }
  });
}

async function handleLocationSelect(locationType) {
  const select = document.getElementById(`${locationType}-location`);
  const selectedValue = select.value;
}

async function planRoute() {
  try {
    if (!isMapInitialized) {
      alert("Map not initialized");
      return;
    }

    const startLocation = document.getElementById('start-location').value;
    const endLocation = document.getElementById('end-location').value;
    const transitType = document.getElementById('transit-type').value;

    if (!startLocation || !endLocation) {
      alert('Select both locations');
      return;
    }

    let start, end;
    start = atlantaLocations[startLocation];
    end = atlantaLocations[endLocation];
    
    let travelMode = google.maps.TravelMode.WALKING;
    switch (transitType) {
      case 'bus':
      case 'marta':
        travelMode = google.maps.TravelMode.TRANSIT;
        break;
      case 'walk':
        travelMode = google.maps.TravelMode.WALKING;
        break;
    }

    const request = {
      origin: start.address,
      destination: end.address,
      travelMode: travelMode
    };

    directionsService.route(request, (result, status) => {
      if (status === 'OK') {
        directionsRenderer.setDirections(result);
        displayRouteDetails(result);
        const routeResults = document.getElementById('route-results');
        routeResults.classList.add('visible');
        routeResults.scrollIntoView({ behavior: 'smooth' });
      } else {
        alert('Could not find a route');
      }
    });
  } catch (error) {
    alert('Something went wrong');
  }
}

function displayRouteDetails(result) {
  try {
    const route = result.routes[0];
    const leg = route.legs[0];
    
    const instructionsDiv = document.getElementById('route-instructions');
    instructionsDiv.innerHTML = '<h3>Directions:</h3>';
    
    leg.steps.forEach((step, index) => {
      const stepDiv = document.createElement('div');
      stepDiv.innerHTML = `
        <p><strong>${index + 1}.</strong> ${step.instructions}</p>
        <p class="step-distance">${step.distance.text} - ${step.duration.text}</p>
      `;
      instructionsDiv.appendChild(stepDiv);
    });

    const summaryDiv = document.getElementById('route-summary');
    summaryDiv.innerHTML = `
      <h3>Route Summary</h3>
      <p><strong>Total Distance:</strong> ${leg.distance.text}</p>
      <p><strong>Estimated Time:</strong> ${leg.duration.text}</p>
      <p><strong>Start Address:</strong> ${leg.start_address}</p>
      <p><strong>End Address:</strong> ${leg.end_address}</p>
    `;
  } catch (error) {
    alert('cant show the route details');
  }
}

function resetDropdowns() {
  console.log('resetting dropdowns');
  const startLocationSelect = document.getElementById('start-location');
  const endLocationSelect = document.getElementById('end-location');
  const transitTypeSelect = document.getElementById('transit-type');
  const routeResults = document.getElementById('route-results');
  
  startLocationSelect.value = '';
  
  endLocationSelect.innerHTML = '<option value="">Select End Location</option>';
  Object.keys(atlantaLocations).forEach(location => {
    const option = document.createElement('option');
    option.value = location;
    option.textContent = location;
    endLocationSelect.appendChild(option);
  });
  
  transitTypeSelect.value = 'walk';
  transitTypeSelect.dispatchEvent(new Event('change'));

  routeResults.classList.remove('visible');
  if (directionsRenderer) {
    directionsRenderer.setDirections({ routes: [] });
  }
}



function saveRoute() {
  let token = sessionStorage.getItem('token');
  if (!token) {
      token = localStorage.getItem('token');
  }
  if (!token) {
      alert('You must be logged in to save a route');
      return;
  }
    const startLocation = document.getElementById('start-location').value;
    const endLocation = document.getElementById('end-location').value;
    const transitType = document.getElementById('transit-type').value;
    const name = `${startLocation} to ${endLocation}`;
    const route = {
        name: name,
        start: startLocation,
        end: endLocation,
        transitType: transitType
    };
    const routeJSON = JSON.stringify(route);
    addSavedRoute(routeJSON);
    window.location.href = 'saved-routes.html';
}

function addSavedRoute(routeJSON) {
  if (!localStorage.getItem('savedRoutes')) {
      localStorage.setItem('savedRoutes', JSON.stringify([]));
  }
  let token = sessionStorage.getItem('token');
  if (!token) {
      token = localStorage.getItem('token');
  }
  const savedRoutes = JSON.parse(localStorage.getItem('savedRoutes'));
  const routeWithToken = {
      route: routeJSON,
      token: token
  };
  savedRoutes.push(routeWithToken);
  localStorage.setItem('savedRoutes', JSON.stringify(savedRoutes));
}

function loadSelectedRoute() {
    const selectedRoute = localStorage.getItem('selectedRoute');
    console.log(`loading selected route ${selectedRoute}`);
    if (selectedRoute) {
        console.log('loading selected route');
        const route = JSON.parse(selectedRoute);
        console.log('Start Location:', route.start);
        console.log('End Location:', route.end);
        console.log('Transit Type:', route.transitType);
        // set transit types to correct values
        if (route.transitType === 'Walking') {
          route.transitType = 'walk';
        } else if (route.transitType === 'MARTA + Walking') {
          route.transitType = 'marta';
        }
        else if (route.transitType === 'Bus') {
          route.transitType = 'bus';
        }
        document.getElementById('start-location').value = route.start;
        document.getElementById('end-location').value = route.end;
        document.getElementById('transit-type').value = route.transitType;
        planRoute();
    } else {
        resetDropdowns();
    }
}

window.onload = function() {
    console.log('loaded page');
    console.log(`got route ${localStorage.getItem('selectedRoute')}`);
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyCLGt6MAIFv2ePOaHat5R7SiUUR-2RkmWk&libraries=places&callback=initMap`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
    // initmap is called after the maps script is loaded
}; 