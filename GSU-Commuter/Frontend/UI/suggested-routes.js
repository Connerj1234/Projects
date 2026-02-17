// on load, get routes
window.onload = function() {
    loadedRoutes = getSuggestedRoutes();
    console.log('Loaded routes:', loadedRoutes);
    const token = sessionStorage.getItem('token');
    if (!token) {
        token = localStorage.getItem('token');
    }
    const routes = loadedRoutes.map(route => {
        console.log('Route:', route);
        const routeData = route;
        return {
            name: routeData.name,
            start: routeData.start,
            end: routeData.end,
            transitType: routeData.transitType
        };
    }
    );
    displayRoutes(routes);
}

function displayRoutes(routes) {
    const routesList = document.querySelector('.saved-routes-list');
    routesList.innerHTML = '';

    if (routes.length === 0) {
        routesList.innerHTML = '<div class="saved-route-item"><div class="route-details"><h3>No suggested routes. Try saving some routes first.</h3></div></div>';
        return;
    }

    routes.forEach((route, index) => {
        const routeElement = createRouteElement(route, index);
        routesList.appendChild(routeElement);
    });
}

function createRouteElement(route, index) {
    const div = document.createElement('div');
    div.className = 'saved-route-item';
    // convert transit type to displayable string
    if (route.transitType === 'bus') {
        route.transitType = 'Bus';
    } else if (route.transitType === 'walk') {
        route.transitType = 'Walking';
    } else if (route.transitType === 'marta') {
        route.transitType = 'MARTA + Walking';
    }

    div.innerHTML = `
        <div class="route-header">
            <h3>${route.name}</h3>
            <div class="route-actions">
                <button class="btn-small" onclick="loadRoute(${index})">Load</button>
            </div>
        </div>
        <div class="route-details">
            <p><strong>From:</strong> ${route.start}</p>
            <p><strong>To:</strong> ${route.end}</p>
            <p><strong>Transit Type:</strong> ${route.transitType}</p>
        </div>
    `;

    return div;
}

function loadRoute(index) {
    console.log('Loading route at index:', index);
    // do not get token, just get route
    let route = loadedRoutes[index];
    console.log('Route:', route);
    
    if (route) {
        // store in local storage
        const routeJSON = JSON.stringify(route);
        localStorage.setItem('selectedRoute', routeJSON);
        window.location.href = 'route.html';
    }
}

function getSavedRoutes() {
    let token = sessionStorage.getItem('token');
    if (!token) {
        token = localStorage.getItem('token');
    }
    const savedRoutes = JSON.parse(localStorage.getItem('savedRoutes'));
    const filteredRoutes = savedRoutes.filter(route => route.token === token);
    const routes = filteredRoutes.map(route => route.route);
    return routes;
}

// suggest 5 routes based on other routes (most common starting points and end points)
// and routes that other users who have similar routes saved
function getSuggestedRoutes() {
    let suggestedRoutes = [];
    let token = sessionStorage.getItem('token');
    if (!token) {
        token = localStorage.getItem('token');
    }
    const allRoutes = JSON.parse(localStorage.getItem('savedRoutes'));
    const userRoutes = allRoutes
        .filter(route => route.token === token)
        .map(route => JSON.parse(route.route));
    const otherUsersRoutes = otherUserRoutes();
    const commonStartingPoint = mostCommonStartingPoint(userRoutes);
    console.log('common starting point:', commonStartingPoint);
    const commonEndPoint = mostCommonEndPoint(userRoutes);
    console.log('common end point:', commonEndPoint);
    const similarUsers = getSimilarUsers(userRoutes);
    const similarUserRoutes = getSimilarUserRoutes(similarUsers);
    console.log('similar user routes:', similarUserRoutes);

    // calculate suggested routes based on all the previous criteria and some randomization
    const atlantaLocationKeys = Object.keys(atlantaLocations);

    if (commonStartingPoint.length > 0) {
        let randomEndPoint;
        do {
            randomEndPoint = atlantaLocationKeys[Math.floor(Math.random() * atlantaLocationKeys.length)];
        } while (randomEndPoint === commonStartingPoint[0]);
        suggestedRoutes.push({
            name: `${commonStartingPoint[0]} to ${randomEndPoint}`,
            start: commonStartingPoint[0],
            end: randomEndPoint,
            transitType: 'walk'
        });
    }
    if (commonEndPoint.length > 0) {
        let randomStartPoint;
        do {
            randomStartPoint = atlantaLocationKeys[Math.floor(Math.random() * atlantaLocationKeys.length)];
        } while (randomStartPoint === commonEndPoint[0]);
        suggestedRoutes.push({
            name: `${randomStartPoint} to ${commonEndPoint[0]}`,
            start: randomStartPoint,
            end: commonEndPoint[0],
            transitType: 'walk'
        });
    }
    if (similarUserRoutes.length > 0) {
        for (let i = 0; i < 2; i++) {
            const randomRoute = similarUserRoutes[Math.floor(Math.random() * similarUserRoutes.length)];
            console.log('similar user route:', randomRoute);
            const routeData = JSON.parse(randomRoute);
            suggestedRoutes.push({
                name: `${routeData.start} to ${routeData.end}`,
                start: routeData.start,
                end: routeData.end,
                transitType: routeData.transitType
            });
        }
    }
    if (otherUsersRoutes.length > 0) {
        const randomRoute = otherUsersRoutes[Math.floor(Math.random() * otherUsersRoutes.length)];
        console.log('random route:', randomRoute);
        const routeData = JSON.parse(randomRoute.route);
        suggestedRoutes.push({
            name: `${routeData.start} to ${routeData.end}`,
            start: routeData.start,
            end: routeData.end,
            transitType: routeData.transitType
        });
    }

    return suggestedRoutes;
}


function mostCommonStartingPoint(routes) {
    if (routes.length === 0) {
        return [];
    }
    let startingPoints = {};
    routes.forEach(route => {
        console.log('route:', route);
        if (route.start === undefined) {
            console.log('route.start is undefined');
            return;
        }
        if (startingPoints[route.start]) {
            startingPoints[route.start]++;
        } else {
            startingPoints[route.start] = 1;
        }
    });
    // sort by most common starting point
    startingPoints = Object.entries(startingPoints).sort((a, b) => b[1] - a[1]);
    console.log('starting points:', startingPoints);
    return startingPoints.slice(0, 1).map(point => point[0]);
}

function mostCommonEndPoint(routes) {
    if (routes.length === 0) {
        return [];
    }
    let endPoints = {};
    routes.forEach(route => {
        if (endPoints[route.end]) {
            endPoints[route.end]++;
        } else {
            endPoints[route.end] = 1;
        }
    });
    // sort by most common end point
    endPoints = Object.entries(endPoints).sort((a, b) => b[1] - a[1]);
    return endPoints.slice(0, 1).map(point => point[0]);
}

function otherUserRoutes() {
    let otherUserRoutes = [];
    let token = sessionStorage.getItem('token');
    if (!token) {
        token = localStorage.getItem('token');
    }
    const allRoutes = JSON.parse(localStorage.getItem('savedRoutes'));
    allRoutes.forEach(route => {
        if (route.token !== token) {
            otherUserRoutes.push(route);
        }
    });
    return otherUserRoutes;
}
// get tokens of other users that have similar routes
function getSimilarUsers(routes) {
    let similarUsers = [];
    let token = sessionStorage.getItem('token');
    if (!token) {
        token = localStorage.getItem('token');
    }
    const allRoutes = JSON.parse(localStorage.getItem('savedRoutes'));
    allRoutes.forEach(route => {
        if (route.token !== token) {
            const parsedRoute = JSON.parse(route.route);
            routes.forEach(userRoute => {
                if (
                    parsedRoute.name === userRoute.name &&
                    parsedRoute.start === userRoute.start &&
                    parsedRoute.end === userRoute.end &&
                    parsedRoute.transitType === userRoute.transitType
                ) {
                    similarUsers.push(route.token);
                }
            });
        }
    });
    // unduplicate same users
    return [...new Set(similarUsers)];
}
// get routes of other users that have similar routes
function getSimilarUserRoutes(similarUsers) {
    let similarUserRoutes = [];
    let token = sessionStorage.getItem('token');
    if (!token) {
        token = localStorage.getItem('token');
    }
    const allRoutes = JSON.parse(localStorage.getItem('savedRoutes'));
    allRoutes.forEach(route => {
        if (similarUsers.includes(route.token)) {
            similarUserRoutes.push(route.route);
        }
    });
    return similarUserRoutes;
}



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