import base64
import secrets
from itertools import combinations
from typing import Dict, List, Tuple


PRIME = 257


def _inverse_mod(a: int, p: int) -> int:
    return pow(a, p - 2, p)


def _encode_share(values: List[int]) -> str:
    raw = bytearray()
    for v in values:
        raw.extend(v.to_bytes(2, "big"))
    return base64.b64encode(bytes(raw)).decode("utf-8")


def _decode_share(value: str) -> List[int]:
    raw = base64.b64decode(value.encode("utf-8"))
    if len(raw) % 2 != 0:
        raise ValueError("Invalid share encoding")
    return [int.from_bytes(raw[i : i + 2], "big") for i in range(0, len(raw), 2)]


class DNAShardCloudEscape:
    """2-of-3 Shamir style key sharding for wallet root-key custody."""

    @staticmethod
    def split_key(key: bytes) -> Dict[str, str]:
        shares: Dict[int, List[int]] = {1: [], 2: [], 3: []}
        for b in key:
            slope = secrets.randbelow(PRIME - 1) + 1
            for x in (1, 2, 3):
                y = (b + slope * x) % PRIME
                shares[x].append(y)

        return {
            "ipfs": f"1:{_encode_share(shares[1])}",
            "device": f"2:{_encode_share(shares[2])}",
            "enclave": f"3:{_encode_share(shares[3])}",
        }

    @staticmethod
    def reconstruct_key(shards: Dict[str, str]) -> bytes:
        if len(shards) < 2:
            raise ValueError("At least 2 shards are required")

        parsed: List[Tuple[int, List[int]]] = []
        for payload in shards.values():
            x_str, encoded = payload.split(":", maxsplit=1)
            parsed.append((int(x_str), _decode_share(encoded)))

        for (x1, y1), (x2, y2) in combinations(parsed, 2):
            if len(y1) != len(y2):
                continue
            key = []
            for a, b in zip(y1, y2):
                # Lagrange interpolation at x=0 for linear polynomial.
                t1 = (a * x2 * _inverse_mod((x2 - x1) % PRIME, PRIME)) % PRIME
                t2 = (b * x1 * _inverse_mod((x1 - x2) % PRIME, PRIME)) % PRIME
                secret = (t1 + t2) % PRIME
                if secret > 255:
                    raise ValueError("Invalid shard pair supplied")
                key.append(secret)
            return bytes(key)

        raise ValueError("Unable to reconstruct from provided shards")
