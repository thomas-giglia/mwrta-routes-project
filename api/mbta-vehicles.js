export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    const apiKey = process.env.MBTA_API_KEY;
    if (!apiKey) {
        res.status(500).json({ error: 'MBTA_API_KEY not configured' });
        return;
    }

    const { swLat, swLng, neLat, neLng } = req.query;
    if (!swLat || !swLng || !neLat || !neLng) {
        res.status(400).json({ error: 'Bounding box parameters required: swLat, swLng, neLat, neLng' });
        return;
    }

    try {
        const url = `https://api-v3.mbta.com/vehicles?filter[route_type]=3&include=route&page[limit]=1000&api_key=${apiKey}`;
        const response = await fetch(url);
        if (!response.ok) {
            res.status(response.status).json({ error: 'MBTA API error: ' + response.statusText });
            return;
        }

        const json = await response.json();

        const routeMap = {};
        if (json.included) {
            json.included.forEach(function(item) {
                if (item.type === 'route') {
                    routeMap[item.id] = {
                        short_name: item.attributes.short_name || item.id,
                        long_name: item.attributes.long_name || '',
                        color: item.attributes.color ? '#' + item.attributes.color : '#1a73e8'
                    };
                }
            });
        }

        const sw = { lat: parseFloat(swLat), lng: parseFloat(swLng) };
        const ne = { lat: parseFloat(neLat), lng: parseFloat(neLng) };

        const vehicles = [];
        if (json.data) {
            for (const v of json.data) {
                const attrs = v.attributes;
                if (attrs.current_status === 'STOPPED_AT' && attrs.speed === 0 && !attrs.latitude) continue;
                if (!attrs.latitude || !attrs.longitude) continue;

                if (attrs.latitude < sw.lat || attrs.latitude > ne.lat) continue;
                if (attrs.longitude < sw.lng || attrs.longitude > ne.lng) continue;

                const routeId = v.relationships && v.relationships.route && v.relationships.route.data
                    ? v.relationships.route.data.id : null;
                const routeData = routeId ? routeMap[routeId] : null;

                vehicles.push({
                    id: v.id,
                    label: attrs.label || v.id,
                    latitude: attrs.latitude,
                    longitude: attrs.longitude,
                    bearing: attrs.bearing,
                    speed: attrs.speed,
                    status: attrs.current_status,
                    route_id: routeId,
                    route_name: routeData ? routeData.short_name : (routeId || 'Unknown'),
                    route_long_name: routeData ? routeData.long_name : '',
                    route_color: routeData ? routeData.color : '#1a73e8'
                });

                // no cap for testing
            }
        }

        res.status(200).json({ vehicles: vehicles, count: vehicles.length });
    } catch (err) {
        res.status(502).json({ error: 'Failed to fetch from MBTA API: ' + err.message });
    }
}
