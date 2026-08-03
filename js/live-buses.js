// --- Live Bus Tracking ---
var busMarkersLayer = L.layerGroup().addTo(map);
var busMarkers = {};
var liveBusesEnabled = true;

var routeColorLookup = {};
var routeNameToId = {};
sortedRoutes.forEach(function(routeId, idx) {
    var info = routeInfo[routeId];
    routeColorLookup[info.long_name] = routeColors[idx % routeColors.length];
    routeColorLookup[info.short_name] = routeColors[idx % routeColors.length];
    routeNameToId[info.long_name] = routeId;
    routeNameToId[info.short_name] = routeId;
});

function getRouteShape(routeName) {
    var routeId = routeNameToId[routeName];
    if (!routeId) return null;
    var shapeId = routeShapesDir[routeId + '_0'] || routeShapesDir[routeId + '_1'] || bestShapes[routeId];
    if (shapeId && shapeDataOriginal[shapeId]) return shapeDataOriginal[shapeId];
    if (shapeId && shapeData[shapeId]) return shapeData[shapeId];
    return null;
}

function snapToRoute(lat, lon, shape) {
    var bestDist = Infinity, bestIdx = 0, bestFrac = 0;
    for (var i = 0; i < shape.length - 1; i++) {
        var ax = shape[i][0], ay = shape[i][1];
        var bx = shape[i+1][0], by = shape[i+1][1];
        var dx = bx - ax, dy = by - ay;
        var len2 = dx*dx + dy*dy;
        var t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((lat - ax)*dx + (lon - ay)*dy) / len2));
        var px = ax + t*dx, py = ay + t*dy;
        var dist = (lat - px)*(lat - px) + (lon - py)*(lon - py);
        if (dist < bestDist) {
            bestDist = dist;
            bestIdx = i;
            bestFrac = t;
        }
    }
    return { idx: bestIdx, frac: bestFrac };
}

function routeDistance(shape, idx1, frac1, idx2, frac2) {
    if (idx2 < idx1 || (idx2 === idx1 && frac2 < frac1)) return 0;
    var dist = 0;
    if (idx1 === idx2) {
        var a = shape[idx1], b = shape[idx1+1];
        return haversine(a[0], a[1], b[0], b[1]) * (frac2 - frac1);
    }
    var seg0 = shape[idx1], seg0b = shape[idx1+1];
    dist += haversine(seg0[0], seg0[1], seg0b[0], seg0b[1]) * (1 - frac1);
    for (var i = idx1 + 1; i < idx2; i++) {
        dist += haversine(shape[i][0], shape[i][1], shape[i+1][0], shape[i+1][1]);
    }
    var segN = shape[idx2], segNb = shape[idx2+1];
    dist += haversine(segN[0], segN[1], segNb[0], segNb[1]) * frac2;
    return dist;
}

function advanceAlongRoute(shape, idx, frac, distMeters) {
    var remaining = distMeters;
    var curIdx = idx, curFrac = frac;
    while (remaining > 0 && curIdx < shape.length - 1) {
        var ax = shape[curIdx][0], ay = shape[curIdx][1];
        var bx = shape[curIdx+1][0], by = shape[curIdx+1][1];
        var segLen = haversine(ax, ay, bx, by);
        var segRemaining = segLen * (1 - curFrac);
        if (remaining <= segRemaining) {
            curFrac += remaining / segLen;
            remaining = 0;
        } else {
            remaining -= segRemaining;
            curIdx++;
            curFrac = 0;
        }
    }
    if (curIdx >= shape.length - 1) { curIdx = shape.length - 2; curFrac = 1; }
    var a = shape[curIdx], b = shape[curIdx+1];
    var lat = a[0] + curFrac * (b[0] - a[0]);
    var lon = a[1] + curFrac * (b[1] - a[1]);
    var heading = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
    heading = 90 - heading;
    if (heading < 0) heading += 360;
    return { lat: lat, lon: lon, heading: heading, idx: curIdx, frac: curFrac };
}

function isForwardOnRoute(shape, fromIdx, fromFrac, toIdx, toFrac) {
    return toIdx > fromIdx || (toIdx === fromIdx && toFrac >= fromFrac);
}

function createBusIcon(heading, color) {
    var rotation = (heading != null && !isNaN(heading)) ? heading : null;
    var dirIndicatorHtml = '';
    if (rotation !== null) {
        dirIndicatorHtml = '<div style="' +
            'position:absolute;top:-4px;left:50%;transform:translateX(-50%) rotate(' + rotation + 'deg);' +
            'width:16px;height:16px;pointer-events:none;' +
            '">' +
            '<svg width="16" height="16" viewBox="0 0 20 20" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,0.3));">' +
            '<polygon points="10,2 4,16 10,12 16,16" fill="white" stroke="' + color + '" stroke-width="2" stroke-linejoin="round"/>' +
            '</svg></div>';
    }
    return L.divIcon({
        className: '',
        html: '<div style="' +
            'width:36px;height:44px;position:relative;cursor:pointer;' +
            '">' +
            dirIndicatorHtml +
            '<svg width="36" height="36" viewBox="0 0 36 36" style="position:absolute;top:8px;left:0;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.4));">' +
            '<rect x="6" y="4" width="24" height="28" rx="5" ry="5" fill="' + color + '" stroke="white" stroke-width="2"/>' +
            '<rect x="10" y="8" width="16" height="8" rx="2" fill="white" opacity="0.9"/>' +
            '<circle cx="12" cy="28" r="3" fill="white"/>' +
            '<circle cx="24" cy="28" r="3" fill="white"/>' +
            '<rect x="10" y="20" width="4" height="4" rx="1" fill="white" opacity="0.6"/>' +
            '<rect x="16" y="20" width="4" height="4" rx="1" fill="white" opacity="0.6"/>' +
            '<rect x="22" y="20" width="4" height="4" rx="1" fill="white" opacity="0.6"/>' +
            '</svg></div>',
        iconSize: [36, 44],
        iconAnchor: [18, 26],
        popupAnchor: [0, -26]
    });
}

var busInterpolationState = {};
var busAnimationFrame = null;
var busHeadingHistory = {};
var INTERPOLATION_DURATION = 10000;
var HEADING_HISTORY_SIZE = 5;
var MAX_BUS_SPEED_MPS = 27; // ~60 mph cap
var MAX_DIST_PER_UPDATE = MAX_BUS_SPEED_MPS * (INTERPOLATION_DURATION / 1000);

function averageHeading(history) {
    if (!history || history.length === 0) return null;
    var sinSum = 0, cosSum = 0;
    for (var i = 0; i < history.length; i++) {
        var rad = history[i] * Math.PI / 180;
        sinSum += Math.sin(rad);
        cosSum += Math.cos(rad);
    }
    var avg = Math.atan2(sinSum / history.length, cosSum / history.length) * 180 / Math.PI;
    if (avg < 0) avg += 360;
    return avg;
}

function fetchLiveBuses() {
    if (!liveBusesEnabled) return;
    fetch('/api/vehicles')
        .then(function(res) { return res.json(); })
        .then(function(vehicles) {
            var activeIds = {};
            var now = performance.now();
            vehicles.forEach(function(v) {
                if (!v.Active || !v.Lat || !v.Long) return;
                var id = v.VehiclePlate || v.ID;
                activeIds[id] = true;
                var color = routeColorLookup[v.Route] || '#333';
                var shape = getRouteShape(v.Route);
                var heading = v.Heading;
                var newSnap = null;

                if (shape) {
                    newSnap = snapToRoute(v.Lat, v.Long, shape);
                }

                var prev = busInterpolationState[id];
                var startIdx, startFrac;

                if (prev && prev.shape === shape && shape && prev.targetIdx != null) {
                    // Use the current displayed position as the start
                    // (which is the previous target, i.e. where the bus "actually" was 10s ago)
                    startIdx = prev.targetIdx;
                    startFrac = prev.targetFrac;
                    // If new target is behind current start on route, don't go backwards — hold position
                    if (newSnap && !isForwardOnRoute(shape, startIdx, startFrac, newSnap.idx, newSnap.frac)) {
                        newSnap = { idx: startIdx, frac: startFrac };
                    }
                } else if (newSnap) {
                    startIdx = newSnap.idx;
                    startFrac = newSnap.frac;
                } else {
                    startIdx = null;
                    startFrac = null;
                }

                busInterpolationState[id] = {
                    shape: shape,
                    color: color,
                    heading: heading,
                    route: v.Route,
                    plate: v.VehiclePlate || '',
                    speed: v.Speed,
                    address: v.AddressStreet ? v.AddressStreet + ', ' + v.AddressCity : '',
                    startIdx: startIdx,
                    startFrac: startFrac,
                    targetIdx: newSnap ? newSnap.idx : null,
                    targetFrac: newSnap ? newSnap.frac : null,
                    totalDist: (shape && startIdx != null && newSnap)
                        ? Math.min(routeDistance(shape, startIdx, startFrac, newSnap.idx, newSnap.frac), MAX_DIST_PER_UPDATE) : 0,
                    fetchTime: now,
                    rawLat: v.Lat,
                    rawLon: v.Long
                };

                // On first appearance, place marker at start position (the "old" position)
                var displayLat, displayLon;
                if (shape && startIdx != null) {
                    var a = shape[startIdx], b = shape[startIdx + 1];
                    displayLat = a[0] + startFrac * (b[0] - a[0]);
                    displayLon = a[1] + startFrac * (b[1] - a[1]);
                } else {
                    displayLat = v.Lat;
                    displayLon = v.Long;
                }

                if (heading != null && !isNaN(heading)) {
                    if (!busHeadingHistory[id]) busHeadingHistory[id] = [];
                    busHeadingHistory[id].push(heading);
                    if (busHeadingHistory[id].length > HEADING_HISTORY_SIZE) {
                        busHeadingHistory[id].shift();
                    }
                }
                var displayHeading = busHeadingHistory[id] && busHeadingHistory[id].length > 0
                    ? averageHeading(busHeadingHistory[id]) : heading;
                var icon = createBusIcon(displayHeading, color);
                var popupContent = '<b>Bus ' + (v.VehiclePlate || '') + '</b><br>' +
                    'Route: ' + (v.Route || 'Unknown') + '<br>' +
                    'Speed: ' + (v.Speed ? v.Speed.toFixed(1) + ' mph' : 'Stopped') + '<br>' +
                    (v.AddressStreet ? v.AddressStreet + ', ' + v.AddressCity : '');

                if (busMarkers[id]) {
                    busMarkers[id].setLatLng([displayLat, displayLon]);
                    busMarkers[id].setIcon(icon);
                    busMarkers[id].setPopupContent(popupContent);
                } else {
                    busMarkers[id] = L.marker([displayLat, displayLon], { icon: icon, zIndexOffset: 1000 })
                        .bindPopup(popupContent)
                        .addTo(busMarkersLayer);
                }
            });
            Object.keys(busMarkers).forEach(function(id) {
                if (!activeIds[id]) {
                    busMarkersLayer.removeLayer(busMarkers[id]);
                    delete busMarkers[id];
                    delete busInterpolationState[id];
                    delete busHeadingHistory[id];
                }
            });
        })
        .catch(function(err) {
            console.warn('Live bus fetch failed:', err.message);
        });
}

function animateBuses() {
    var now = performance.now();
    Object.keys(busInterpolationState).forEach(function(id) {
        var state = busInterpolationState[id];
        if (!state.shape || state.startIdx == null || state.targetIdx == null) return;
        if (state.totalDist <= 0) return;
        if (!busMarkers[id]) return;

        var elapsed = now - state.fetchTime;
        var t = Math.min(1, elapsed / INTERPOLATION_DURATION);

        var dist = state.totalDist * t;
        var pos = advanceAlongRoute(state.shape, state.startIdx, state.startFrac, dist);

        var smoothedHeading = busHeadingHistory[id] && busHeadingHistory[id].length > 0
            ? averageHeading(busHeadingHistory[id]) : state.heading;

        busMarkers[id].setLatLng([pos.lat, pos.lon]);
        busMarkers[id].setIcon(createBusIcon(smoothedHeading, state.color));
    });
    busAnimationFrame = requestAnimationFrame(animateBuses);
}

function toggleLiveBuses() {
    liveBusesEnabled = document.getElementById('showBuses').checked;
    if (liveBusesEnabled) {
        busMarkersLayer.addTo(map);
        fetchLiveBuses();
        if (!busAnimationFrame) busAnimationFrame = requestAnimationFrame(animateBuses);
    } else {
        map.removeLayer(busMarkersLayer);
        if (busAnimationFrame) { cancelAnimationFrame(busAnimationFrame); busAnimationFrame = null; }
    }
}

fetchLiveBuses();
setInterval(fetchLiveBuses, 10000);
busAnimationFrame = requestAnimationFrame(animateBuses);

// --- MBTA Live Bus Tracking ---
var mbtaBusesEnabled = true;
var mbtaBusMarkers = {};
var mbtaBusMarkersLayer = L.layerGroup().addTo(map);
var mbtaBusInterpolationState = {};
var mbtaBusHeadingHistory = {};

function createMbtaBusIcon(heading, color) {
    var rotation = (heading != null && !isNaN(heading)) ? heading : null;
    var dirIndicatorHtml = '';
    if (rotation !== null) {
        dirIndicatorHtml = '<div style="' +
            'position:absolute;top:-4px;left:50%;transform:translateX(-50%) rotate(' + rotation + 'deg);' +
            'width:14px;height:14px;pointer-events:none;' +
            '">' +
            '<svg width="14" height="14" viewBox="0 0 20 20" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,0.3));">' +
            '<polygon points="10,2 4,16 10,12 16,16" fill="white" stroke="' + color + '" stroke-width="2" stroke-linejoin="round"/>' +
            '</svg></div>';
    }
    return L.divIcon({
        className: '',
        html: '<div style="' +
            'width:30px;height:38px;position:relative;cursor:pointer;' +
            '">' +
            dirIndicatorHtml +
            '<svg width="30" height="30" viewBox="0 0 36 36" style="position:absolute;top:8px;left:0;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.4));">' +
            '<rect x="6" y="4" width="24" height="28" rx="5" ry="5" fill="' + color + '" stroke="white" stroke-width="2"/>' +
            '<rect x="10" y="8" width="16" height="8" rx="2" fill="white" opacity="0.9"/>' +
            '<circle cx="12" cy="28" r="3" fill="white"/>' +
            '<circle cx="24" cy="28" r="3" fill="white"/>' +
            '<rect x="10" y="20" width="4" height="4" rx="1" fill="white" opacity="0.6"/>' +
            '<rect x="16" y="20" width="4" height="4" rx="1" fill="white" opacity="0.6"/>' +
            '<rect x="22" y="20" width="4" height="4" rx="1" fill="white" opacity="0.6"/>' +
            '</svg></div>',
        iconSize: [30, 38],
        iconAnchor: [15, 22],
        popupAnchor: [0, -22]
    });
}

function fetchMbtaBuses() {
    if (!mbtaBusesEnabled) return;
    var bounds = map.getBounds();
    var sw = bounds.getSouthWest();
    var ne = bounds.getNorthEast();
    var url = '/api/mbta-vehicles?swLat=' + sw.lat + '&swLng=' + sw.lng +
              '&neLat=' + ne.lat + '&neLng=' + ne.lng;

    fetch(url)
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (!data.vehicles) return;
            var activeIds = {};
            var now = performance.now();
            data.vehicles.forEach(function(v) {
                var id = 'mbta_' + v.id;
                activeIds[id] = true;
                var color = v.route_color || '#1a73e8';
                var heading = v.bearing;

                var prev = mbtaBusInterpolationState[id];
                mbtaBusInterpolationState[id] = {
                    lat: v.latitude,
                    lon: v.longitude,
                    prevLat: prev ? prev.lat : v.latitude,
                    prevLon: prev ? prev.lon : v.longitude,
                    heading: heading,
                    color: color,
                    fetchTime: now,
                    route_name: v.route_name,
                    route_long_name: v.route_long_name,
                    label: v.label,
                    speed: v.speed,
                    status: v.status
                };

                if (heading != null && !isNaN(heading)) {
                    if (!mbtaBusHeadingHistory[id]) mbtaBusHeadingHistory[id] = [];
                    mbtaBusHeadingHistory[id].push(heading);
                    if (mbtaBusHeadingHistory[id].length > HEADING_HISTORY_SIZE) {
                        mbtaBusHeadingHistory[id].shift();
                    }
                }
                var displayHeading = mbtaBusHeadingHistory[id] && mbtaBusHeadingHistory[id].length > 0
                    ? averageHeading(mbtaBusHeadingHistory[id]) : heading;
                var icon = createMbtaBusIcon(displayHeading, color);

                var statusText = v.status ? v.status.replace(/_/g, ' ').toLowerCase() : '';
                var speedText = v.speed ? (v.speed * 2.237).toFixed(1) + ' mph' : 'Stopped';
                var popupContent = '<b>MBTA Bus ' + (v.label || v.id) + '</b><br>' +
                    'Route: ' + v.route_name + (v.route_long_name ? ' - ' + v.route_long_name : '') + '<br>' +
                    'Speed: ' + speedText + '<br>' +
                    'Status: ' + statusText;

                var displayLat = prev ? prev.lat : v.latitude;
                var displayLon = prev ? prev.lon : v.longitude;

                if (mbtaBusMarkers[id]) {
                    mbtaBusMarkers[id].setLatLng([displayLat, displayLon]);
                    mbtaBusMarkers[id].setIcon(icon);
                    mbtaBusMarkers[id].setPopupContent(popupContent);
                } else {
                    mbtaBusMarkers[id] = L.marker([displayLat, displayLon], { icon: icon, zIndexOffset: 900 })
                        .bindPopup(popupContent)
                        .addTo(mbtaBusMarkersLayer);
                }
            });
            Object.keys(mbtaBusMarkers).forEach(function(id) {
                if (!activeIds[id]) {
                    mbtaBusMarkersLayer.removeLayer(mbtaBusMarkers[id]);
                    delete mbtaBusMarkers[id];
                    delete mbtaBusInterpolationState[id];
                    delete mbtaBusHeadingHistory[id];
                }
            });
        })
        .catch(function(err) {
            console.warn('MBTA bus fetch failed:', err.message);
        });
}

function animateMbtaBuses() {
    var now = performance.now();
    Object.keys(mbtaBusInterpolationState).forEach(function(id) {
        var state = mbtaBusInterpolationState[id];
        if (!mbtaBusMarkers[id]) return;
        var elapsed = now - state.fetchTime;
        var t = Math.min(1, elapsed / 10000);
        var lat = state.prevLat + (state.lat - state.prevLat) * t;
        var lon = state.prevLon + (state.lon - state.prevLon) * t;
        mbtaBusMarkers[id].setLatLng([lat, lon]);
    });
    if (mbtaBusesEnabled) requestAnimationFrame(animateMbtaBuses);
}

function toggleMbtaBuses() {
    mbtaBusesEnabled = document.getElementById('showMbtaBuses').checked;
    if (mbtaBusesEnabled) {
        mbtaBusMarkersLayer.addTo(map);
        fetchMbtaBuses();
        requestAnimationFrame(animateMbtaBuses);
    } else {
        map.removeLayer(mbtaBusMarkersLayer);
    }
}

fetchMbtaBuses();
setInterval(fetchMbtaBuses, 10000);
requestAnimationFrame(animateMbtaBuses);
map.on('moveend', function() { if (mbtaBusesEnabled) fetchMbtaBuses(); });

