// on load, get routes
window.onload = function() {
    loadedRoutes = getSavedRoutes();
    console.log('Loaded routes:', loadedRoutes);
    const token = sessionStorage.getItem('token');
    if (!token) {
        token = localStorage.getItem('token');
    }
    const routes = loadedRoutes.map(route => {
        const routeData = JSON.parse(route);
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
        routesList.innerHTML = '<div class="saved-route-item"><div class="route-details"><h3>No saved routes found.</h3></div></div>';
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
                <button class="btn-small delete" onclick="queueDeleteRoute(${index})">Delete</button>
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
        localStorage.setItem('selectedRoute', route);
        window.location.href = 'route.html';
    }
}


function queueDeleteRoute(index) {
    console.log('Deleting route at index:', index);
    let token = sessionStorage.getItem('token');
    if (!token) {
        token = localStorage.getItem('token');
    }
    deleteRoute(loadedRoutes[index]);
    window.location.href = 'saved-routes.html';
}


function deleteRoute(routeJSON) {
    console.log('Deleting route:', routeJSON);
    console.log('From:', loadedRoutes);
    let token = sessionStorage.getItem('token');
    if (!token) {
        token = localStorage.getItem('token');
    }
    let savedRoutes = JSON.parse(localStorage.getItem('savedRoutes'));
    // delete route with same token and route jsong as current token
    for (let i = 0; i < savedRoutes.length; i++) {
        if (savedRoutes[i].token === token && savedRoutes[i].route === routeJSON) {
            savedRoutes.splice(i, 1);
            break;
        }
    }

    localStorage.setItem('savedRoutes', JSON.stringify(savedRoutes));

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