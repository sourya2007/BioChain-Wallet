import hashlib
import secrets
from dataclasses import dataclass


@dataclass
class StealthOutput:
    one_time_address: str
    sender_ephemeral_pub: str


class StealthAddressProtocol:
    """Hash-based one-time address construction for receiver unlinkability."""

    @staticmethod
    def create_one_time_address(scan_public_key: str, spend_public_key: str) -> StealthOutput:
        eph_priv = secrets.token_bytes(32)
        eph_pub = hashlib.sha256(eph_priv).hexdigest()

        shared_hint = hashlib.sha256((eph_pub + scan_public_key).encode("utf-8")).hexdigest()
        one_time = hashlib.sha256((shared_hint + spend_public_key).encode("utf-8")).hexdigest()
        return StealthOutput(
            one_time_address=f"stl1{one_time[:44]}",
            sender_ephemeral_pub=eph_pub,
        )

    @staticmethod
    def receiver_can_link(scan_private_key: str, spend_public_key: str, sender_ephemeral_pub: str, candidate_address: str) -> bool:
        shared_hint = hashlib.sha256((sender_ephemeral_pub + scan_private_key).encode("utf-8")).hexdigest()
        predicted = hashlib.sha256((shared_hint + spend_public_key).encode("utf-8")).hexdigest()
        return candidate_address == f"stl1{predicted[:44]}"
