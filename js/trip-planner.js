// --- Stop-to-Stop Trip Planner ---
(function() {
    var fromSel = document.getElementById('tripFrom');
    var toSel = document.getElementById('tripTo');
    var favorites = [
        { id: '21d931d9-b5d2-4425-8455-fa4bd7564736', name: 'Natick Center MBTA' },
        { id: '322f8fab-aa16-4f04-912d-f9047c240fa2', name: 'MathWorks Lakeside' },
        { id: 'd90d2719-8797-4ff5-a806-0a99498b48f8', name: 'MathWorks Apple Hill' }
    ];
    var stopList = Object.keys(scheduleStops).map(function(id) {
        return { id: id, name: scheduleStops[id].name };
    }).sort(function(a, b) { return a.name.localeCompare(b.name); });

    [fromSel, toSel].forEach(function(sel) {
        var favGroup = document.createElement('optgroup');
        favGroup.label = 'Favorites';
        favorites.forEach(function(s) {
            var o = document.createElement('option');
            o.value = s.id; o.textContent = s.name;
            favGroup.appendChild(o);
        });
        sel.appendChild(favGroup);
        var allGroup = document.createElement('optgroup');
        allGroup.label = 'All Stops';
        stopList.forEach(function(s) {
            var o = document.createElement('option');
            o.value = s.id; o.textContent = s.name;
            allGroup.appendChild(o);
        });
        sel.appendChild(allGroup);
    });

    var now = new Date();
    var hh = String(now.getHours()).padStart(2, '0');
    var mm = String(now.getMinutes()).padStart(2, '0');
    document.getElementById('tripTime').value = hh + ':' + mm;

    document.getElementById('tripFromAddress').addEventListener('input', function() {
        if (this.value.trim()) document.getElementById('tripFrom').value = '';
    });
    document.getElementById('tripFrom').addEventListener('change', function() {
        if (this.value) document.getElementById('tripFromAddress').value = '';
    });
    document.getElementById('tripFromAddress').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') planTripStops();
    });
    document.getElementById('tripToAddress').addEventListener('input', function() {
        if (this.value.trim()) document.getElementById('tripTo').value = '';
    });
    document.getElementById('tripTo').addEventListener('change', function() {
        if (this.value) document.getElementById('tripToAddress').value = '';
    });
    document.getElementById('tripToAddress').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') planTripStops();
    });
})();

function timeToMin(t) {
    var parts = t.split(':');
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

function minToTime(m) {
    var h = Math.floor(m / 60) % 24;
    var min = Math.floor(m % 60);
    var ampm = h >= 12 ? 'PM' : 'AM';
    var h12 = h % 12 || 12;
    return h12 + ':' + String(min).padStart(2, '0') + ' ' + ampm;
}

function findDirectRoutes2(fromId, toId, afterMin, windowMin) {
    var results = [];
    Object.keys(scheduleTrips).forEach(function(routeId) {
        scheduleTrips[routeId].forEach(function(trip) {
            var fromIdx = -1, toIdx = -1;
            for (var i = 0; i < trip.stops.length; i++) {
                if (trip.stops[i].s === fromId && fromIdx === -1) fromIdx = i;
                if (trip.stops[i].s === toId && fromIdx !== -1) { toIdx = i; break; }
            }
            if (fromIdx >= 0 && toIdx > fromIdx) {
                var depMin = timeToMin(trip.stops[fromIdx].a);
                var arrMin = timeToMin(trip.stops[toIdx].a);
                if (depMin >= afterMin && depMin <= afterMin + windowMin) {
                    results.push({ type: 'direct', routeId: routeId, trip: trip, fromIdx: fromIdx, toIdx: toIdx, depMin: depMin, arrMin: arrMin });
                }
            }
        });
    });
    // Also search tripStopTimes
    Object.keys(tripStopTimes).forEach(function(tripId) {
        var stops = tripStopTimes[tripId];
        var fromIdx = -1, toIdx = -1;
        for (var i = 0; i < stops.length; i++) {
            if (stops[i][0] === fromId && fromIdx === -1) fromIdx = i;
            if (stops[i][0] === toId && fromIdx !== -1) { toIdx = i; break; }
        }
        if (fromIdx >= 0 && toIdx > fromIdx) {
            var depMin = stops[fromIdx][1];
            var arrMin = stops[toIdx][1];
            if (depMin >= afterMin && depMin <= afterMin + windowMin) {
                var routeId = tripMeta[tripId] ? tripMeta[tripId][0] : 'unknown';
                var stopList = [];
                for (var si = fromIdx; si <= toIdx; si++) {
                    stopList.push({ s: stops[si][0], a: Math.floor(stops[si][1]/60) + ':' + String(stops[si][1]%60).padStart(2,'0') + ':00', d: 0 });
                }
                results.push({ type: 'direct', routeId: routeId, trip: { trip_id: tripId, stops: stopList, headsign: '', shape_id: null }, fromIdx: 0, toIdx: stopList.length - 1, depMin: depMin, arrMin: arrMin });
            }
        }
    });
    return results;
}

function findTripsForStop2(stopId, afterMin, windowMin) {
    var results = [];
    Object.keys(scheduleTrips).forEach(function(routeId) {
        scheduleTrips[routeId].forEach(function(trip) {
            for (var i = 0; i < trip.stops.length; i++) {
                if (trip.stops[i].s === stopId) {
                    var arrMin = timeToMin(trip.stops[i].a);
                    if (arrMin >= afterMin && arrMin <= afterMin + windowMin) {
                        results.push({ routeId: routeId, trip: trip, stopIdx: i, scheduledMin: arrMin });
                    }
                    break;
                }
            }
        });
    });
    return results;
}

function findConnections2(fromId, toId, afterMin, windowMin) {
    var results = [];
    var fromTrips = findTripsForStop2(fromId, afterMin, windowMin);
    fromTrips.forEach(function(ft) {
        var trip1 = ft.trip;
        for (var i = ft.stopIdx + 1; i < trip1.stops.length; i++) {
            var transferStopId = trip1.stops[i].s;
            if (transferStopId === toId) break;
            var transferArrMin = timeToMin(trip1.stops[i].a);
            var connectTrips = findDirectRoutes2(transferStopId, toId, transferArrMin + 2, 45);
            connectTrips.forEach(function(ct) {
                results.push({
                    type: 'connection',
                    leg1: { routeId: ft.routeId, trip: trip1, fromIdx: ft.stopIdx, toIdx: i, depMin: ft.scheduledMin, arrMin: transferArrMin },
                    leg2: { routeId: ct.routeId, trip: ct.trip, fromIdx: ct.fromIdx, toIdx: ct.toIdx, depMin: ct.depMin, arrMin: ct.arrMin },
                    transferStopId: transferStopId,
                    transferWait: ct.depMin - transferArrMin
                });
            });
        }
    });
    var seen = {};
    return results.filter(function(r) {
        var key = r.leg1.routeId + '>' + r.leg2.routeId + '@' + r.leg1.depMin;
        if (seen[key]) return false;
        seen[key] = true;
        return true;
    }).slice(0, 5);
}

var tripStopsHighlight = null;
var tripStopsResults = [];
var tripStopsSelectedIdx = -1;
var tripStopsSavedVisibility = null;

function updateTripCardHighlight(idx) {
    var cards = document.querySelectorAll('#tripResults > div[onclick]');
    cards.forEach(function(card, i) {
        if (i === idx) {
            card.style.background = 'var(--bg-selected)';
            card.style.borderColor = 'var(--accent)';
        } else {
            card.style.background = 'var(--bg-primary)';
            card.style.borderColor = 'var(--border)';
        }
    });
}

function showTripRoute(idx) {
    // Toggle off if clicking the same result again
    if (tripStopsSelectedIdx === idx) {
        if (tripStopsHighlight) { map.removeLayer(tripStopsHighlight); tripStopsHighlight = null; }
        tripStopsSelectedIdx = -1;
        updateTripCardHighlight(-1);
        if (tripStopsSavedVisibility) {
            sortedRoutes.forEach(function(id) {
                if (tripStopsSavedVisibility[id] && !routeActive[id] && routeLayers[id]) {
                    routeLayers[id].addTo(map);
                    routeActive[id] = true;
                }
            });
            sortedRoutes.forEach(function(id) {
                var cb = document.getElementById('cb-' + id);
                if (cb) cb.checked = routeActive[id];
            });
            tripStopsSavedVisibility = null;
        }
        return;
    }

    // Save current visibility on first selection
    if (tripStopsSelectedIdx === -1) {
        tripStopsSavedVisibility = {};
        sortedRoutes.forEach(function(id) {
            tripStopsSavedVisibility[id] = routeActive[id];
        });
        hideAll();
        routeLabelsLayer.clearLayers();
        map.removeLayer(routeLabelsLayer);
    }

    if (tripStopsHighlight) { map.removeLayer(tripStopsHighlight); tripStopsHighlight = null; }
    tripStopsSelectedIdx = idx;
    updateTripCardHighlight(idx);

    var opt = tripStopsResults[idx];
    if (!opt) return;
    tripStopsHighlight = L.layerGroup();
    var allCoords = [];
    var startStopId, endStopId;

    if (opt.type === 'direct') {
        var stopIds = [];
        for (var i = opt._fromIdx; i <= opt._toIdx; i++) {
            stopIds.push(opt._trip.stops[i].s);
        }
        startStopId = stopIds[0];
        endStopId = stopIds[stopIds.length - 1];
        var segColor = routeColors[sortedRoutes.indexOf(opt.routeId) % routeColors.length] || '#4363d8';
        var vcSlice = getVcSliceForSegment(opt.routeId, stopIds);
        if (vcSlice) {
            L.polyline(vcSlice, { color: segColor, weight: 5, opacity: 0.9 }).addTo(tripStopsHighlight);
            vcSlice.forEach(function(c) { allCoords.push(c); });
        } else {
            var coords = stopIds.map(function(sid) {
                var st = stopLookup[sid] || scheduleStops[sid];
                return st ? [st.lat, st.lon] : null;
            }).filter(Boolean);
            L.polyline(coords, { color: segColor, weight: 5, opacity: 0.9 }).addTo(tripStopsHighlight);
            coords.forEach(function(c) { allCoords.push(c); });
        }
        stopIds.forEach(function(sid) {
            if (sid === startStopId || sid === endStopId) return;
            var st = stopLookup[sid] || scheduleStops[sid];
            if (st) L.circleMarker([st.lat, st.lon], { radius: 5, color: 'white', weight: 2, fillColor: segColor, fillOpacity: 1 }).bindTooltip(st.name).addTo(tripStopsHighlight);
        });
    } else {
        var legs = [
            { routeId: opt.leg1RouteId, trip: opt._leg1Trip, fromIdx: opt._leg1FromIdx, toIdx: opt._leg1ToIdx },
            { routeId: opt.leg2RouteId, trip: opt._leg2Trip, fromIdx: opt._leg2FromIdx, toIdx: opt._leg2ToIdx }
        ];
        startStopId = legs[0].trip.stops[legs[0].fromIdx].s;
        endStopId = legs[legs.length - 1].trip.stops[legs[legs.length - 1].toIdx].s;
        legs.forEach(function(leg) {
            var stopIds = [];
            for (var i = leg.fromIdx; i <= leg.toIdx; i++) {
                stopIds.push(leg.trip.stops[i].s);
            }
            var segColor = routeColors[sortedRoutes.indexOf(leg.routeId) % routeColors.length] || '#4363d8';
            var vcSlice = getVcSliceForSegment(leg.routeId, stopIds);
            if (vcSlice) {
                L.polyline(vcSlice, { color: segColor, weight: 5, opacity: 0.9 }).addTo(tripStopsHighlight);
                vcSlice.forEach(function(c) { allCoords.push(c); });
            } else {
                var coords = stopIds.map(function(sid) {
                    var st = stopLookup[sid] || scheduleStops[sid];
                    return st ? [st.lat, st.lon] : null;
                }).filter(Boolean);
                L.polyline(coords, { color: segColor, weight: 5, opacity: 0.9 }).addTo(tripStopsHighlight);
                coords.forEach(function(c) { allCoords.push(c); });
            }
            stopIds.forEach(function(sid) {
                if (sid === startStopId || sid === endStopId) return;
                var st = stopLookup[sid] || scheduleStops[sid];
                if (st) L.circleMarker([st.lat, st.lon], { radius: 5, color: 'white', weight: 2, fillColor: segColor, fillOpacity: 1 }).bindTooltip(st.name).addTo(tripStopsHighlight);
            });
        });
    }

    // Add start and end markers
    var startStop = stopLookup[startStopId] || scheduleStops[startStopId];
    var endStop = stopLookup[endStopId] || scheduleStops[endStopId];
    if (startStop) {
        L.circleMarker([startStop.lat, startStop.lon], { radius: 8, color: 'white', weight: 3, fillColor: '#27ae60', fillOpacity: 1 }).bindTooltip('Start: ' + startStop.name, { permanent: true, direction: 'top' }).addTo(tripStopsHighlight);
    }
    if (endStop) {
        L.circleMarker([endStop.lat, endStop.lon], { radius: 8, color: 'white', weight: 3, fillColor: '#e74c3c', fillOpacity: 1 }).bindTooltip('End: ' + endStop.name, { permanent: true, direction: 'top' }).addTo(tripStopsHighlight);
    }

    tripStopsHighlight.addTo(map);
    if (startStop) allCoords.push([startStop.lat, startStop.lon]);
    if (endStop) allCoords.push([endStop.lat, endStop.lon]);
    if (allCoords.length > 1) {
        map.fitBounds(L.latLngBounds(allCoords), { paddingTopLeft: [360, 50], paddingBottomRight: [50, 50] });
    }
}

async function planTripStops() {
    if (tripStopsHighlight) { map.removeLayer(tripStopsHighlight); tripStopsHighlight = null; }
    if (tripStopsSavedVisibility) {
        sortedRoutes.forEach(function(id) {
            if (tripStopsSavedVisibility[id] && !routeActive[id] && routeLayers[id]) {
                routeLayers[id].addTo(map);
                routeActive[id] = true;
            }
        });
        sortedRoutes.forEach(function(id) {
            var cb = document.getElementById('cb-' + id);
            if (cb) cb.checked = routeActive[id];
        });
        tripStopsSavedVisibility = null;
    }
    tripStopsSelectedIdx = -1;
    tripStopsResults = [];
    var fromId = document.getElementById('tripFrom').value;
    var fromAddress = document.getElementById('tripFromAddress').value.trim();
    var toId = document.getElementById('tripTo').value;
    var toAddress = document.getElementById('tripToAddress').value.trim();
    var resultsDiv = document.getElementById('tripResults');
    var walkInfo = '';
    var walkEndInfo = '';

    if (fromAddress) {
        resultsDiv.innerHTML = '<div style="font-size:12px;color:var(--text-muted);text-align:center;padding:12px;">Finding location...</div>';
        try {
            var geocodeUrl = 'https://nominatim.openstreetmap.org/search?format=json&q=' +
                encodeURIComponent(fromAddress + ', Massachusetts') + '&limit=1';
            var geoResp = await fetch(geocodeUrl, {headers: {'User-Agent': 'MWRTA-TripPlanner/1.0'}});
            var geoResults = await geoResp.json();
            if (!geoResults || geoResults.length === 0) {
                resultsDiv.innerHTML = '<div style="color:#e74c3c;font-size:12px;">Could not find that origin address. Try being more specific.</div>';
                return;
            }
            var lat = parseFloat(geoResults[0].lat);
            var lon = parseFloat(geoResults[0].lon);
            var nearest = findNearestStop(lat, lon);
            if (!nearest.id) {
                resultsDiv.innerHTML = '<div style="color:#e74c3c;font-size:12px;">No stops found near that location.</div>';
                return;
            }
            fromId = nearest.id;
            var walkMeters = Math.round(nearest.dist);
            var walkMin = Math.ceil(walkMeters / 80);
            var stopName = stopLookup[nearest.id] ? stopLookup[nearest.id].name : (scheduleStops[nearest.id] ? scheduleStops[nearest.id].name : '?');
            walkInfo = '<div style="background:var(--accent-soft);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px 10px;margin-bottom:8px;font-size:11px;color:var(--text-primary);">Walk from origin to <b>' + stopName + '</b> (~' + walkMeters + 'm, ~' + walkMin + ' min)</div>';
        } catch (e) {
            resultsDiv.innerHTML = '<div style="color:#e74c3c;font-size:12px;">Geocoding failed: ' + e.message + '</div>';
            return;
        }
    }

    if (toAddress) {
        resultsDiv.innerHTML = '<div style="font-size:12px;color:var(--text-muted);text-align:center;padding:12px;">Finding destination...</div>';
        try {
            var geoUrlTo = 'https://nominatim.openstreetmap.org/search?format=json&q=' +
                encodeURIComponent(toAddress + ', Massachusetts') + '&limit=1';
            var geoRespTo = await fetch(geoUrlTo, {headers: {'User-Agent': 'MWRTA-TripPlanner/1.0'}});
            var geoResultsTo = await geoRespTo.json();
            if (!geoResultsTo || geoResultsTo.length === 0) {
                resultsDiv.innerHTML = '<div style="color:#e74c3c;font-size:12px;">Could not find that destination address. Try being more specific.</div>';
                return;
            }
            var destLat = parseFloat(geoResultsTo[0].lat);
            var destLon = parseFloat(geoResultsTo[0].lon);
            var nearestTo = findNearestStop(destLat, destLon);
            if (!nearestTo.id) {
                resultsDiv.innerHTML = '<div style="color:#e74c3c;font-size:12px;">No stops found near that destination.</div>';
                return;
            }
            toId = nearestTo.id;
            var walkMetersTo = Math.round(nearestTo.dist);
            var walkMinTo = Math.ceil(walkMetersTo / 80);
            var destStopName = stopLookup[nearestTo.id] ? stopLookup[nearestTo.id].name : (scheduleStops[nearestTo.id] ? scheduleStops[nearestTo.id].name : '?');
            walkEndInfo = '<div style="background:var(--accent-soft);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px 10px;margin-bottom:8px;font-size:11px;color:var(--text-primary);">Walk from <b>' + destStopName + '</b> to destination (~' + walkMetersTo + 'm, ~' + walkMinTo + ' min)</div>';
        } catch (e) {
            resultsDiv.innerHTML = '<div style="color:#e74c3c;font-size:12px;">Geocoding failed: ' + e.message + '</div>';
            return;
        }
    }

    if (!fromId || !toId) {
        resultsDiv.innerHTML = '<div style="font-size:12px;color:var(--text-muted);text-align:center;padding:12px;">Enter an address or select a stop for both origin and destination.</div>';
        return;
    }
    if (fromId === toId) {
        resultsDiv.innerHTML = '<div style="font-size:12px;color:var(--text-muted);text-align:center;padding:12px;">Origin and destination are the same stop.</div>';
        return;
    }

    var timeMode = document.getElementById('tripTimeMode').value;
    var timeVal = document.getElementById('tripTime').value;
    var now2 = new Date();
    var nowMin = now2.getHours() * 60 + now2.getMinutes();
    var targetMin = nowMin;
    var userSetTime = false;
    if (timeVal) {
        var parts = timeVal.split(':');
        targetMin = parseInt(parts[0]) * 60 + parseInt(parts[1]);
        userSetTime = true;
    }

    var searchStart, searchWindow;
    if (timeMode === 'depart') {
        searchStart = userSetTime ? targetMin : nowMin;
        searchWindow = 180;
    } else {
        searchStart = targetMin - 120;
        searchWindow = 120;
    }

    var direct = findDirectRoutes2(fromId, toId, searchStart, searchWindow);
    var connections = findConnections2(fromId, toId, searchStart, searchWindow);

    var allOptions = [];
    direct.forEach(function(d) {
        allOptions.push({ type: 'direct', routeId: d.routeId, headsign: d.trip.headsign, scheduledDep: d.depMin, scheduledArr: d.arrMin, estDep: d.depMin, estArr: d.arrMin, duration: d.arrMin - d.depMin, _trip: d.trip, _fromIdx: d.fromIdx, _toIdx: d.toIdx });
    });
    connections.forEach(function(c) {
        allOptions.push({
            type: 'connection', leg1RouteId: c.leg1.routeId, leg2RouteId: c.leg2.routeId,
            transferStop: scheduleStops[c.transferStopId] ? scheduleStops[c.transferStopId].name : '?',
            scheduledDep: c.leg1.depMin, scheduledArr: c.leg2.arrMin,
            estDep: c.leg1.depMin, estArr: c.leg2.arrMin,
            duration: c.leg2.arrMin - c.leg1.depMin, buffer: c.leg2.depMin - c.leg1.arrMin,
            _leg1Trip: c.leg1.trip, _leg1FromIdx: c.leg1.fromIdx, _leg1ToIdx: c.leg1.toIdx,
            _leg2Trip: c.leg2.trip, _leg2FromIdx: c.leg2.fromIdx, _leg2ToIdx: c.leg2.toIdx
        });
    });

    if (timeMode === 'depart') {
        allOptions.sort(function(a, b) { return a.estDep - b.estDep; });
    } else {
        allOptions = allOptions.filter(function(o) { return o.estArr <= targetMin; });
        allOptions.sort(function(a, b) { return a.estArr - b.estArr; });
    }

    // If no results, try wider search
    if (allOptions.length === 0) {
        var fallbackDirect = findDirectRoutes2(fromId, toId, searchStart, 480);
        var fallbackConnections = findConnections2(fromId, toId, searchStart, 480);
        fallbackDirect.forEach(function(d) {
            allOptions.push({ type: 'direct', routeId: d.routeId, headsign: d.trip.headsign, scheduledDep: d.depMin, scheduledArr: d.arrMin, estDep: d.depMin, estArr: d.arrMin, duration: d.arrMin - d.depMin, _trip: d.trip, _fromIdx: d.fromIdx, _toIdx: d.toIdx });
        });
        fallbackConnections.forEach(function(c) {
            allOptions.push({
                type: 'connection', leg1RouteId: c.leg1.routeId, leg2RouteId: c.leg2.routeId,
                transferStop: scheduleStops[c.transferStopId] ? scheduleStops[c.transferStopId].name : '?',
                scheduledDep: c.leg1.depMin, scheduledArr: c.leg2.arrMin,
                estDep: c.leg1.depMin, estArr: c.leg2.arrMin,
                duration: c.leg2.arrMin - c.leg1.depMin, buffer: c.leg2.depMin - c.leg1.arrMin,
                _leg1Trip: c.leg1.trip, _leg1FromIdx: c.leg1.fromIdx, _leg1ToIdx: c.leg1.toIdx,
                _leg2Trip: c.leg2.trip, _leg2FromIdx: c.leg2.fromIdx, _leg2ToIdx: c.leg2.toIdx
            });
        });
        allOptions.sort(function(a, b) { return a.estDep - b.estDep; });
        if (allOptions.length > 0) {
            walkInfo += '<div style="color:#b57800;background:#fff8e0;border:1px solid #ffe082;border-radius:var(--radius-sm);padding:8px 10px;margin-bottom:8px;font-size:11px;">No ideal match. Showing all upcoming trips:</div>';
        }
    }

    allOptions = allOptions.slice(0, 10);

    if (allOptions.length === 0) {
        resultsDiv.innerHTML = '<div style="font-size:12px;color:var(--text-muted);text-align:center;padding:12px;">No trips found between these stops.</div>';
        return;
    }

    tripStopsResults = allOptions;
    var html = (walkInfo || '') + (walkEndInfo || '');
    allOptions.forEach(function(opt, idx) {
        html += '<div onclick="showTripRoute(' + idx + ')" style="border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px;margin-bottom:8px;background:var(--bg-primary);cursor:pointer;transition:border-color var(--transition);" onmouseover="this.style.borderColor=\'var(--accent)\'" onmouseout="this.style.borderColor=\'var(--border)\'">';
        if (opt.type === 'direct') {
            var shortName = scheduleRouteShort[opt.routeId] || '?';
            var rColor = routeColors[sortedRoutes.indexOf(opt.routeId) % routeColors.length] || '#4363d8';
            html += '<div style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text-primary);">';
            html += '<span style="font-weight:600;min-width:45px;">' + minToTime(opt.estDep) + '</span>';
            html += '<span style="min-width:32px;height:18px;border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;color:white;padding:0 4px;background:' + rColor + ';">' + shortName + '</span>';
            html += '<span>' + (opt.headsign || '') + '</span></div>';
            html += '<div style="font-size:11px;color:var(--text-secondary);margin-top:4px;">Arrive ' + minToTime(opt.estArr) + ' (' + opt.duration + ' min)</div>';
        } else {
            var short1 = scheduleRouteShort[opt.leg1RouteId] || '?';
            var short2 = scheduleRouteShort[opt.leg2RouteId] || '?';
            var rColor1 = routeColors[sortedRoutes.indexOf(opt.leg1RouteId) % routeColors.length] || '#4363d8';
            var rColor2 = routeColors[sortedRoutes.indexOf(opt.leg2RouteId) % routeColors.length] || '#4363d8';
            html += '<div style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text-primary);">';
            html += '<span style="font-weight:600;min-width:45px;">' + minToTime(opt.estDep) + '</span>';
            html += '<span style="min-width:32px;height:18px;border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;color:white;padding:0 4px;background:' + rColor1 + ';">' + short1 + '</span>';
            html += '<span style="font-size:10px;color:var(--text-muted);">→</span>';
            html += '<span style="min-width:32px;height:18px;border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;color:white;padding:0 4px;background:' + rColor2 + ';">' + short2 + '</span></div>';
            html += '<div style="font-size:10px;color:var(--text-secondary);margin-top:4px;">Transfer at ' + opt.transferStop + ' (' + opt.buffer + ' min wait)</div>';
            html += '<div style="font-size:11px;color:var(--text-secondary);">Arrive ' + minToTime(opt.estArr) + ' (' + opt.duration + ' min total)</div>';
        }
        html += '</div>';
    });

    resultsDiv.innerHTML = html;
