"""Geocoding service using OpenStreetMap Nominatim (free)."""
from typing import Optional, Tuple
import time
import requests


class GeocodingService:
    """Lightweight geocoder for customer addresses."""

    def __init__(self, user_agent: str = "sellfiz-erp/1.0"):
        self.user_agent = user_agent
        self.base_url = "https://nominatim.openstreetmap.org/search"

    def geocode(self, address: str, country_codes: Optional[str] = None) -> Optional[Tuple[float, float, str]]:
        """Return (lat, lng, display_name) or None."""
        if not address or not address.strip():
            return None

        params = {
            "q": address,
            "format": "json",
            "limit": 1,
        }
        if country_codes:
            params["countrycodes"] = country_codes

        headers = {
            "User-Agent": self.user_agent
        }

        try:
            resp = requests.get(self.base_url, params=params, headers=headers, timeout=10)
            if resp.status_code != 200:
                return None
            data = resp.json()
        except Exception:
            return None
        if not data:
            return None

        item = data[0]
        try:
            lat = float(item.get("lat"))
            lng = float(item.get("lon"))
        except Exception:
            return None

        display_name = item.get("display_name") or ""
        # Be polite with Nominatim usage policy
        time.sleep(1)
        return lat, lng, display_name
