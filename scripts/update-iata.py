"""Download reference data and generate the local, compact IATA directory.

Only run during maintenance. The browser never calls these external services.
OurAirports: public domain. Travelpayouts: public reference data endpoints.
"""
import csv
import datetime
import io
import json
import pathlib
import re
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCES = {
    "airports": "https://raw.githubusercontent.com/davidmegginson/ourairports-data/main/airports.csv",
    "cities": "https://api.travelpayouts.com/data/fr/cities.json",
    "cityLinks": "https://api.travelpayouts.com/data/fr/airports.json",
}


def download(url):
    request = urllib.request.Request(url, headers={"User-Agent": "CDG-Parking-data-maintenance/2.0"})
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read().decode("utf-8-sig")


def valid(code):
    return bool(re.fullmatch(r"[A-Z]{3}", code or ""))


def main():
    airports = list(csv.DictReader(io.StringIO(download(SOURCES["airports"]))))
    cities = {r["code"]: r for r in json.loads(download(SOURCES["cities"])) if valid(r.get("code"))}
    city_links = {r["code"]: r for r in json.loads(download(SOURCES["cityLinks"])) if valid(r.get("code")) and r.get("iata_type") == "airport"}
    locations = []
    airport_codes = set()
    for airport in airports:
        code = airport.get("iata_code", "")
        if not valid(code):
            continue
        link = city_links.get(code, {})
        city_code = link.get("city_code", "")
        city = cities.get(city_code, {}).get("name") or airport.get("municipality", "")
        locations.append([code, airport["name"], city, airport["iso_country"], airport["type"], city_code, airport.get("icao_code", "")])
        airport_codes.add(code)
    for code, city in cities.items():
        if code not in airport_codes:
            name = city.get("name") or city.get("name_translations", {}).get("en") or "Nom non renseigné"
            locations.append([code, name, "", city.get("country_code", ""), "city", code, ""])
    locations.sort(key=lambda row: (row[0], row[1]))
    # Validate before replacing the existing snapshot; never publish partial data.
    if len(airport_codes) < 8000 or len(locations) < 9000:
        raise RuntimeError("Unexpectedly small source data; the existing snapshot was retained.")
    if not {"CDG", "ORY", "JFK", "LHR", "PAR", "LON", "NYC"}.issubset({row[0] for row in locations}):
        raise RuntimeError("Essential codes missing; the existing snapshot was retained.")
    payload = {
        "schema": 1,
        "updatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "columns": ["code", "name", "city", "country", "type", "cityCode", "icao"],
        "sources": SOURCES,
        "coverage": "Public airport and city reference data; not the licensed official IATA register.",
        "locations": locations,
    }
    target = ROOT / "public" / "data" / "iata.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    temporary.replace(target)
    print(f"IATA: {len(locations):,} entries, {len(airport_codes):,} airport codes; {target.stat().st_size:,} bytes.")


if __name__ == "__main__":
    main()
