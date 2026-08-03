function toggleSidebar() {
    var sb = document.querySelector('.sidebar');
    sb.classList.toggle('collapsed');
    document.getElementById('sidebarToggle').style.display = sb.classList.contains('collapsed') ? 'flex' : 'none';
}
function toggleTripPlanner() {
    var body = document.getElementById('tripPlannerBody');
    var arrow = document.getElementById('tripPlannerArrow');
    body.classList.toggle('collapsed');
    arrow.classList.toggle('rotated');
}
var routeColors = [
    '#e6194b', '#3cb44b', '#4363d8', '#f58231', '#911eb4',
    '#42d4f4', '#f032e6', '#469990', '#9A6324', '#800000',
    '#aaffc3', '#000075', '#a9a9a9', '#fabebe', '#008080',
    '#e6beff', '#ffe119', '#dcbeff', '#ff6961'
];

// Initialize map centered on MetroWest Boston
var map = L.map('map', {
    preferCanvas: true,
    minZoom: 10
}).setView([42.30, -71.45], 12);

var osmDefault = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors | MWRTA GTFS Data',
    maxZoom: 18
});

var cartoVoyager = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO | MWRTA GTFS Data',
    maxZoom: 19
});

var cartoLight = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO | MWRTA GTFS Data',
    maxZoom: 19
});

var cartoDark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO | MWRTA GTFS Data',
    maxZoom: 19
});

var cartoVoyagerInverted = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO | MWRTA GTFS Data',
    maxZoom: 19,
    className: 'inverted-tiles'
});

var currentTileLayer = cartoVoyager;
currentTileLayer.addTo(map);

var layerControl = L.control.layers({
    'Clean (recommended)': cartoVoyager,
    'Minimal': cartoLight,
    'Inverted': cartoVoyagerInverted,
    'Dark': cartoDark,
    'Detailed (OSM)': osmDefault
}, null, {position: 'topright'}).addTo(map);


// Theme cycling: light → dark → evil
var themeMode = 'light'; // 'light', 'dark', 'evil'
var themeOrder = ['light', 'dark', 'evil'];
var themeIcons = { light: '&#9790;', dark: '&#128520;', evil: '&#9788;' };
var themeTiles = { light: cartoVoyager, dark: cartoVoyagerInverted, evil: cartoDark };
function toggleTheme() {
    var idx = themeOrder.indexOf(themeMode);
    themeMode = themeOrder[(idx + 1) % themeOrder.length];
    document.documentElement.setAttribute('data-theme', themeMode === 'light' ? '' : themeMode);
    document.getElementById('theme-btn').innerHTML = themeIcons[themeMode];
    document.getElementById('theme-btn').title = themeMode === 'light' ? 'Switch to dark mode' : themeMode === 'dark' ? 'Switch to evil mode' : 'Switch to light mode';
    map.removeLayer(currentTileLayer);
    currentTileLayer = themeTiles[themeMode];
    currentTileLayer.addTo(map);
    updateTripPanelTheme();
}

function updateTripPanelTheme() {
    var panel = document.getElementById('trip-panel');
    if (panel) panel.style.display = panel.style.display;
}

// Trip Planner control (top right)
var TripControl = L.Control.extend({
    options: {position: 'topright'},
    onAdd: function(map) {
        var container = L.DomUtil.create('div');
        container.innerHTML = '<div class="leaflet-bar" id="trip-panel" style="background:var(--bg-primary);color:var(--text-primary);padding:12px;border-radius:var(--radius);width:260px;box-shadow:var(--shadow);border:1px solid var(--border);">' +
            '<div style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;" id="trip-panel-header">' +
            '<h3 style="margin:0;font-size:14px;color:var(--text-primary);"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#27ae60;margin-right:4px;animation:pulse 2s infinite;"></span>Trip Planner</h3>' +
            '<div style="display:flex;align-items:center;gap:2px;margin-right:1px;">' +
            '<a id="trip-hide-btn" href="#" title="Hide trip route" style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:6px;opacity:0.35;pointer-events:none;color:var(--text-primary);text-decoration:none;transition:background 0.15s;box-shadow:0 1px 3px rgba(0,0,0,0.12);">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>' +
            '</svg></a>' +
            '<a id="trip-trash-btn" href="#" title="Clear trip" style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:6px;opacity:0.35;pointer-events:none;color:var(--text-primary);text-decoration:none;transition:background 0.15s;box-shadow:0 1px 3px rgba(0,0,0,0.12);">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>' +
            '<path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>' +
            '</svg></a>' +
            '</div>' +
            '<span id="trip-panel-arrow" style="font-size:12px;color:var(--text-muted);transition:transform 0.2s;">&#9660;</span>' +
            '</div>' +
            '<div id="trip-panel-body" style="margin-top:10px;">' +
            '<label style="font-size:11px;color:var(--text-secondary);display:block;margin-bottom:3px;">From</label>' +
            '<div style="position:relative;margin-bottom:4px;background:var(--bg-secondary);border-radius:var(--radius-sm);">' +
            '<input type="text" id="trip-address" placeholder="Type an address or location..." autocomplete="off" style="width:100%;box-sizing:border-box;padding:6px 8px;font-size:12px;border:1px solid var(--border);border-radius:var(--radius-sm);background:transparent;color:var(--text-primary);font-family:inherit;position:relative;z-index:0;">' +
            '<div id="trip-address-ghost" style="position:absolute;top:0;left:0;right:0;padding:6px 8px;font-size:12px;font-family:inherit;color:var(--text-muted);opacity:0.5;pointer-events:none;white-space:nowrap;overflow:hidden;z-index:1;"></div>' +
            '</div>' +
            '<div style="display:flex;justify-content:center;margin-bottom:-18px;">' +
            '<button id="trip-swap-btn" title="Swap start and destination" style="display:flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:5px;border:1px solid var(--border);background:var(--bg-secondary);color:var(--text-primary);cursor:pointer;transition:background 0.15s;padding:0;position:relative;z-index:2;">' +
            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M4 17h12l-4 4"/><path d="M20 7H8l4-4"/>' +
            '</svg>' +
            '</button>' +
            '</div>' +
            '<label style="font-size:11px;color:var(--text-secondary);display:block;margin-bottom:3px;">To</label>' +
            '<div style="position:relative;margin-bottom:10px;background:var(--bg-secondary);border-radius:var(--radius-sm);">' +
            '<input type="text" id="trip-dest" placeholder="Type an address or stop name..." value="" autocomplete="off" style="width:100%;box-sizing:border-box;padding:6px 8px;font-size:12px;border:1px solid var(--border);border-radius:var(--radius-sm);background:transparent;color:var(--text-primary);font-family:inherit;position:relative;z-index:0;">' +
            '<div id="trip-dest-ghost" style="position:absolute;top:0;left:0;right:0;padding:6px 8px;font-size:12px;font-family:inherit;color:var(--text-muted);opacity:0.5;pointer-events:none;white-space:nowrap;overflow:hidden;z-index:1;"></div>' +
            '</div>' +
            '<div style="display:flex;gap:8px;align-items:center;margin-bottom:10px;">' +
            '<select id="trip-mode" style="padding:5px 4px;font-size:11px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg-secondary);color:var(--text-primary);font-family:inherit;">' +
            '<option value="arrive">Arrive by</option>' +
            '<option value="depart">Depart at</option>' +
            '</select>' +
            '<input type="time" id="trip-time" value="09:00" style="flex:1;padding:6px;font-size:12px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg-secondary);color:var(--text-primary);font-family:inherit;">' +
            '<button class="btn" style="margin:0;flex:0 0 auto;padding:6px 10px;" onclick="var n=new Date();document.getElementById(\'trip-time\').value=String(n.getHours()).padStart(2,\'0\')+\':\'+String(n.getMinutes()).padStart(2,\'0\');planTrip();" title="Reset to now">Now</button>' +
            '</div>' +
            '<button class="btn" id="trip-btn" style="width:100%;padding:9px;background:var(--accent);color:white;border-color:var(--accent);font-weight:600;">Find Routes</button>' +
            '<div id="trip-result" style="margin-top:12px;font-size:11px;max-height:300px;overflow-y:auto;color:var(--text-primary);"></div>' +
            '<div id="trip-clear-wrap" style="display:none;margin-top:8px;">' +
            '<button class="btn" id="trip-clear-btn" style="width:100%;background:#e6194b;color:white;border-color:#e6194b;padding:9px;border-radius:var(--radius-sm);font-weight:600;">Clear &amp; Show All Routes</button>' +
            '</div>' +
            '</div>' +
            '</div>';
        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);
        return container;
    }
});
new TripControl().addTo(map);
document.getElementById('trip-btn').addEventListener('click', planTrip);
document.getElementById('trip-clear-btn').addEventListener('click', clearTrip);
document.getElementById('trip-swap-btn').addEventListener('click', function() {
    var addrEl = document.getElementById('trip-address');
    var destEl = document.getElementById('trip-dest');
    var tmp = addrEl.value;
    addrEl.value = destEl.value;
    destEl.value = tmp;
    document.getElementById('trip-address-ghost').innerHTML = '';
    document.getElementById('trip-dest-ghost').innerHTML = '';
});
document.getElementById('trip-address').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') planTrip();
});
document.getElementById('trip-dest').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') planTrip();
});
document.getElementById('trip-panel-header').addEventListener('click', function() {
    var body = document.getElementById('trip-panel-body');
    var arrow = document.getElementById('trip-panel-arrow');
    if (body.style.display === 'none') {
        body.style.display = '';
        arrow.style.transform = '';
    } else {
        body.style.display = 'none';
        arrow.style.transform = 'rotate(-90deg)';
    }
});

// Stop name autocomplete
var stopNamesList = Object.values(stopLookup).map(function(s) { return s.name; });
stopNamesList.sort();

function findStopAutocomplete(typed) {
    if (!typed || typed.length < 2) return '';
    var lower = typed.toLowerCase();
    for (var i = 0; i < stopNamesList.length; i++) {
        if (stopNamesList[i].toLowerCase().indexOf(lower) === 0) {
            return stopNamesList[i];
        }
    }
    return '';
}

function setupAutocomplete(inputId, ghostId) {
    var input = document.getElementById(inputId);
    var ghost = document.getElementById(ghostId);
    var currentSuggestion = '';

    function updateGhost() {
        var val = input.value;
        var match = findStopAutocomplete(val);
        if (match && val.length > 0) {
            var remainder = match.substring(val.length);
            ghost.innerHTML = '<span style="visibility:hidden;pointer-events:none;">' + val + '</span><span class="ghost-suggestion" style="cursor:pointer;pointer-events:auto;">' + remainder + '</span>';
            ghost.style.pointerEvents = 'none';
            currentSuggestion = match;
        } else {
            ghost.innerHTML = '';
            currentSuggestion = '';
        }
    }

    input.addEventListener('input', updateGhost);

    input.addEventListener('keydown', function(e) {
        if (e.key === 'Tab' && currentSuggestion) {
            e.preventDefault();
            input.value = currentSuggestion;
            ghost.innerHTML = '';
            currentSuggestion = '';
        }
    });

    input.addEventListener('blur', function(e) {
        setTimeout(function() { ghost.innerHTML = ''; currentSuggestion = ''; }, 150);
    });

    input.addEventListener('focus', updateGhost);

    ghost.addEventListener('click', function(e) {
        if (e.target.classList.contains('ghost-suggestion') && currentSuggestion) {
            input.value = currentSuggestion;
            ghost.innerHTML = '';
            currentSuggestion = '';
            input.focus();
        }
    });
}

setupAutocomplete('trip-address', 'trip-address-ghost');
setupAutocomplete('trip-dest', 'trip-dest-ghost');

// Sort routes by short_name
var sortedRoutes = Object.keys(routeInfo).sort(function(a, b) {
    var na = routeInfo[a].short_name, nb = routeInfo[b].short_name;
    var numA = parseInt(na), numB = parseInt(nb);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    if (!isNaN(numA)) return -1;
    if (!isNaN(numB)) return 1;
    return na.localeCompare(nb);
});

var routeLayers = {};
var routeActive = {};
var routeLabelsLayer = L.layerGroup();
var selectedRouteId = null;
var tripActive = false;

// Build route list and layers
var listEl = document.getElementById('route-list');
sortedRoutes.forEach(function(routeId, idx) {
    var info = routeInfo[routeId];
    var color = routeColors[idx % routeColors.length];
    var shapeId = bestShapes[routeId];
    var vcKey = (typeof vcRouteData !== 'undefined' && vcRouteData['RT' + info.short_name]) ? 'RT' + info.short_name : info.short_name;
    var hasVcData = typeof vcRouteData !== 'undefined' && vcRouteData[vcKey] && vcRouteData[vcKey].length > 1;

    var group = L.layerGroup();
    var shape0Id = routeShapesDir[routeId + '_0'];
    var shape1Id = routeShapesDir[routeId + '_1'];
    var fallbackShapeId = bestShapes[routeId];

    if (hasVcData) {
        // Use high-fidelity VC route data as route path
        var vcPath = L.polyline(vcRouteData[vcKey], {
            color: color, weight: 4, opacity: 0.85
        }).bindPopup('<b>Route ' + info.short_name + '</b><br>' + (info.desc || info.long_name));
        vcPath.addTo(group);
        var vcArrows = L.polylineDecorator(vcPath, {
            patterns: [{
                offset: '15%', repeat: '25%',
                symbol: L.Symbol.arrowHead({
                    pixelSize: 12,
                    polygon: true,
                    pathOptions: {color: color, fillColor: color, fillOpacity: 1, weight: 1, opacity: 0.85}
                })
            }]
        });
        vcArrows._isArrowMarker = true;
        vcArrows.addTo(group);
    } else if (shape0Id && shapeDataOriginal[shape0Id]) {
        var routePath0 = L.polyline(shapeDataOriginal[shape0Id], {
            color: color, weight: 4, opacity: 0.85
        }).bindPopup('<b>Route ' + info.short_name + '</b><br>' + (info.desc || info.long_name));
        routePath0._dirId = 0;
        routePath0.addTo(group);
        var arrowMarker0 = L.polylineDecorator(routePath0, {
            patterns: [{
                offset: '15%', repeat: '25%',
                symbol: L.Symbol.arrowHead({
                    pixelSize: 12,
                    polygon: true,
                    pathOptions: {color: color, fillColor: color, fillOpacity: 1, weight: 1, opacity: 0.85}
                })
            }]
        });
        arrowMarker0._dirId = 0;
        arrowMarker0._isArrowMarker = true;
        arrowMarker0.addTo(group);
        var directionalMarker0 = L.polylineDecorator(routePath0, {
            patterns: [{
                offset: '8%', repeat: '25%',
                symbol: L.Symbol.marker({
                    rotate: true,
                    markerOptions: {
                        icon: L.divIcon({
                            className: 'directional-marker',
                            html: '<div style="font-family:Inter,sans-serif;background:' + color + ';color:white;font-size:9px;font-weight:700;padding:2px 4px;border-radius:3px;border:1px solid white;white-space:nowrap;transform:rotate(-90deg);text-align:center;">E ></div>',
                            iconSize: [24, 18],
                            iconAnchor: [12, 9]
                        })
                    }
                })
            }]
        });
        directionalMarker0._dirId = 0;
        directionalMarker0._isDirectionalMarker = true;
        directionalMarker0.addTo(group);
    }
    if (!hasVcData && shape1Id && shapeDataOriginal[shape1Id]) {
        var routePath1 = L.polyline(shapeDataOriginal[shape1Id], {
            color: color, weight: 4, opacity: 0.85
        }).bindPopup('<b>Route ' + info.short_name + '</b><br>' + (info.desc || info.long_name));
        routePath1._dirId = 1;
        routePath1.addTo(group);
        var arrowMarker1 = L.polylineDecorator(routePath1, {
            patterns: [{
                offset: '15%', repeat: '25%',
                symbol: L.Symbol.arrowHead({
                    pixelSize: 12,
                    polygon: true,
                    pathOptions: {color: color, fillColor: color, fillOpacity: 1, weight: 1, opacity: 0.85}
                })
            }]
        });
        arrowMarker1._dirId = 1;
        arrowMarker1._isArrowMarker = true;
        arrowMarker1.addTo(group);
        var directionalMarker1 = L.polylineDecorator(routePath1, {
            patterns: [{
                offset: '8%', repeat: '25%',
                symbol: L.Symbol.marker({
                    rotate: true,
                    markerOptions: {
                        icon: L.divIcon({
                            className: 'directional-marker',
                            html: '<div style="font-family:Inter,sans-serif;background:' + color + ';color:white;font-size:9px;font-weight:700;padding:2px 4px;border-radius:3px;border:1px solid white;white-space:nowrap;transform:rotate(-90deg);text-align:center;">W ></div>',
                            iconSize: [24, 18],
                            iconAnchor: [12, 9]
                        })
                    }
                })
            }]
        });
        directionalMarker1._dirId = 1;
        directionalMarker1._isDirectionalMarker = true;
        directionalMarker1.addTo(group);
    }
    if (!hasVcData && !shape0Id && !shape1Id && fallbackShapeId && shapeDataOriginal[fallbackShapeId]) {
        L.polyline(shapeDataOriginal[fallbackShapeId], {
            color: color, weight: 4, opacity: 0.85
        }).bindPopup('<b>Route ' + info.short_name + '</b><br>' + (info.desc || info.long_name)).addTo(group);
    }

    var eastboundStops = routeStopsOrdered[routeId + '_0'] || [];
    var eastboundSet = {};
    eastboundStops.forEach(function(sid) { eastboundSet[sid] = true; });

    var stopIds = routeStops[routeId] || [];
    stopIds.forEach(function(stopId) {
        var s = stopLookup[stopId];
        if (s) {
            var isOrphan = !eastboundSet[stopId];
            var marker = L.circleMarker([s.lat, s.lon], {
                radius: 6, fillColor: color, color: '#fff',
                weight: 2, fillOpacity: isOrphan && !orphanStopsVisible ? 0 : 0.9,
                opacity: isOrphan && !orphanStopsVisible ? 0 : 1
            }).bindPopup('<b>' + s.name + '</b>');
            marker._isOrphanStop = isOrphan;
            marker.addTo(group);
        }
    });

    group.addTo(map);
    routeLayers[routeId] = group;
    routeActive[routeId] = true;

    var item = document.createElement('div');
    item.className = 'route-item';
    item.dataset.routeId = routeId;

    var cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = true;
    cb.className = 'route-checkbox';
    cb.id = 'cb-' + routeId;
    cb.onclick = function(e) {
        e.stopPropagation();
        toggleRouteVisibility(routeId, cb.checked);
    };

    var clickable = document.createElement('div');
    clickable.className = 'route-clickable';
    clickable.innerHTML = '<div class="route-badge" style="background:' + color + '">' +
        info.short_name + '</div><div class="route-name">' +
        (info.desc || info.long_name) + '</div>';
    clickable.onclick = function() {
        selectRoute(routeId, item);
    };

    item.appendChild(cb);
    item.appendChild(clickable);
    listEl.appendChild(item);
});

// Hide decorators during pan/zoom for performance
var _decoratorCache = [];
map.on('movestart zoomstart', function() {
    _decoratorCache = [];
    Object.keys(routeLayers).forEach(function(id) {
        if (!routeActive[id]) return;
        routeLayers[id].eachLayer(function(layer) {
            if (layer._isArrowMarker || layer._isDirectionalMarker) {
                routeLayers[id].removeLayer(layer);
                _decoratorCache.push({group: routeLayers[id], layer: layer});
            }
        });
    });
});
map.on('moveend zoomend', function() {
    _decoratorCache.forEach(function(item) {
        item.layer.addTo(item.group);
    });
    _decoratorCache = [];
});

var currentRouteStopData = [];
var currentDirection = 0;

function removeDirectionToggle() {
    var existing = document.getElementById('direction-toggle');
    if (existing) existing.remove();
}

function selectRoute(routeId, el) {
    routeLabelsLayer.clearLayers();
    map.removeLayer(routeLabelsLayer);
    currentRouteStopData = [];
    removeDirectionToggle();

    if (selectedRouteId === routeId) {
        resetDirectionOpacity();
        selectedRouteId = null;
        currentDirection = 0;
        document.querySelectorAll('.route-item').forEach(function(item) {
            item.classList.remove('selected');
        });
        return;
    }

    if (selectedRouteId) {
        resetDirectionOpacity();
    }

    selectedRouteId = routeId;
    currentDirection = 0;
    updateDecoratorVisibility(routeId, true);
    document.querySelectorAll('.route-item').forEach(function(item) {
        item.classList.remove('selected');
    });
    el.classList.add('selected');

    var has0 = routeStopsOrdered[routeId + '_0'];
    var has1 = routeStopsOrdered[routeId + '_1'];

    var toggle = document.createElement('div');
    toggle.id = 'direction-toggle';
    toggle.style.cssText = 'padding:8px 10px;background:var(--bg-secondary);border-radius:var(--radius-sm);margin:3px 0;white-space:nowrap;border:1px solid var(--border);';

    if (has0 && has1) {
        var label0 = routeHeadsigns[routeId + '_0'] || 'Direction 1';
        var label1 = routeHeadsigns[routeId + '_1'] || 'Direction 2';
        toggle.innerHTML = '<span style="font-size:10px;color:var(--text-muted);margin-right:6px;">Direction:</span>' +
            '<button class="btn dir-btn active-dir" id="dir0-btn" onclick="setDirection(0)">E: To ' + label0 + '</button> ' +
            '<button class="btn dir-btn" id="dir1-btn" onclick="setDirection(1)">W: To ' + label1 + '</button>';
    } else {
        toggle.innerHTML = '<div style="font-size:10px;color:var(--text-muted);font-style:italic;">This route operates in one direction only.</div>';
    }
    el.after(toggle);

    loadDirectionStops();
    routeLabelsLayer.addTo(map);
}

function setDirection(dir) {
    currentDirection = dir;
    document.getElementById('dir0-btn').className = dir === 0 ? 'btn dir-btn active-dir' : 'btn dir-btn';
    document.getElementById('dir1-btn').className = dir === 1 ? 'btn dir-btn active-dir' : 'btn dir-btn';
    loadDirectionStops();
}

function loadDirectionStops() {
    var key = selectedRouteId + '_' + currentDirection;
    var stopIds = routeStopsOrdered[key] || routeStopsOrdered[selectedRouteId + '_0'] || routeStops[selectedRouteId] || [];
    currentRouteStopData = stopIds.map(function(stopId) {
        return stopLookup[stopId] || null;
    }).filter(Boolean);
    routeLabelsLayer.clearLayers();
    layoutLabels();
    routeLabelsLayer.addTo(map);
    updateDirectionOpacity();
}

function updateDecoratorVisibility(routeId, selected) {
    if (!routeId || !routeLayers[routeId]) return;
    routeLayers[routeId].eachLayer(function(layer) {
        if (layer._isDirectionalMarker) {
            layer.eachLayer(function(sub) {
                if (sub._icon) sub._icon.style.visibility = selected ? 'visible' : 'hidden';
            });
        }
        if (layer._isArrowMarker) {
            layer.eachLayer(function(sub) {
                if (sub.setStyle) sub.setStyle({opacity: selected ? 0 : 0.85, fillOpacity: selected ? 0 : 1});
            });
        }
    });
}

function updateDirectionOpacity() {
    if (!selectedRouteId || !routeLayers[selectedRouteId]) return;
    var has0 = routeStopsOrdered[selectedRouteId + '_0'];
    var has1 = routeStopsOrdered[selectedRouteId + '_1'];
    if (!has0 || !has1) return;

    routeLayers[selectedRouteId].eachLayer(function(layer) {
        if (layer._dirId !== undefined) {
            var active = layer._dirId === currentDirection;
            if (layer._isArrowMarker) return;
            if (layer._isDirectionalMarker) {
                layer.eachLayer(function(sub) {
                    if (sub._icon) sub._icon.style.visibility = active ? 'visible' : 'hidden';
                });
                return;
            }
            if (layer.setStyle && layer instanceof L.Polyline && !(layer instanceof L.CircleMarker)) {
                layer.setStyle({opacity: active ? 0.85 : 0.3, weight: active ? 4 : 3});
            }
            if (layer.eachLayer) {
                layer.eachLayer(function(sub) {
                    if (sub.setStyle) sub.setStyle({opacity: active ? 0.85 : 0.2, fillOpacity: active ? 1 : 0.2});
                });
            }
        }
    });
}

function resetDirectionOpacity() {
    if (!selectedRouteId || !routeLayers[selectedRouteId]) return;
    updateDecoratorVisibility(selectedRouteId, false);
    routeLayers[selectedRouteId].eachLayer(function(layer) {
        if (layer._dirId !== undefined) {
            if (layer._isArrowMarker || layer._isDirectionalMarker) return;
            if (layer.setStyle && layer instanceof L.Polyline && !(layer instanceof L.CircleMarker)) {
                layer.setStyle({opacity: 0.85, weight: 4});
            }
            if (layer.eachLayer) {
                layer.eachLayer(function(sub) {
                    if (sub.setStyle) sub.setStyle({opacity: 0.85, fillOpacity: 1});
                });
            }
        }
    });
}

function layoutLabels() {
    routeLabelsLayer.clearLayers();
    if (!currentRouteStopData.length) return;

    var color = selectedRouteId ? routeColors[sortedRoutes.indexOf(selectedRouteId) % routeColors.length] : '#333';
    var charWidth = 7;
    var labelHeight = 18;
    var padding = 4;
    var nudgeStep = 20;
    var maxNudges = 8;

    var placed = [];

    currentRouteStopData.forEach(function(s, idx) {
        var num = idx + 1;

        // Numbered circle at stop location
        L.marker([s.lat, s.lon], {
            icon: L.divIcon({
                className: 'stop-number',
                html: '<div style="font-family:Inter,sans-serif;width:20px;height:20px;border-radius:50%;background:' + color + ';color:white;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4);">' + num + '</div>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            })
        }).addTo(routeLabelsLayer);

        // Label with number prefix
        var labelText = num + '. ' + s.name;
        var pt = map.latLngToContainerPoint([s.lat, s.lon]);
        var w = labelText.length * charWidth + padding * 2;

        var bestRect = null;
        var bestOverlaps = Infinity;

        for (var attempt = 0; attempt <= maxNudges; attempt++) {
            var offsetY = attempt === 0 ? 0 : (attempt % 2 === 1 ? -Math.ceil(attempt / 2) * nudgeStep : Math.ceil(attempt / 2) * nudgeStep);
            var rect = { x: pt.x + 14, y: pt.y - labelHeight / 2 + offsetY, w: w, h: labelHeight };

            var overlapCount = 0;
            for (var i = 0; i < placed.length; i++) {
                var p = placed[i];
                if (rect.x < p.x + p.w && rect.x + rect.w > p.x &&
                    rect.y < p.y + p.h && rect.y + rect.h > p.y) {
                    overlapCount++;
                }
            }

            if (overlapCount === 0) {
                bestRect = rect;
                bestOverlaps = 0;
                break;
            }
            if (overlapCount < bestOverlaps) {
                bestOverlaps = overlapCount;
                bestRect = rect;
            }
        }

        if (bestOverlaps >= 3) return;

        placed.push(bestRect);
        var anchorY = 12 - (bestRect.y - (pt.y - labelHeight / 2));
        L.marker([s.lat, s.lon], {
            icon: L.divIcon({
                className: 'stop-label',
                html: '<span style="font-family:Inter,sans-serif;background:rgba(255,255,255,0.93);padding:2px 6px;border-radius:4px;font-size:11px;font-weight:600;white-space:nowrap;border:1px solid ' + color + ';letter-spacing:-0.2px;">' + labelText + '</span>',
                iconAnchor: [-14, anchorY]
            })
        }).addTo(routeLabelsLayer);
    });
}

map.on('zoomend moveend', function() {
    if (selectedRouteId && currentRouteStopData.length) {
        layoutLabels();
    }
});

function toggleRouteVisibility(routeId, visible) {
    if (visible) {
        if (routeLayers[routeId]) {
            routeLayers[routeId].addTo(map);
            routeActive[routeId] = true;
        }
    } else {
        if (routeLayers[routeId]) {
            map.removeLayer(routeLayers[routeId]);
            routeActive[routeId] = false;
        }
    }
}

function showAll() {
    sortedRoutes.forEach(function(id) {
        if (routeLayers[id]) {
            if (!routeActive[id]) {
                routeLayers[id].addTo(map);
                routeActive[id] = true;
            }
            resetRouteLayerStyles(id);
        }
    });
    document.querySelectorAll('.route-checkbox').forEach(function(cb) { cb.checked = true; });
}

function resetRouteLayerStyles(routeId) {
    if (!routeLayers[routeId]) return;
    var color = routeColors[sortedRoutes.indexOf(routeId) % routeColors.length];
    routeLayers[routeId].eachLayer(function(layer) {
        if (layer._isArrowMarker || layer._isDirectionalMarker) return;
        if (layer instanceof L.CircleMarker) {
            var isOrphan = layer._isOrphanStop;
            layer.setStyle({
                fillOpacity: isOrphan && !orphanStopsVisible ? 0 : 0.9,
                opacity: isOrphan && !orphanStopsVisible ? 0 : 1
            });
        } else if (layer.setStyle) {
            layer.setStyle({ opacity: 0.85, weight: 4, dashArray: null });
        }
        if (layer._icon) layer._icon.style.display = '';
    });
}

function hideAll() {
    sortedRoutes.forEach(function(id) {
        if (routeActive[id] && routeLayers[id]) {
            map.removeLayer(routeLayers[id]);
            routeActive[id] = false;
        }
    });
    document.querySelectorAll('.route-checkbox').forEach(function(cb) { cb.checked = false; });
}

var stopsVisible = true;
var orphanStopsVisible = false;
function toggleStops() {
    stopsVisible = document.getElementById('showStops').checked;
    sortedRoutes.forEach(function(id) {
        if (!routeActive[id] || !routeLayers[id]) return;
        routeLayers[id].eachLayer(function(layer) {
            if (layer instanceof L.CircleMarker && !(layer instanceof L.Circle)) {
                if (!stopsVisible) {
                    layer.setStyle({opacity: 0, fillOpacity: 0});
                } else if (layer._isOrphanStop && !orphanStopsVisible) {
                    layer.setStyle({opacity: 0, fillOpacity: 0});
                } else {
                    layer.setStyle({opacity: 1, fillOpacity: 0.9});
                }
            }
        });
    });
}

function toggleOrphanStops() {
    orphanStopsVisible = document.getElementById('showOrphans').checked;
    sortedRoutes.forEach(function(id) {
        if (!routeActive[id] || !routeLayers[id]) return;
        routeLayers[id].eachLayer(function(layer) {
            if (layer instanceof L.CircleMarker && !(layer instanceof L.Circle) && layer._isOrphanStop) {
                if (orphanStopsVisible && stopsVisible) {
                    layer.setStyle({opacity: 1, fillOpacity: 0.9});
                } else {
                    layer.setStyle({opacity: 0, fillOpacity: 0});
                }
            }
        });
    });
}

// Trip Planner
var DEST_STOP_ID = '322f8fab-aa16-4f04-912d-f9047c240fa2'; // Mathworks Lakeside
var tripMarker = null;
var tripPath = null;

function haversine(lat1, lon1, lat2, lon2) {
    var R = 6371000;
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLon = (lon2 - lon1) * Math.PI / 180;
    var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function buildRouteGraph() {
    // Build adjacency: for each route+direction, consecutive stops are connected
    var graph = {}; // stopId -> [{stopId, routeId, routeName, dirId}]
    for (var key in routeStopsOrdered) {
        var parts = key.split('_');
        var routeId = parts[0];
        var dirId = parseInt(parts[1]);
        var stops = routeStopsOrdered[key];
        var name = routeInfo[routeId] ? routeInfo[routeId].short_name : '?';
        for (var i = 0; i < stops.length - 1; i++) {
            if (!graph[stops[i]]) graph[stops[i]] = [];
            graph[stops[i]].push({stop: stops[i+1], route: routeId, routeName: name, dir: dirId});
        }
    }
    return graph;
}

function findPath(startStopId, endStopId, graph) {
    // BFS to find shortest path (fewest stops/transfers)
    var queue = [{stop: startStopId, path: [], route: null}];
    var visited = {};
    visited[startStopId] = true;

    while (queue.length > 0) {
        var current = queue.shift();
        if (current.stop === endStopId) return current.path;

        var neighbors = graph[current.stop] || [];
        for (var i = 0; i < neighbors.length; i++) {
            var n = neighbors[i];
            if (!visited[n.stop]) {
                visited[n.stop] = true;
                var newPath = current.path.concat([{
                    from: current.stop,
                    to: n.stop,
                    route: n.route,
                    routeName: n.routeName,
                    dir: n.dir
                }]);
                if (n.stop === endStopId) return newPath;
                queue.push({stop: n.stop, path: newPath, route: n.route});
            }
        }
    }
    return null;
}

function findNearestStop(lat, lon) {
    var bestDist = Infinity;
    var bestId = null;
    for (var id in stopLookup) {
        var s = stopLookup[id];
        var d = haversine(lat, lon, s.lat, s.lon);
        if (d < bestDist) {
            bestDist = d;
            bestId = id;
        }
    }
    return {id: bestId, dist: bestDist};
}

function findNearestIndexOnPolyline(polyline, lat, lon) {
    var bestIdx = 0;
    var bestDist = Infinity;
    for (var i = 0; i < polyline.length; i++) {
        var dx = polyline[i][0] - lat;
        var dy = polyline[i][1] - lon;
        var d = dx * dx + dy * dy;
        if (d < bestDist) {
            bestDist = d;
            bestIdx = i;
        }
    }
    return bestIdx;
}

function getVcSliceForSegment(routeId, stopIds) {
    var info = routeInfo[routeId];
    if (!info) return null;
    var vcKey = (vcRouteData['RT' + info.short_name]) ? 'RT' + info.short_name : info.short_name;
    if (!vcRouteData || !vcRouteData[vcKey] || vcRouteData[vcKey].length < 2) return null;

    var polyline = vcRouteData[vcKey];
    var firstStop = stopLookup[stopIds[0]];
    var lastStop = stopLookup[stopIds[stopIds.length - 1]];
    var startIdx = findNearestIndexOnPolyline(polyline, firstStop.lat, firstStop.lon);
    var endIdx = findNearestIndexOnPolyline(polyline, lastStop.lat, lastStop.lon);

    if (startIdx === endIdx) return null;

    if (startIdx < endIdx) {
        return polyline.slice(startIdx, endIdx + 1);
    } else {
        var reversed = polyline.slice(endIdx, startIdx + 1);
        reversed.reverse();
        return reversed;
    }
}

function formatTime(minutes) {
    var h = Math.floor(minutes / 60);
    var m = minutes % 60;
    var ampm = h >= 12 ? 'PM' : 'AM';
    var h12 = h % 12 || 12;
    return h12 + ':' + (m < 10 ? '0' : '') + m + ' ' + ampm;
}

async function findTimetableTrips(startStopId, timeMin, walkCache, destStopId, mode) {
    var DEST = destStopId || DEST_STOP_ID;
    var TRANSFER_BUFFER = 2;
    var results = [];
    var isDepart = (mode === 'depart');

    // Index: for each stop, which trips serve it and at what index/time
    // stopIndex[stopId] = [{tripId, idx, depMin}]
    var stopIndex = {};
    for (var tripId in tripStopTimes) {
        var stops = tripStopTimes[tripId];
        for (var i = 0; i < stops.length; i++) {
            var sid = stops[i][0];
            if (!stopIndex[sid]) stopIndex[sid] = [];
            stopIndex[sid].push({ tripId: tripId, idx: i, depMin: stops[i][1] });
        }
    }

    // Trips from startStopId
    var startTrips = [];
    for (var tripId in tripStopTimes) {
        var stops = tripStopTimes[tripId];
        for (var i = 0; i < stops.length; i++) {
            if (stops[i][0] === startStopId) {
                if (isDepart && stops[i][1] < timeMin) break;
                startTrips.push({ tripId: tripId, startIdx: i, departMin: stops[i][1], stops: stops });
                break;
            }
        }
    }

    // Trips arriving at DEST
    var destTrips = [];
    for (var tripId in tripStopTimes) {
        var stops = tripStopTimes[tripId];
        for (var i = 0; i < stops.length; i++) {
            if (stops[i][0] === DEST) {
                if (!isDepart && stops[i][1] > timeMin) break;
                destTrips.push({ tripId: tripId, destIdx: i, arriveMin: stops[i][1], stops: stops });
                break;
            }
        }
    }

    // Direct trips
    for (var s = 0; s < startTrips.length; s++) {
        var st = startTrips[s];
        for (var i = st.startIdx + 1; i < st.stops.length; i++) {
            if (st.stops[i][0] === DEST) {
                if (!isDepart && st.stops[i][1] > timeMin) break;
                results.push({
                    type: 'direct',
                    tripId: st.tripId,
                    route: tripMeta[st.tripId][0],
                    dir: tripMeta[st.tripId][1],
                    departMin: st.departMin,
                    arriveMin: st.stops[i][1],
                    stops: st.stops.slice(st.startIdx, i + 1).map(function(x) { return x[0]; })
                });
                break;
            }
        }
    }

    // Walking optimization using OSRM road-following distances at 5 km/hr
    var allStopIds = walkCache.allStopIds;
    var walkDistances = walkCache.distances;
    var stopIdxMap = walkCache.stopIdxMap;
    var WALK_SPEED_MPM = 83.33;

    function getWalkMin(fromIdx, toIdx) {
        if (walkDistances && walkDistances[fromIdx][toIdx] !== null) {
            return Math.ceil(walkDistances[fromIdx][toIdx] / WALK_SPEED_MPM);
        }
        var src = stopLookup[allStopIds[fromIdx]];
        var dst = stopLookup[allStopIds[toIdx]];
        return Math.ceil(haversine(src.lat, src.lon, dst.lat, dst.lon) / WALK_SPEED_MPM);
    }

    function getWalkDist(fromIdx, toIdx) {
        if (walkDistances && walkDistances[fromIdx][toIdx] !== null) {
            return walkDistances[fromIdx][toIdx];
        }
        var src = stopLookup[allStopIds[fromIdx]];
        var dst = stopLookup[allStopIds[toIdx]];
        return haversine(src.lat, src.lon, dst.lat, dst.lon);
    }

    var destIdx = stopIdxMap[DEST];

    // Walk-finish: ride to a stop, walk directly to DEST if you arrive on time
    for (var s = 0; s < startTrips.length; s++) {
        var st = startTrips[s];
        for (var ti = st.startIdx + 1; ti < st.stops.length; ti++) {
            var xferStop = st.stops[ti][0];
            if (xferStop === DEST) break;
            var xferArriveMin = st.stops[ti][1];
            var xferIdx = stopIdxMap[xferStop];
            var walkMinToDest = getWalkMin(xferIdx, destIdx);
            var walkArrival = xferArriveMin + walkMinToDest;
            if (!isDepart && walkArrival > timeMin) continue;
            results.push({
                type: 'walk-finish',
                legs: [
                    { tripId: st.tripId, route: tripMeta[st.tripId][0], dir: tripMeta[st.tripId][1],
                      departMin: st.departMin, arriveMin: xferArriveMin,
                      stops: st.stops.slice(st.startIdx, ti + 1).map(function(x) { return x[0]; }) }
                ],
                walkLeg: { from: xferStop, to: DEST, walkMin: walkMinToDest, dist: getWalkDist(xferIdx, destIdx) },
                departMin: st.departMin,
                arriveMin: walkArrival
            });
        }
        if (results.length > 200) break;
    }

    // Walk-transfer: ride to stop A, walk to stop B, catch a bus from B to DEST
    for (var s = 0; s < startTrips.length; s++) {
        var st = startTrips[s];
        for (var ti = st.startIdx + 1; ti < st.stops.length; ti++) {
            var xferStop = st.stops[ti][0];
            if (xferStop === DEST) break;
            var xferArriveMin = st.stops[ti][1];
            var xferIdx = stopIdxMap[xferStop];

            for (var d = 0; d < destTrips.length; d++) {
                var dt = destTrips[d];
                if (dt.tripId === st.tripId) continue;
                for (var di = 0; di < dt.destIdx; di++) {
                    var pickupStop = dt.stops[di][0];
                    if (pickupStop === xferStop) continue;
                    var busDepartMin = dt.stops[di][1];
                    var availableMin = busDepartMin - xferArriveMin - TRANSFER_BUFFER;
                    if (availableMin <= 0) continue;
                    var pickupIdx = stopIdxMap[pickupStop];
                    var walkMin = getWalkMin(xferIdx, pickupIdx);
                    if (walkMin <= availableMin) {
                        results.push({
                            type: 'walk-transfer',
                            legs: [
                                { tripId: st.tripId, route: tripMeta[st.tripId][0], dir: tripMeta[st.tripId][1],
                                  departMin: st.departMin, arriveMin: xferArriveMin,
                                  stops: st.stops.slice(st.startIdx, ti + 1).map(function(x) { return x[0]; }) },
                                { tripId: dt.tripId, route: tripMeta[dt.tripId][0], dir: tripMeta[dt.tripId][1],
                                  departMin: busDepartMin, arriveMin: dt.stops[dt.destIdx][1],
                                  stops: dt.stops.slice(di, dt.destIdx + 1).map(function(x) { return x[0]; }) }
                            ],
                            walkLeg: { from: xferStop, to: pickupStop, walkMin: walkMin, dist: getWalkDist(xferIdx, pickupIdx) },
                            departMin: st.departMin,
                            arriveMin: dt.stops[dt.destIdx][1]
                        });
                        break;
                    }
                }
            }
            if (results.length > 200) break;
        }
        if (results.length > 200) break;
    }

    // One-transfer trips
    for (var s = 0; s < startTrips.length; s++) {
        var st = startTrips[s];
        for (var ti = st.startIdx + 1; ti < st.stops.length; ti++) {
            var xferStop = st.stops[ti][0];
            if (xferStop === DEST) break;
            var xferArriveMin = st.stops[ti][1];

            for (var d = 0; d < destTrips.length; d++) {
                var dt = destTrips[d];
                if (dt.tripId === st.tripId) continue;
                for (var di = 0; di < dt.destIdx; di++) {
                    if (dt.stops[di][0] === xferStop && dt.stops[di][1] >= xferArriveMin + TRANSFER_BUFFER) {
                        results.push({
                            type: 'transfer',
                            legs: [
                                { tripId: st.tripId, route: tripMeta[st.tripId][0], dir: tripMeta[st.tripId][1],
                                  departMin: st.departMin, arriveMin: xferArriveMin,
                                  stops: st.stops.slice(st.startIdx, ti + 1).map(function(x) { return x[0]; }) },
                                { tripId: dt.tripId, route: tripMeta[dt.tripId][0], dir: tripMeta[dt.tripId][1],
                                  departMin: dt.stops[di][1], arriveMin: dt.stops[dt.destIdx][1],
                                  stops: dt.stops.slice(di, dt.destIdx + 1).map(function(x) { return x[0]; }) }
                            ],
                            departMin: st.departMin,
                            arriveMin: dt.stops[dt.destIdx][1]
                        });
                        break;
                    }
                }
            }
        }
    }

    // Two-transfer trips: leg1 from start, leg2 middle, leg3 to DEST
    // Build index of what stops each destTrip passes through before DEST
    var destTripByStop = {};
    for (var d = 0; d < destTrips.length; d++) {
        var dt = destTrips[d];
        for (var di = 0; di < dt.destIdx; di++) {
            var sid = dt.stops[di][0];
            if (!destTripByStop[sid]) destTripByStop[sid] = [];
            destTripByStop[sid].push({ dtIdx: d, stopIdx: di, depMin: dt.stops[di][1] });
        }
    }

    for (var s = 0; s < startTrips.length; s++) {
        var st = startTrips[s];
        for (var ti = st.startIdx + 1; ti < st.stops.length; ti++) {
            var xfer1Stop = st.stops[ti][0];
            if (xfer1Stop === DEST) break;
            var xfer1ArriveMin = st.stops[ti][1];

            // Find middle trips that depart xfer1Stop after leg1 arrives
            var midEntries = stopIndex[xfer1Stop];
            if (!midEntries) continue;

            for (var m = 0; m < midEntries.length; m++) {
                var me = midEntries[m];
                if (me.tripId === st.tripId) continue;
                if (me.depMin < xfer1ArriveMin + TRANSFER_BUFFER) continue;

                var midStops = tripStopTimes[me.tripId];
                // Look at stops after xfer1Stop on the middle trip
                for (var mi = me.idx + 1; mi < midStops.length; mi++) {
                    var xfer2Stop = midStops[mi][0];
                    if (xfer2Stop === DEST) break;
                    var xfer2ArriveMin = midStops[mi][1];

                    // Check if any dest trip departs from xfer2Stop
                    var destEntries = destTripByStop[xfer2Stop];
                    if (!destEntries) continue;

                    for (var de = 0; de < destEntries.length; de++) {
                        var dEntry = destEntries[de];
                        var dt = destTrips[dEntry.dtIdx];
                        if (dt.tripId === me.tripId || dt.tripId === st.tripId) continue;
                        if (dEntry.depMin < xfer2ArriveMin + TRANSFER_BUFFER) continue;

                        results.push({
                            type: 'transfer2',
                            legs: [
                                { tripId: st.tripId, route: tripMeta[st.tripId][0], dir: tripMeta[st.tripId][1],
                                  departMin: st.departMin, arriveMin: xfer1ArriveMin,
                                  stops: st.stops.slice(st.startIdx, ti + 1).map(function(x) { return x[0]; }) },
                                { tripId: me.tripId, route: tripMeta[me.tripId][0], dir: tripMeta[me.tripId][1],
                                  departMin: me.depMin, arriveMin: xfer2ArriveMin,
                                  stops: midStops.slice(me.idx, mi + 1).map(function(x) { return x[0]; }) },
                                { tripId: dt.tripId, route: tripMeta[dt.tripId][0], dir: tripMeta[dt.tripId][1],
                                  departMin: dEntry.depMin, arriveMin: dt.arriveMin,
                                  stops: dt.stops.slice(dEntry.stopIdx, dt.destIdx + 1).map(function(x) { return x[0]; }) }
                            ],
                            departMin: st.departMin,
                            arriveMin: dt.arriveMin
                        });
                        break;
                    }
                    if (results.length > 200) break;
                }
                if (results.length > 200) break;
            }
            if (results.length > 200) break;
        }
        if (results.length > 200) break;
    }

    // Three-transfer trips: leg1 from start, leg2 middle1, leg3 middle2, leg4 to DEST
    for (var s = 0; s < startTrips.length; s++) {
        var st = startTrips[s];
        for (var ti = st.startIdx + 1; ti < st.stops.length; ti++) {
            var xfer1Stop = st.stops[ti][0];
            if (xfer1Stop === DEST) break;
            var xfer1ArriveMin = st.stops[ti][1];

            var mid1Entries = stopIndex[xfer1Stop];
            if (!mid1Entries) continue;

            for (var m1 = 0; m1 < mid1Entries.length; m1++) {
                var me1 = mid1Entries[m1];
                if (me1.tripId === st.tripId) continue;
                if (me1.depMin < xfer1ArriveMin + TRANSFER_BUFFER) continue;

                var mid1Stops = tripStopTimes[me1.tripId];
                for (var mi1 = me1.idx + 1; mi1 < mid1Stops.length; mi1++) {
                    var xfer2Stop = mid1Stops[mi1][0];
                    if (xfer2Stop === DEST) break;
                    var xfer2ArriveMin = mid1Stops[mi1][1];

                    var mid2Entries = stopIndex[xfer2Stop];
                    if (!mid2Entries) continue;

                    for (var m2 = 0; m2 < mid2Entries.length; m2++) {
                        var me2 = mid2Entries[m2];
                        if (me2.tripId === me1.tripId || me2.tripId === st.tripId) continue;
                        if (me2.depMin < xfer2ArriveMin + TRANSFER_BUFFER) continue;

                        var mid2Stops = tripStopTimes[me2.tripId];
                        for (var mi2 = me2.idx + 1; mi2 < mid2Stops.length; mi2++) {
                            var xfer3Stop = mid2Stops[mi2][0];
                            if (xfer3Stop === DEST) break;
                            var xfer3ArriveMin = mid2Stops[mi2][1];

                            var destEntries = destTripByStop[xfer3Stop];
                            if (!destEntries) continue;

                            for (var de = 0; de < destEntries.length; de++) {
                                var dEntry = destEntries[de];
                                var dt = destTrips[dEntry.dtIdx];
                                if (dt.tripId === me2.tripId || dt.tripId === me1.tripId || dt.tripId === st.tripId) continue;
                                if (dEntry.depMin < xfer3ArriveMin + TRANSFER_BUFFER) continue;

                                results.push({
                                    type: 'transfer3',
                                    legs: [
                                        { tripId: st.tripId, route: tripMeta[st.tripId][0], dir: tripMeta[st.tripId][1],
                                          departMin: st.departMin, arriveMin: xfer1ArriveMin,
                                          stops: st.stops.slice(st.startIdx, ti + 1).map(function(x) { return x[0]; }) },
                                        { tripId: me1.tripId, route: tripMeta[me1.tripId][0], dir: tripMeta[me1.tripId][1],
                                          departMin: me1.depMin, arriveMin: xfer2ArriveMin,
                                          stops: mid1Stops.slice(me1.idx, mi1 + 1).map(function(x) { return x[0]; }) },
                                        { tripId: me2.tripId, route: tripMeta[me2.tripId][0], dir: tripMeta[me2.tripId][1],
                                          departMin: me2.depMin, arriveMin: xfer3ArriveMin,
                                          stops: mid2Stops.slice(me2.idx, mi2 + 1).map(function(x) { return x[0]; }) },
                                        { tripId: dt.tripId, route: tripMeta[dt.tripId][0], dir: tripMeta[dt.tripId][1],
                                          departMin: dEntry.depMin, arriveMin: dt.arriveMin,
                                          stops: dt.stops.slice(dEntry.stopIdx, dt.destIdx + 1).map(function(x) { return x[0]; }) }
                                    ],
                                    departMin: st.departMin,
                                    arriveMin: dt.arriveMin
                                });
                                break;
                            }
                            if (results.length > 300) break;
                        }
                        if (results.length > 300) break;
                    }
                    if (results.length > 300) break;
                }
                if (results.length > 300) break;
            }
            if (results.length > 300) break;
        }
        if (results.length > 300) break;
    }

    if (isDepart) {
        results.sort(function(a, b) { return a.arriveMin - b.arriveMin; });
    } else {
        results.sort(function(a, b) { return b.departMin - a.departMin; });
    }
    return results;
}

var planTripOptions = [];
var planTripSelectedIdx = -1;
var planTripUserLat = null, planTripUserLon = null;

function getTotalWalkDist(chosen) {
    var total = chosen.walkDist || 0;
    var trip = chosen.trip;
    if (trip.walkLeg) total += trip.walkLeg.dist;
    return total;
}

function pickBestTrip(allTrips, mode, nearestStopId, tripMode) {
    var filtered = allTrips.filter(function(t) {
        if (mode === 'minimal') {
            if (t.startStop !== nearestStopId) return false;
            if (t.trip.type === 'direct') return true;
            if (t.trip.type === 'transfer' || t.trip.type === 'transfer2' || t.trip.type === 'transfer3') {
                return !t.trip.walkLeg || t.trip.walkLeg.dist <= 100;
            }
            if (t.trip.type === 'walk-finish') {
                return t.trip.walkLeg && t.trip.walkLeg.dist <= 200;
            }
            return false;
        } else if (mode === 'moderate') {
            return getTotalWalkDist(t) <= 1000;
        }
        return true;
    });
    if (filtered.length === 0) return null;
    if (tripMode === 'depart') {
        filtered.sort(function(a, b) { return a.arriveMin - b.arriveMin; });
    } else {
        filtered.sort(function(a, b) { return b.effectiveDepart - a.effectiveDepart; });
    }
    return filtered[0];
}

function buildTripSegments(chosen) {
    var best = chosen.trip;
    var segments = [];
    if (best.type === 'direct') {
        segments.push({ route: best.route, routeName: routeInfo[best.route] ? routeInfo[best.route].short_name : '?', dir: best.dir, stops: best.stops, departMin: best.departMin, arriveMin: best.arriveMin, tripId: best.tripId });
    } else if (best.legs) {
        for (var li = 0; li < best.legs.length; li++) {
            var leg = best.legs[li];
            segments.push({ route: leg.route, routeName: routeInfo[leg.route] ? routeInfo[leg.route].short_name : '?', dir: leg.dir, stops: leg.stops, departMin: leg.departMin, arriveMin: leg.arriveMin, tripId: leg.tripId });
        }
    }
    return segments;
}

function buildOptionSummaryHtml(chosen, label, optIdx) {
    var best = chosen.trip;
    if (best.type === 'walk-only') {
        return '<div style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text-primary);">' +
            '<span style="font-weight:600;min-width:45px;">' + formatTime(best.departMin) + '</span>' +
            '<span style="min-width:32px;height:18px;border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;color:white;padding:0 4px;background:#555;">Walk</span>' +
            '<span>Walk to destination</span></div>' +
            '<div style="font-size:10px;color:var(--text-secondary);margin-top:3px;">' + Math.round(chosen.walkDist) + 'm walk &bull; ' + label + '</div>';
    }
    var segments = buildTripSegments(chosen);
    var routeBadges = '';
    for (var i = 0; i < segments.length; i++) {
        var seg = segments[i];
        var segColor = routeColors[sortedRoutes.indexOf(seg.route) % routeColors.length] || '#4363d8';
        if (i > 0) routeBadges += '<span style="font-size:10px;color:var(--text-muted);">→</span>';
        routeBadges += '<span style="min-width:32px;height:18px;border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;color:white;padding:0 4px;background:' + segColor + ';">' + seg.routeName + '</span>';
    }
    var totalWalk = getTotalWalkDist(chosen);
    var walkNote = totalWalk > 0 ? Math.round(totalWalk) + 'm walk' : 'No extra walking';
    return '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:4px 6px;font-size:11px;color:var(--text-primary);">' +
        '<span style="font-weight:600;min-width:45px;">' + formatTime(chosen.effectiveDepart) + '</span>' +
        routeBadges +
        '</div>' +
        '<div id="trip-summary-status-' + optIdx + '" style="margin-top:3px;"></div>' +
        '<div style="font-size:10px;color:var(--text-secondary);margin-top:3px;">Arrive ' + formatTime(chosen.arriveMin) + ' &bull; ' + walkNote + ' &bull; ' + label + '</div>';
}

function estimateBusDelay(busLat, busLon, tripStops, nowMin) {
    // Find which segment the bus is on by finding the closest stop
    var closestIdx = 0, closestDist = Infinity;
    for (var i = 0; i < tripStops.length; i++) {
        var st = stopLookup[tripStops[i]];
        if (!st) continue;
        var d = haversine(busLat, busLon, st.lat, st.lon);
        if (d < closestDist) {
            closestDist = d;
            closestIdx = i;
        }
    }
    // Get the scheduled time for this stop from tripStopTimes
    // We need to find the trip that matches these stops
    // Instead, interpolate: the bus should be at a position proportional to elapsed time
    // Use the segment's scheduled times
    return { closestIdx: closestIdx, closestDist: closestDist };
}

async function updateLiveBusStatus(idx) {
    var chosen = planTripOptions[idx];
    if (!chosen) return;
    var best = chosen.trip;
    if (best.type === 'walk-only') return;

    var now = new Date();
    var nowMin = now.getHours() * 60 + now.getMinutes();

    var segments = buildTripSegments(chosen);
    var summaryEl = document.getElementById('trip-summary-status-' + idx);
    var summarySet = false;

    try {
        var resp = await fetch('/api/vehicles');
        var vehicles = await resp.json();

        for (var s = 0; s < segments.length; s++) {
            var seg = segments[s];
            var segEl = document.getElementById('trip-seg-status-' + idx + '-' + s);

            // If this segment's time window is not currently active (with 30 min buffer), show next-day note
            if (nowMin < seg.departMin - 30 || nowMin > seg.arriveMin + 30) {
                var nextDayBadge = '<span style="display:inline-block;margin-left:6px;padding:3px 7px;border-radius:4px;font-size:10px;font-weight:600;color:var(--text-secondary);background:var(--bg-secondary);border:1px solid var(--border);letter-spacing:0.2px;">Tomorrow\'s timetable</span>';
                if (segEl) segEl.innerHTML = nextDayBadge;
                if (!summarySet && summaryEl) { summaryEl.innerHTML = nextDayBadge; summarySet = true; }
                continue;
            }

            var routeLongName = routeInfo[seg.route] ? routeInfo[seg.route].long_name : '';
            var routeShortName = routeInfo[seg.route] ? routeInfo[seg.route].short_name : '';

            var routeBuses = vehicles.filter(function(v) {
                return v.Active && v.Lat && v.Long &&
                    (v.Route === routeLongName || v.Route === routeShortName || v.Route === 'RT' + routeShortName);
            });

            if (routeBuses.length === 0) continue;

            var bestBus = null, bestInfo = null;
            for (var b = 0; b < routeBuses.length; b++) {
                var info = estimateBusDelay(routeBuses[b].Lat, routeBuses[b].Long, seg.stops, nowMin);
                if (!bestBus || info.closestDist < bestInfo.closestDist) {
                    bestBus = routeBuses[b];
                    bestInfo = info;
                }
            }

            if (!bestBus) continue;

            var matchedTripId = seg.tripId;
            if (!matchedTripId || !tripStopTimes[matchedTripId]) continue;

            var tripTimes = tripStopTimes[matchedTripId];
            var closestStopId = seg.stops[bestInfo.closestIdx];
            var scheduledMin = null;
            for (var t = 0; t < tripTimes.length; t++) {
                if (tripTimes[t][0] === closestStopId) {
                    scheduledMin = tripTimes[t][1];
                    break;
                }
            }

            if (scheduledMin === null) continue;

            var diffMin = nowMin - scheduledMin;
            var statusText, statusColor;
            if (Math.abs(diffMin) <= 2) {
                statusText = 'On time';
                statusColor = '#27ae60';
            } else if (diffMin < 0) {
                statusText = Math.abs(diffMin) + ' min early';
                statusColor = '#4363d8';
            } else {
                statusText = diffMin + ' min late';
                statusColor = '#e74c3c';
            }

            var badge = '<span style="display:inline-block;margin-left:6px;padding:3px 7px;border-radius:4px;font-size:10px;font-weight:600;color:white;background:' + statusColor + ';letter-spacing:0.2px;">' + statusText + '</span>';
            if (segEl) segEl.innerHTML = badge;
            if (!summarySet && summaryEl) { summaryEl.innerHTML = badge; summarySet = true; }

            // Draw faded full route for this segment's bus route (solid, not dashed)
            if (tripPath) {
                var segColor = routeColors[sortedRoutes.indexOf(seg.route) % routeColors.length];
                var rInfo = routeInfo[seg.route];
                if (rInfo) {
                    var vcKey = (vcRouteData['RT' + rInfo.short_name]) ? 'RT' + rInfo.short_name : rInfo.short_name;
                    if (vcRouteData && vcRouteData[vcKey] && vcRouteData[vcKey].length > 1) {
                        L.polyline(vcRouteData[vcKey], { color: segColor, weight: 3, opacity: 0.3 }).addTo(tripPath);
                    }
                }
            }
        }
    } catch (e) {}
}

function buildOptionDetailHtml(chosen, optIdx) {
    var best = chosen.trip;
    if (best.type === 'walk-only') {
        return '<div style="padding:8px 0;font-size:11px;color:var(--text-primary);">' +
            '<b>Walk directly to MathWorks Lakeside</b><br>' +
            '<span style="color:var(--text-secondary);">' + Math.round(chosen.walkDist) + 'm (' + chosen.walkMin + ' min)</span><br>' +
            '<span style="color:var(--text-muted);">Leave by ' + formatTime(best.departMin) + '</span></div>';
    }
    var segments = buildTripSegments(chosen);
    var walkLeg = best.walkLeg || null;
    var nearestName = stopLookup[chosen.startStop] ? stopLookup[chosen.startStop].name : '?';
    var html = '<div style="padding:8px 0;font-size:11px;">';
    html += '<div style="color:var(--text-primary);margin-bottom:4px;"><b>Walk to:</b> ' + nearestName + ' (' + Math.round(chosen.walkDist) + 'm, ' + chosen.walkMin + ' min)</div>';
    html += '<div style="font-size:10px;color:var(--text-secondary);margin-bottom:4px;"><b>Depart:</b> ' + formatTime(best.departMin) + ' &bull; <b>Arrive:</b> ' + formatTime(best.arriveMin) + '</div>';
    for (var s = 0; s < segments.length; s++) {
        var seg = segments[s];
        var fromName = stopLookup[seg.stops[0]] ? stopLookup[seg.stops[0]].name : '?';
        var toName = stopLookup[seg.stops[seg.stops.length - 1]] ? stopLookup[seg.stops[seg.stops.length - 1]].name : '?';
        var dirLabel = seg.dir === 0 ? 'E' : 'W';
        var segDispColor = routeColors[sortedRoutes.indexOf(seg.route) % routeColors.length];
        html += '<div style="margin:4px 0;padding:6px;background:var(--bg-secondary);border-radius:var(--radius-sm);border-left:3px solid ' + segDispColor + ';">';
        html += '<b>Route ' + seg.routeName + '</b> (' + dirLabel + ') <span id="trip-seg-status-' + optIdx + '-' + s + '"></span><br>';
        html += '<span style="color:var(--text-secondary);">' + fromName + ' &rarr; ' + toName + '</span><br>';
        html += '<span style="color:var(--text-muted);">' + formatTime(seg.departMin) + ' &rarr; ' + formatTime(seg.arriveMin) + ' &bull; ' + seg.stops.length + ' stops</span>';
        html += '</div>';
        if (s < segments.length - 1) {
            if (walkLeg && s === 0 && (best.type === 'walk-transfer' || best.type === 'walk-finish')) {
                html += '<div style="text-align:center;font-size:10px;color:var(--text-muted);">&darr; Walk ' + Math.round(walkLeg.dist) + 'm to ' + stopLookup[walkLeg.to].name + ' (' + walkLeg.walkMin + ' min)</div>';
            } else {
                var waitMin = segments[s + 1].departMin - seg.arriveMin;
                html += '<div style="text-align:center;font-size:10px;color:var(--text-muted);">&darr; Transfer at ' + (stopLookup[seg.stops[seg.stops.length - 1]] ? stopLookup[seg.stops[seg.stops.length - 1]].name : '?') + ' (' + waitMin + ' min wait)</div>';
            }
        }
    }
    if (walkLeg && best.type === 'walk-finish') {
        html += '<div style="text-align:center;font-size:10px;color:var(--text-muted);">&darr; Walk ' + Math.round(walkLeg.dist) + 'm (' + walkLeg.walkMin + ' min)</div>';
    }
    html += '<div style="margin-top:4px;color:var(--text-primary);"><b>Arrive:</b> MathWorks Lakeside at ' + formatTime(best.arriveMin) + '</div>';
    html += '</div>';
    return html;
}

async function selectTripOption(idx) {
    if (planTripSelectedIdx === idx) {
        // Collapse
        var detailDiv = document.getElementById('trip-option-detail-' + idx);
        if (detailDiv) detailDiv.style.display = 'none';
        var cards = document.querySelectorAll('#trip-result .trip-option-card');
        if (cards[idx]) { cards[idx].style.background = 'var(--bg-primary)'; cards[idx].style.borderColor = 'var(--border)'; }
        planTripSelectedIdx = -1;
        updateTripButtons();
        if (tripPath) { map.removeLayer(tripPath); tripPath = null; }
        showAll();
        return;
    }

    // Deselect previous
    if (planTripSelectedIdx >= 0) {
        var prevDetail = document.getElementById('trip-option-detail-' + planTripSelectedIdx);
        if (prevDetail) prevDetail.style.display = 'none';
        var cards = document.querySelectorAll('#trip-result .trip-option-card');
        if (cards[planTripSelectedIdx]) { cards[planTripSelectedIdx].style.background = 'var(--bg-primary)'; cards[planTripSelectedIdx].style.borderColor = 'var(--border)'; }
    }

    planTripSelectedIdx = idx;
    updateTripButtons();
    var cards = document.querySelectorAll('#trip-result .trip-option-card');
    if (cards[idx]) { cards[idx].style.background = 'var(--bg-selected)'; cards[idx].style.borderColor = 'var(--accent)'; }
    var detailDiv = document.getElementById('trip-option-detail-' + idx);
    if (detailDiv) detailDiv.style.display = 'block';

    // Fetch live bus status for this option
    updateLiveBusStatus(idx);

    // Draw route on map
    var chosen = planTripOptions[idx];
    if (!chosen) return;
    var best = chosen.trip;
    var lat = planTripUserLat, lon = planTripUserLon;

    hideAll();
    if (tripMarker) map.removeLayer(tripMarker);
    if (tripPath) map.removeLayer(tripPath);
    tripPath = L.layerGroup();

    var allCoords = [[lat, lon]];

    if (best.type === 'walk-only') {
        var dest = stopLookup[DEST_STOP_ID];
        var walkUrl = 'https://router.project-osrm.org/route/v1/foot/' + lon + ',' + lat + ';' + dest.lon + ',' + dest.lat + '?geometries=geojson&overview=full';
        try {
            var wResp = await fetch(walkUrl);
            var wData = await wResp.json();
            if (wData.code === 'Ok' && wData.routes && wData.routes.length > 0) {
                var wCoords = wData.routes[0].geometry.coordinates.map(function(p) { return [p[1], p[0]]; });
                L.polyline(wCoords, { color: '#555', weight: 4, dashArray: '6 8', opacity: 0.8 }).addTo(tripPath);
                wCoords.forEach(function(c) { allCoords.push(c); });
            }
        } catch (e) {
            L.polyline([[lat, lon], [dest.lat, dest.lon]], { color: '#555', weight: 4, dashArray: '6 8', opacity: 0.8 }).addTo(tripPath);
        }
        L.circleMarker([lat, lon], { radius: 7, color: 'white', weight: 3, fillColor: '#4363d8', fillOpacity: 1 }).bindTooltip('You', {permanent: true}).addTo(tripPath);
        L.circleMarker([dest.lat, dest.lon], { radius: 7, color: 'white', weight: 3, fillColor: '#228B22', fillOpacity: 1 }).bindTooltip(dest.name || 'Destination', {permanent: true}).addTo(tripPath);
        tripPath.addTo(map);
        map.fitBounds(L.latLngBounds(allCoords), {padding: [50, 50]});
        return;
    }

    var segments = buildTripSegments(chosen);
    var walkLeg = best.walkLeg || null;

    for (var s = 0; s < segments.length; s++) {
        var seg = segments[s];
        var segColor = routeColors[sortedRoutes.indexOf(seg.route) % routeColors.length];
        var stopCoords = seg.stops.map(function(sid) { return [stopLookup[sid].lat, stopLookup[sid].lon]; });
        var segStartCoord = null, segEndCoord = null;

        var vcSlice = getVcSliceForSegment(seg.route, seg.stops);
        if (vcSlice) {
            L.polyline(vcSlice, { color: segColor, weight: 5, opacity: 0.9 }).addTo(tripPath);
            vcSlice.forEach(function(c) { allCoords.push(c); });
            segStartCoord = vcSlice[0];
            segEndCoord = vcSlice[vcSlice.length - 1];
        } else {
            var coordStr = stopCoords.map(function(p) { return p[1] + ',' + p[0]; }).join(';');
            var osrmUrl = 'https://router.project-osrm.org/route/v1/driving/' + coordStr + '?geometries=geojson&overview=full';
            try {
                var osrmResp = await fetch(osrmUrl);
                var osrmData = await osrmResp.json();
                if (osrmData.code === 'Ok' && osrmData.routes && osrmData.routes.length > 0) {
                    var routedCoords = osrmData.routes[0].geometry.coordinates.map(function(p) { return [p[1], p[0]]; });
                    L.polyline(routedCoords, { color: segColor, weight: 5, opacity: 0.9 }).addTo(tripPath);
                    routedCoords.forEach(function(c) { allCoords.push(c); });
                    segStartCoord = routedCoords[0];
                    segEndCoord = routedCoords[routedCoords.length - 1];
                } else {
                    L.polyline(stopCoords, { color: segColor, weight: 5, opacity: 0.9 }).addTo(tripPath);
                    stopCoords.forEach(function(c) { allCoords.push(c); });
                    segStartCoord = stopCoords[0];
                    segEndCoord = stopCoords[stopCoords.length - 1];
                }
            } catch (e) {
                L.polyline(stopCoords, { color: segColor, weight: 5, opacity: 0.9 }).addTo(tripPath);
                stopCoords.forEach(function(c) { allCoords.push(c); });
                segStartCoord = stopCoords[0];
                segEndCoord = stopCoords[stopCoords.length - 1];
            }
        }

        // Connect polyline start to first stop if they're far apart
        var firstStop = stopLookup[seg.stops[0]];
        if (segStartCoord && haversine(segStartCoord[0], segStartCoord[1], firstStop.lat, firstStop.lon) > 100) {
            var connStartUrl = 'https://router.project-osrm.org/route/v1/driving/' + firstStop.lon + ',' + firstStop.lat + ';' + segStartCoord[1] + ',' + segStartCoord[0] + '?geometries=geojson&overview=full';
            try {
                var csResp = await fetch(connStartUrl);
                var csData = await csResp.json();
                if (csData.code === 'Ok' && csData.routes && csData.routes.length > 0) {
                    var csCoords = csData.routes[0].geometry.coordinates.map(function(p) { return [p[1], p[0]]; });
                    L.polyline(csCoords, { color: segColor, weight: 4, dashArray: '6 8', opacity: 0.7 }).addTo(tripPath);
                    csCoords.forEach(function(c) { allCoords.push(c); });
                }
            } catch (e) {}
        }

        // Connect polyline end to last stop if they're far apart
        var lastStop = stopLookup[seg.stops[seg.stops.length - 1]];
        if (segEndCoord && haversine(segEndCoord[0], segEndCoord[1], lastStop.lat, lastStop.lon) > 100) {
            var connEndUrl = 'https://router.project-osrm.org/route/v1/driving/' + segEndCoord[1] + ',' + segEndCoord[0] + ';' + lastStop.lon + ',' + lastStop.lat + '?geometries=geojson&overview=full';
            try {
                var ceResp = await fetch(connEndUrl);
                var ceData = await ceResp.json();
                if (ceData.code === 'Ok' && ceData.routes && ceData.routes.length > 0) {
                    var ceCoords = ceData.routes[0].geometry.coordinates.map(function(p) { return [p[1], p[0]]; });
                    L.polyline(ceCoords, { color: segColor, weight: 4, dashArray: '6 8', opacity: 0.7 }).addTo(tripPath);
                    ceCoords.forEach(function(c) { allCoords.push(c); });
                }
            } catch (e) {}
        }

        seg.stops.forEach(function(sid) {
            var st = stopLookup[sid];
            L.circleMarker([st.lat, st.lon], { radius: 5, color: 'white', weight: 2, fillColor: segColor, fillOpacity: 1 }).bindTooltip(st.name, {permanent: false}).addTo(tripPath);
        });
    }

    if (walkLeg) {
        var wFrom = stopLookup[walkLeg.from];
        var wTo = stopLookup[walkLeg.to];
        var walkCoordStr = wFrom.lon + ',' + wFrom.lat + ';' + wTo.lon + ',' + wTo.lat;
        var walkOsrmUrl = 'https://router.project-osrm.org/route/v1/foot/' + walkCoordStr + '?geometries=geojson&overview=full';
        try {
            var walkResp = await fetch(walkOsrmUrl);
            var walkData = await walkResp.json();
            if (walkData.code === 'Ok' && walkData.routes && walkData.routes.length > 0) {
                var walkCoords = walkData.routes[0].geometry.coordinates.map(function(p) { return [p[1], p[0]]; });
                L.polyline(walkCoords, { color: '#555', weight: 4, dashArray: '6 8', opacity: 0.8 }).addTo(tripPath);
                walkCoords.forEach(function(c) { allCoords.push(c); });
            }
        } catch (e) {}
    }

    var nearStop = stopLookup[chosen.startStop];
    var walkToStopUrl = 'https://router.project-osrm.org/route/v1/foot/' + lon + ',' + lat + ';' + nearStop.lon + ',' + nearStop.lat + '?geometries=geojson&overview=full';
    try {
        var wtsResp = await fetch(walkToStopUrl);
        var wtsData = await wtsResp.json();
        if (wtsData.code === 'Ok' && wtsData.routes && wtsData.routes.length > 0) {
            var wtsCoords = wtsData.routes[0].geometry.coordinates.map(function(p) { return [p[1], p[0]]; });
            L.polyline(wtsCoords, { color: '#333', weight: 3, dashArray: '4 6', opacity: 0.7 }).addTo(tripPath);
            wtsCoords.forEach(function(c) { allCoords.push(c); });
        }
    } catch (e) {}

    L.circleMarker([lat, lon], { radius: 7, color: 'white', weight: 3, fillColor: '#4363d8', fillOpacity: 1 }).bindTooltip('You', {permanent: true}).addTo(tripPath);
    var dest = stopLookup[DEST_STOP_ID];
    L.circleMarker([dest.lat, dest.lon], { radius: 7, color: 'white', weight: 3, fillColor: '#228B22', fillOpacity: 1 }).bindTooltip('MathWorks Lakeside', {permanent: true}).addTo(tripPath);

    tripPath.addTo(map);
    map.fitBounds(L.latLngBounds(allCoords), {padding: [50, 50]});
}

function findStopByName(name) {
    var lower = name.toLowerCase().trim();
    for (var id in stopLookup) {
        if (stopLookup[id].name.toLowerCase() === lower) return id;
    }
    for (var id in scheduleStops) {
        if (scheduleStops[id].name.toLowerCase() === lower) return id;
    }
    for (var id in stopLookup) {
        if (stopLookup[id].name.toLowerCase().indexOf(lower) !== -1) return id;
    }
    for (var id in scheduleStops) {
        if (scheduleStops[id].name.toLowerCase().indexOf(lower) !== -1) return id;
    }
    return null;
}

async function planTrip() {
    var resultDiv = document.getElementById('trip-result');
    var address = document.getElementById('trip-address').value.trim();
    var destInput = document.getElementById('trip-dest').value.trim();
    var timeVal = document.getElementById('trip-time').value;
    if (!address) {
        resultDiv.innerHTML = '<span style="color:red;">Please enter a starting address.</span>';
        return;
    }
    if (!destInput) {
        resultDiv.innerHTML = '<span style="color:red;">Please enter a destination.</span>';
        return;
    }
    if (!timeVal) {
        resultDiv.innerHTML = '<span style="color:red;">Please enter a time.</span>';
        return;
    }

    var timeParts = timeVal.split(':');
    var tripTimeMin = parseInt(timeParts[0]) * 60 + parseInt(timeParts[1]);
    var tripMode = document.getElementById('trip-mode').value;

    resultDiv.innerHTML = '<em>Resolving destination...</em>';

    var resolvedDestId = findStopByName(destInput);
    var destWalkInfo = '';
    if (!resolvedDestId) {
        try {
            var destGeoUrl = 'https://nominatim.openstreetmap.org/search?format=json&q=' +
                encodeURIComponent(destInput + ', Massachusetts') + '&limit=1';
            var destGeoResp = await fetch(destGeoUrl, {headers: {'User-Agent': 'MWRTA-TripPlanner/1.0'}});
            var destGeoResults = await destGeoResp.json();
            if (!destGeoResults || destGeoResults.length === 0) {
                resultDiv.innerHTML = '<span style="color:red;">Could not find that destination. Try a stop name or more specific address.</span>';
                return;
            }
            var destLat = parseFloat(destGeoResults[0].lat);
            var destLon = parseFloat(destGeoResults[0].lon);
            var nearestDest = findNearestStop(destLat, destLon);
            if (!nearestDest.id) {
                resultDiv.innerHTML = '<span style="color:red;">No stops found near that destination.</span>';
                return;
            }
            resolvedDestId = nearestDest.id;
            var destWalkMeters = Math.round(nearestDest.dist);
            var destWalkMin = Math.ceil(destWalkMeters / 80);
            var destStopName = stopLookup[nearestDest.id] ? stopLookup[nearestDest.id].name : (scheduleStops[nearestDest.id] ? scheduleStops[nearestDest.id].name : '?');
            if (destWalkMeters > 50) {
                destWalkInfo = '<div style="margin-bottom:6px;font-size:10px;color:var(--text-secondary);">Then walk ~' + destWalkMeters + 'm (~' + destWalkMin + ' min) from <b>' + destStopName + '</b> to destination.</div>';
            }
        } catch (e) {
            resultDiv.innerHTML = '<span style="color:red;">Destination lookup failed: ' + e.message + '</span>';
            return;
        }
    }

    DEST_STOP_ID = resolvedDestId;

    resultDiv.innerHTML = '<em>Geocoding address...</em>';

    var geocodeUrl = 'https://nominatim.openstreetmap.org/search?format=json&q=' +
        encodeURIComponent(address + ', Massachusetts') + '&limit=1';

    try {
        var response = await fetch(geocodeUrl, {headers: {'User-Agent': 'MWRTA-TripPlanner/1.0'}});
        var results = await response.json();

        if (!results || results.length === 0) {
            resultDiv.innerHTML = '<span style="color:red;">Could not find that address. Try being more specific.</span>';
            return;
        }

        var lat = parseFloat(results[0].lat);
        var lon = parseFloat(results[0].lon);
        planTripUserLat = lat;
        planTripUserLon = lon;

        var nearest = findNearestStop(lat, lon);
        if (!nearest.id) {
            resultDiv.innerHTML = '<span style="color:red;">No stops found nearby.</span>';
            return;
        }

        if (nearest.id === resolvedDestId) {
            var destName = stopLookup[resolvedDestId] ? stopLookup[resolvedDestId].name : (scheduleStops[resolvedDestId] ? scheduleStops[resolvedDestId].name : 'destination');
            resultDiv.innerHTML = '<b>You are already at ' + destName + '!</b> (' + Math.round(nearest.dist) + 'm away)';
            return;
        }

        resultDiv.innerHTML = '<em>Calculating walking times to stops...</em>';

        var WALK_SPEED_MPM = 83.33;
        var allStopIds = Object.keys(stopLookup);
        var coordsStr = lon + ',' + lat + ';' + allStopIds.map(function(id) {
            return stopLookup[id].lon + ',' + stopLookup[id].lat;
        }).join(';');
        var walkTableUrl = 'https://router.project-osrm.org/table/v1/foot/' + coordsStr + '?sources=0&annotations=distance';
        var walkTimesToStops = {};
        try {
            var wtResp = await fetch(walkTableUrl);
            var wtData = await wtResp.json();
            if (wtData.code === 'Ok') {
                for (var wi = 0; wi < allStopIds.length; wi++) {
                    var distM = wtData.distances[0][wi + 1];
                    if (distM !== null) {
                        walkTimesToStops[allStopIds[wi]] = { min: Math.ceil(distM / WALK_SPEED_MPM), dist: Math.round(distM) };
                    }
                }
            }
        } catch (e) {}

        if (Object.keys(walkTimesToStops).length === 0) {
            for (var wi = 0; wi < allStopIds.length; wi++) {
                var d = haversine(lat, lon, stopLookup[allStopIds[wi]].lat, stopLookup[allStopIds[wi]].lon);
                walkTimesToStops[allStopIds[wi]] = { min: Math.ceil(d / WALK_SPEED_MPM), dist: Math.round(d) };
            }
        }

        resultDiv.innerHTML = '<em>Finding best trips...</em>';

        var candidateStops = [];
        for (var sid in walkTimesToStops) {
            if (sid === DEST_STOP_ID) continue;
            var wt = walkTimesToStops[sid];
            if (wt.min <= 45) {
                candidateStops.push({ id: sid, walkMin: wt.min, walkDist: wt.dist });
            }
        }
        candidateStops.sort(function(a, b) { return a.walkMin - b.walkMin; });

        var walkCacheStopIds = Object.keys(stopLookup);
        var walkCacheCoords = walkCacheStopIds.map(function(id) {
            return stopLookup[id].lon + ',' + stopLookup[id].lat;
        }).join(';');
        var walkCacheUrl = 'https://router.project-osrm.org/table/v1/foot/' + walkCacheCoords + '?annotations=distance';
        var walkCache = { allStopIds: walkCacheStopIds, distances: null, stopIdxMap: {} };
        for (var wi = 0; wi < walkCacheStopIds.length; wi++) {
            walkCache.stopIdxMap[walkCacheStopIds[wi]] = wi;
        }
        try {
            var wcResp = await fetch(walkCacheUrl);
            var wcData = await wcResp.json();
            if (wcData.code === 'Ok') {
                walkCache.distances = wcData.distances;
            }
        } catch (e) {}

        var allTrips = [];
        for (var ci = 0; ci < candidateStops.length; ci++) {
            var cand = candidateStops[ci];
            var searchTime = tripMode === 'depart' ? tripTimeMin + cand.walkMin : tripTimeMin;
            var trips = await findTimetableTrips(cand.id, searchTime, walkCache, resolvedDestId, tripMode);
            for (var ti = 0; ti < trips.length; ti++) {
                var trip = trips[ti];
                var effectiveDepart = trip.departMin - cand.walkMin;
                if (tripMode === 'depart' && effectiveDepart < tripTimeMin) continue;
                if (trip.departMin >= cand.walkMin) {
                    allTrips.push({
                        trip: trip,
                        startStop: cand.id,
                        walkMin: cand.walkMin,
                        walkDist: cand.walkDist,
                        effectiveDepart: effectiveDepart,
                        arriveMin: trip.arriveMin
                    });
                }
            }
        }

        var destWalk = walkTimesToStops[DEST_STOP_ID];
        if (tripMode === 'depart') {
            if (destWalk) {
                allTrips.push({
                    trip: { type: 'walk-only', departMin: tripTimeMin, arriveMin: tripTimeMin + destWalk.min },
                    startStop: DEST_STOP_ID,
                    walkMin: destWalk.min,
                    walkDist: destWalk.dist,
                    effectiveDepart: tripTimeMin,
                    arriveMin: tripTimeMin + destWalk.min
                });
            }
        } else {
            if (destWalk && destWalk.min <= tripTimeMin) {
                allTrips.push({
                    trip: { type: 'walk-only', departMin: tripTimeMin - destWalk.min, arriveMin: tripTimeMin },
                    startStop: DEST_STOP_ID,
                    walkMin: destWalk.min,
                    walkDist: destWalk.dist,
                    effectiveDepart: tripTimeMin - destWalk.min,
                    arriveMin: tripTimeMin
                });
            }
        }

        if (allTrips.length === 0) {
            var noTripMsg = tripMode === 'depart' ? 'No trips found departing at ' + formatTime(tripTimeMin) + '.' : 'No trips found arriving by ' + formatTime(tripTimeMin) + '.';
            resultDiv.innerHTML = '<b>Nearest stop:</b> ' + stopLookup[nearest.id].name + ' (' + Math.round(nearest.dist) + 'm walk)<br>' +
                '<span style="color:red;">' + noTripMsg + '</span>';
            return;
        }

        // Pick best trip for each walking mode
        var nearestCandId = candidateStops.length > 0 ? candidateStops[0].id : nearest.id;
        var optMinimal = pickBestTrip(allTrips, 'minimal', nearestCandId, tripMode);
        var optModerate = pickBestTrip(allTrips, 'moderate', nearestCandId, tripMode);
        var optMax = pickBestTrip(allTrips, 'max', nearestCandId, tripMode);

        planTripOptions = [];
        var labels = [];

        function isBetter(a, b) {
            if (tripMode === 'depart') return a.arriveMin < b.arriveMin;
            return a.effectiveDepart > b.effectiveDepart;
        }

        if (optMinimal && optMax && !isBetter(optMax, optMinimal)) {
            planTripOptions.push(optMinimal);
            labels.push('Best option');
        } else {
            if (optMinimal) { planTripOptions.push(optMinimal); labels.push('Less walking'); }
            if (optModerate && (!optMinimal || isBetter(optModerate, optMinimal))) {
                planTripOptions.push(optModerate);
                labels.push('Moderate walking (≤1km)');
            }
            if (optMax && isBetter(optMax, (optModerate || optMinimal || {effectiveDepart: -1, arriveMin: Infinity}))) {
                planTripOptions.push(optMax);
                labels.push('Most efficient');
            }
        }

        planTripSelectedIdx = -1;

        var html = destWalkInfo || '';
        for (var i = 0; i < planTripOptions.length; i++) {
            html += '<div class="trip-option-card" onclick="selectTripOption(' + i + ')" style="border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px;margin-bottom:8px;background:var(--bg-primary);cursor:pointer;transition:border-color var(--transition),background var(--transition);" onmouseover="if(planTripSelectedIdx!==' + i + ')this.style.borderColor=\'var(--accent)\'" onmouseout="if(planTripSelectedIdx!==' + i + ')this.style.borderColor=\'var(--border)\'">';
            html += buildOptionSummaryHtml(planTripOptions[i], labels[i], i);
            html += '<div id="trip-option-detail-' + i + '" style="display:none;">' + buildOptionDetailHtml(planTripOptions[i], i) + '</div>';
            html += '</div>';
        }

        resultDiv.innerHTML = html;
        document.getElementById('trip-clear-wrap').style.display = '';
        tripActive = true;
        tripHidden = false;
        updateTripButtons();

        for (var i = 0; i < planTripOptions.length; i++) {
            updateLiveBusStatus(i);
        }

    } catch (err) {
        resultDiv.innerHTML = '<span style="color:red;">Error: ' + err.message + '</span>';
    }
}

function clearTrip() {
    tripActive = false;
    if (tripMarker) { map.removeLayer(tripMarker); tripMarker = null; }
    if (tripPath) { map.removeLayer(tripPath); tripPath = null; }
    document.getElementById('trip-result').innerHTML = '';
    document.getElementById('trip-address').value = '';
    document.getElementById('trip-clear-wrap').style.display = 'none';
    updateTripButtons();
    showAll();
}

var tripHidden = false;

function updateTripButtons() {
    var hideBtn = document.getElementById('trip-hide-btn');
    var trashBtn = document.getElementById('trip-trash-btn');
    var routeSelected = tripActive && planTripSelectedIdx >= 0;
    if (routeSelected) {
        hideBtn.style.opacity = '1';
        hideBtn.style.pointerEvents = 'auto';
    } else {
        hideBtn.style.opacity = '0.35';
        hideBtn.style.pointerEvents = 'none';
    }
    if (tripActive) {
        trashBtn.style.opacity = '1';
        trashBtn.style.pointerEvents = 'auto';
    } else {
        trashBtn.style.opacity = '0.35';
        trashBtn.style.pointerEvents = 'none';
    }
}

function toggleTripVisibility() {
    if (!tripActive || planTripSelectedIdx < 0) return;
    tripHidden = !tripHidden;
    var hideBtn = document.getElementById('trip-hide-btn');
    if (tripHidden) {
        if (tripPath) map.removeLayer(tripPath);
        hideBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>' +
            '<path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>' +
            '<line x1="1" y1="1" x2="23" y2="23"/></svg>';
    } else {
        if (tripPath) tripPath.addTo(map);
        hideBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    }
}

document.getElementById('trip-hide-btn').addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); toggleTripVisibility(); });
document.getElementById('trip-trash-btn').addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); clearTrip(); });

