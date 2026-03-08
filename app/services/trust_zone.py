import math
from dataclasses import dataclass
from typing import Literal, Set, Tuple


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    return 2 * r * math.asin(math.sqrt(a))


@dataclass
class TrustProfile:
    home_location: Tuple[float, float]
    known_devices: Set[str]


@dataclass
class TrustDecision:
    trust_score: float
    zone: Literal["high", "unknown", "new_device"]
    action: Literal["full_access", "dna_reauth_and_delay", "social_recovery_quorum"]
    delay_seconds: int


class GeoGenomicTrustEngine:
    def __init__(self, home_radius_km: float = 2.0) -> None:
        self.home_radius_km = home_radius_km

    def evaluate(
        self,
        profile: TrustProfile,
        latitude: float,
        longitude: float,
        device_fingerprint: str,
        dna_reauth_passed: bool,
    ) -> TrustDecision:
        home_lat, home_lon = profile.home_location
        distance = haversine_km(home_lat, home_lon, latitude, longitude)
        known_device = device_fingerprint in profile.known_devices

        score = 0.0
        score += 0.5 if distance <= self.home_radius_km else 0.1
        score += 0.4 if known_device else 0.0
        score += 0.1 if dna_reauth_passed else 0.0

        if known_device and distance <= self.home_radius_km:
            return TrustDecision(score, "high", "full_access", 0)
        if not known_device:
            return TrustDecision(score, "new_device", "social_recovery_quorum", 0)
        return TrustDecision(score, "unknown", "dna_reauth_and_delay", 120)
