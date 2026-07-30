"""Generate timetable_data.js from GTFS files for the MWRTA route map."""
import csv
import json
import os
import re

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))


def time_to_minutes(time_str):
    h, m, _ = time_str.split(':')
    return int(h) * 60 + int(m)


def parse_route_stops_ordered():
    """Parse routeStopsOrdered from the JS file."""
    path = os.path.join(SCRIPT_DIR, 'route_stops_ordered.js')
    with open(path, 'r') as f:
        content = f.read()
    # Extract the object content between the first { and last }
    start = content.index('{')
    end = content.rindex('}') + 1
    json_str = content[start:end]
    # Remove trailing commas before } or ] (JS allows them, JSON doesn't)
    json_str = re.sub(r',\s*([}\]])', r'\1', json_str)
    return json.loads(json_str)


def parse_trips():
    """Parse trips.txt -> {trip_id: {route_id, direction_id, service_id}}"""
    trips = {}
    path = os.path.join(SCRIPT_DIR, 'trips.txt')
    with open(path, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            trips[row['trip_id']] = {
                'route_id': row['route_id'],
                'direction_id': int(row['direction_id']),
                'service_id': row['service_id'],
            }
    return trips


def parse_stop_times():
    """Parse stop_times.txt -> {trip_id: [{stop_id, arrival_minutes, stop_sequence}]}"""
    stop_times = {}
    path = os.path.join(SCRIPT_DIR, 'stop_times.txt')
    with open(path, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            trip_id = row['trip_id']
            if trip_id not in stop_times:
                stop_times[trip_id] = []
            stop_times[trip_id].append({
                'stop_id': row['stop_id'],
                'arrival_minutes': time_to_minutes(row['arrival_time']),
                'stop_sequence': int(row['stop_sequence']),
            })
    # Sort each trip's stops by sequence
    for trip_id in stop_times:
        stop_times[trip_id].sort(key=lambda x: x['stop_sequence'])
    return stop_times


def parse_calendar_dates():
    """Parse calendar_dates.txt -> {service_id: [dates]}"""
    calendar = {}
    path = os.path.join(SCRIPT_DIR, 'calendar_dates.txt')
    with open(path, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            svc = row['service_id']
            if row['exception_type'] == '1':
                if svc not in calendar:
                    calendar[svc] = []
                calendar[svc].append(int(row['date']))
    for svc in calendar:
        calendar[svc].sort()
    return calendar


def build_timetable(route_stops_ordered, trips, stop_times):
    """Build timetable data aligned to routeStopsOrdered."""
    timetable = {}

    # Group trips by route_id + direction_id
    route_dir_trips = {}
    for trip_id, trip_info in trips.items():
        key = f"{trip_info['route_id']}_{trip_info['direction_id']}"
        if key not in route_dir_trips:
            route_dir_trips[key] = []
        route_dir_trips[key].append(trip_id)

    for key, ordered_stops in route_stops_ordered.items():
        if key not in route_dir_trips:
            continue

        trip_entries = []
        for trip_id in route_dir_trips[key]:
            if trip_id not in stop_times:
                continue

            trip_info = trips[trip_id]
            trip_stops = stop_times[trip_id]

            # Build a lookup: stop_id -> list of arrival times in sequence order
            # (a stop can appear multiple times in a trip for loop routes)
            stop_arrivals = {}
            for st in trip_stops:
                sid = st['stop_id']
                if sid not in stop_arrivals:
                    stop_arrivals[sid] = []
                stop_arrivals[sid].append(st['arrival_minutes'])

            # Align to ordered_stops: for each position, consume the next
            # available time for that stop_id
            stop_usage = {}  # track how many times we've used each stop_id
            times_array = []
            for stop_id in ordered_stops:
                if stop_id not in stop_arrivals:
                    times_array.append(None)
                else:
                    idx = stop_usage.get(stop_id, 0)
                    arrivals = stop_arrivals[stop_id]
                    if idx < len(arrivals):
                        times_array.append(arrivals[idx])
                        stop_usage[stop_id] = idx + 1
                    else:
                        times_array.append(None)

            # Only include if we matched at least 2 stops
            matched = sum(1 for t in times_array if t is not None)
            if matched >= 2:
                svc_short = trip_info['service_id'][:8]
                trip_entries.append((svc_short, times_array))

        # Sort trips by their first non-null time
        def sort_key(entry):
            for t in entry[1]:
                if t is not None:
                    return t
            return 99999

        trip_entries.sort(key=sort_key)
        if trip_entries:
            timetable[key] = trip_entries

    return timetable


def main():
    print("Parsing route_stops_ordered.js...")
    route_stops_ordered = parse_route_stops_ordered()
    print(f"  Found {len(route_stops_ordered)} route/direction keys")

    print("Parsing trips.txt...")
    trips = parse_trips()
    print(f"  Found {len(trips)} trips")

    print("Parsing stop_times.txt...")
    stop_times = parse_stop_times()
    print(f"  Found stop times for {len(stop_times)} trips")

    print("Parsing calendar_dates.txt...")
    calendar = parse_calendar_dates()
    print(f"  Found {len(calendar)} service IDs")

    print("Building timetable data...")
    timetable = build_timetable(route_stops_ordered, trips, stop_times)
    print(f"  Generated timetables for {len(timetable)} route/directions")

    total_trips = sum(len(v) for v in timetable.values())
    print(f"  Total trips: {total_trips}")

    # Build service calendar with short keys
    service_calendar = {}
    for svc_id, dates in calendar.items():
        service_calendar[svc_id[:8]] = dates

    # Write output
    output_path = os.path.join(SCRIPT_DIR, 'timetable_data.js')
    with open(output_path, 'w') as f:
        f.write('var timetableData = ')
        f.write(json.dumps(timetable, separators=(',', ':')))
        f.write(';\n\n')
        f.write('var serviceCalendar = ')
        f.write(json.dumps(service_calendar, separators=(',', ':')))
        f.write(';\n')

    size_kb = os.path.getsize(output_path) / 1024
    print(f"\nWritten to {output_path} ({size_kb:.1f} KB)")


if __name__ == '__main__':
    main()
