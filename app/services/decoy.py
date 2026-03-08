import hashlib
import time
from typing import Dict, List


class DecoyInjector:
    """Creates periodic dummy transactions to reduce behavioral fingerprinting."""

    @staticmethod
    def generate_decoys(wallet_id: str, count: int) -> List[Dict[str, str]]:
        now = int(time.time())
        results: List[Dict[str, str]] = []
        for i in range(count):
            entropy = f"{wallet_id}:{now}:{i}"
            addr = hashlib.sha256(f"decoy:{entropy}".encode("utf-8")).hexdigest()
            tx = hashlib.sha256(f"decoy-tx:{entropy}".encode("utf-8")).hexdigest()
            results.append(
                {
                    "tx_id": tx,
                    "to": f"dcy1{addr[:40]}",
                    "amount": "0.000001",
                }
            )
        return results
