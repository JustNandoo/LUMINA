"""Topologi jaringan KRL: urutan stasiun per lin, dan pencarian rute di atasnya.

Kenapa urutan ditulis eksplisit, bukan diturunkan dari daftar STATIONS: satu
stasiun bisa dilewati beberapa lin (Manggarai dilewati Lin Bogor dan Lin
Cikarang), dan justru stasiun seperti itulah yang jadi titik transit. Urutan
dalam daftar stasiun tidak bisa menyatakan hal tersebut.

Urutan di bawah adalah penyederhanaan jaringan sebenarnya — cukup untuk
menghitung lintasan dan titik transit, tetapi belum mencakup seluruh stasiun
antara. Ganti dengan data resmi KAI Commuter sebelum rilis.
"""
from __future__ import annotations

from collections import deque

from lumina.data.network import find_station

# Tiap lin adalah urutan stasiun dari ujung ke ujung. Stasiun yang muncul di
# lebih dari satu lin otomatis menjadi titik transit.
LINE_ROUTES: dict[str, list[str]] = {
    "Bogor": [
        "jakarta-kota", "jayakarta", "mangga-besar", "sawah-besar", "juanda",
        "gondangdia", "cikini", "manggarai", "tebet", "cawang",
        "duren-kalibata", "pasar-minggu", "tanjung-barat", "lenteng-agung",
        "universitas-indonesia", "pondok-cina", "depok-baru", "citayam",
        "bojonggede", "bogor",
    ],
    # Lin Cikarang lewat lingkar Manggarai–Sudirman–Tanah Abang–Duri.
    "Cikarang": [
        "cikarang", "bekasi", "kranji", "cakung", "buaran", "klender",
        "jatinegara", "manggarai", "sudirman", "tanah-abang", "duri",
        "kampung-bandan",
    ],
    "Rangkasbitung": [
        "tanah-abang", "palmerah", "kebayoran", "pondok-ranji", "sudimara",
        "rawa-buntu", "serpong",
    ],
    "Tangerang": [
        "duri", "grogol", "pesing", "kalideres", "batuceper", "tangerang",
    ],
    "Tanjung Priok": [
        "jakarta-kota", "kampung-bandan", "ancol", "tanjung-priok",
    ],
}


def _build_graph() -> dict[str, list[tuple[str, str]]]:
    """station_id -> [(tetangga, nama lin), ...]"""
    graph: dict[str, list[tuple[str, str]]] = {}
    for line, sequence in LINE_ROUTES.items():
        for left, right in zip(sequence, sequence[1:]):
            graph.setdefault(left, []).append((right, line))
            graph.setdefault(right, []).append((left, line))
    return graph


GRAPH = _build_graph()

# Lin apa saja yang melewati satu stasiun.
LINES_OF: dict[str, list[str]] = {}
for _line, _sequence in LINE_ROUTES.items():
    for _station in _sequence:
        LINES_OF.setdefault(_station, []).append(_line)


def is_interchange(station_id: str) -> bool:
    return len(LINES_OF.get(station_id, [])) > 1


def find_path(origin_id: str, destination_id: str) -> list[tuple[str, str | None]] | None:
    """Lintasan stasiun terpendek (jumlah perhentian) dari asal ke tujuan.

    Hasil: [(station_id, lin yang dipakai untuk tiba di stasiun ini), ...];
    elemen pertama selalu berpasangan dengan None karena belum menaiki apa pun.
    Return None kalau kedua stasiun tidak terhubung di jaringan.
    """
    if origin_id == destination_id:
        return [(origin_id, None)]
    if origin_id not in GRAPH or destination_id not in GRAPH:
        return None

    # BFS: bobot tiap sisi sama (satu perhentian), jadi antrean biasa sudah
    # menghasilkan lintasan terpendek.
    queue = deque([origin_id])
    came_from: dict[str, tuple[str, str]] = {}
    seen = {origin_id}

    while queue:
        current = queue.popleft()
        for neighbour, line in GRAPH.get(current, []):
            if neighbour in seen:
                continue
            seen.add(neighbour)
            came_from[neighbour] = (current, line)
            if neighbour == destination_id:
                queue.clear()
                break
            queue.append(neighbour)

    if destination_id not in came_from:
        return None

    path: list[tuple[str, str | None]] = []
    node = destination_id
    while node != origin_id:
        previous, line = came_from[node]
        path.append((node, line))
        node = previous
    path.append((origin_id, None))
    path.reverse()
    return path


def segments_of(path: list[tuple[str, str | None]]) -> list[dict]:
    """Pecah lintasan menjadi ruas per lin; pergantian lin = satu transit."""
    if len(path) < 2:
        return []

    segments: list[dict] = []
    current_line = path[1][1]
    current_stations = [path[0][0]]

    for station_id, line in path[1:]:
        if line != current_line:
            segments.append({"line": current_line, "stations": current_stations})
            current_stations = [current_stations[-1]]
            current_line = line
        current_stations.append(station_id)

    segments.append({"line": current_line, "stations": current_stations})
    return segments


def describe_route(origin_id: str, destination_id: str) -> dict | None:
    """Rute lengkap siap dikirim ke klien: lintasan, ruas, transit, geometri."""
    path = find_path(origin_id, destination_id)
    if path is None:
        return None

    station_ids = [station_id for station_id, _ in path]
    stations = [find_station(station_id) for station_id in station_ids]
    raw_segments = segments_of(path)

    segments = []
    for segment in raw_segments:
        members = [find_station(item) for item in segment["stations"]]
        segments.append({
            "line": segment["line"],
            "from": {"id": members[0]["id"], "name": members[0]["name"]},
            "to": {"id": members[-1]["id"], "name": members[-1]["name"]},
            "stop_count": len(members) - 1,
            "stations": [
                {
                    "id": item["id"],
                    "name": item["name"],
                    "position": item["position"],
                }
                for item in members
            ],
        })

    # Titik transit = stasiun tempat lin berganti (ujung tiap ruas kecuali akhir).
    transfers = [
        {
            "station_id": segment["to"]["id"],
            "station_name": segment["to"]["name"],
            "from_line": segment["line"],
            "to_line": segments[index + 1]["line"],
        }
        for index, segment in enumerate(segments[:-1])
    ]

    return {
        "path": [
            {
                "id": item["id"],
                "name": item["name"],
                "position": item["position"],
                "interchange": is_interchange(item["id"]),
            }
            for item in stations
        ],
        "segments": segments,
        "transfers": transfers,
        "stop_count": len(station_ids) - 1,
        # GeoJSON LineString mengikuti urutan stasiun — dipakai frontend untuk
        # menggambar jalur di peta, bukan garis lurus asal ke tujuan.
        "geometry": {
            "type": "LineString",
            "coordinates": [
                [item["position"][1], item["position"][0]] for item in stations
            ],
        },
    }
