import hashlib
import secrets
import uuid
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set

from app.services.decoy import DecoyInjector
from app.services.hd_wallet import HDWallet
from app.services.shard_escape import DNAShardCloudEscape
from app.services.stealth import StealthAddressProtocol
from app.services.trust_zone import GeoGenomicTrustEngine, TrustProfile
from app.services.zk_dna import ZKDNAVerifier


@dataclass
class WalletRecord:
    wallet_id: str
    dna_commitment: str
    root_key: bytes
    hd_wallet: HDWallet
    scan_private_key: str
    scan_public_key: str
    spend_private_key: str
    spend_public_key: str
    trust_profile: TrustProfile
    owner_profile_id: Optional[str] = None
    currency: str = "GENERIC"
    shards: Dict[str, str] = field(default_factory=dict)


@dataclass
class UserProfile:
    profile_id: str
    profile_name: str
    dna_commitment: str
    wallet_ids: Set[str] = field(default_factory=set)


@dataclass
class ConnectionSession:
    token: str
    profile_id: str
    wallet_id: str


class VaultService:
    def __init__(self, home_radius_km: float = 2.0) -> None:
        self._wallets: Dict[str, WalletRecord] = {}
        self._profiles: Dict[str, UserProfile] = {}
        self._sessions: Dict[str, ConnectionSession] = {}
        self._trust_engine = GeoGenomicTrustEngine(home_radius_km=home_radius_km)

    def create_profile(self, profile_name: str, dna_commitment: str) -> UserProfile:
        profile = UserProfile(
            profile_id=str(uuid.uuid4()),
            profile_name=profile_name,
            dna_commitment=dna_commitment,
        )
        self._profiles[profile.profile_id] = profile
        return profile

    def get_profile(self, profile_id: str) -> UserProfile:
        if profile_id not in self._profiles:
            raise KeyError("Profile not found")
        return self._profiles[profile_id]

    def create_wallet(
        self,
        dna_commitment: str,
        home_latitude: float,
        home_longitude: float,
        device_fingerprint: str,
    ) -> WalletRecord:
        wallet_id = str(uuid.uuid4())
        salt = secrets.token_hex(16)
        root_key = hashlib.sha256(f"{dna_commitment}:{salt}".encode("utf-8")).digest()

        scan_private = secrets.token_hex(32)
        spend_private = secrets.token_hex(32)
        scan_public = hashlib.sha256(scan_private.encode("utf-8")).hexdigest()
        spend_public = hashlib.sha256(spend_private.encode("utf-8")).hexdigest()

        record = WalletRecord(
            wallet_id=wallet_id,
            dna_commitment=dna_commitment,
            root_key=root_key,
            hd_wallet=HDWallet(root_key),
            scan_private_key=scan_private,
            scan_public_key=scan_public,
            spend_private_key=spend_private,
            spend_public_key=spend_public,
            trust_profile=TrustProfile(
                home_location=(home_latitude, home_longitude),
                known_devices={device_fingerprint},
            ),
        )
        self._wallets[wallet_id] = record
        return record

    def create_currency_wallet(
        self,
        profile_id: str,
        currency: str,
        home_latitude: float,
        home_longitude: float,
        device_fingerprint: str,
    ) -> WalletRecord:
        profile = self.get_profile(profile_id)
        record = self.create_wallet(
            dna_commitment=profile.dna_commitment,
            home_latitude=home_latitude,
            home_longitude=home_longitude,
            device_fingerprint=device_fingerprint,
        )
        record.owner_profile_id = profile_id
        record.currency = currency.upper()
        profile.wallet_ids.add(record.wallet_id)
        return record

    def get_wallet(self, wallet_id: str) -> WalletRecord:
        if wallet_id not in self._wallets:
            raise KeyError("Wallet not found")
        return self._wallets[wallet_id]

    def connect_wallet(self, profile_id: str, wallet_id: str, dna_commitment: str) -> str:
        profile = self.get_profile(profile_id)
        wallet = self.get_wallet(wallet_id)

        if wallet.owner_profile_id != profile.profile_id:
            raise PermissionError("Connection denied: profile does not own this wallet")
        if profile.dna_commitment != dna_commitment:
            raise PermissionError("Connection denied: DNA commitment mismatch")

        token = secrets.token_hex(24)
        self._sessions[token] = ConnectionSession(
            token=token,
            profile_id=profile_id,
            wallet_id=wallet_id,
        )
        return token

    def _assert_session_access(self, connection_token: str, sender_wallet_id: str) -> None:
        session = self._sessions.get(connection_token)
        if session is None:
            raise PermissionError("Connection denied: invalid token")
        if session.wallet_id != sender_wallet_id:
            raise PermissionError("Connection denied: token not authorized for this wallet")

    def secure_send_transaction(
        self,
        connection_token: str,
        sender_wallet_id: str,
        receiver_scan_public_key: str,
        receiver_spend_public_key: str,
        amount: float,
        memo: Optional[str],
        decoy_count: int,
    ) -> Dict[str, object]:
        self._assert_session_access(connection_token, sender_wallet_id)
        return self.send_transaction(
            sender_wallet_id=sender_wallet_id,
            receiver_scan_public_key=receiver_scan_public_key,
            receiver_spend_public_key=receiver_spend_public_key,
            amount=amount,
            memo=memo,
            decoy_count=decoy_count,
        )

    def send_transaction(
        self,
        sender_wallet_id: str,
        receiver_scan_public_key: str,
        receiver_spend_public_key: str,
        amount: float,
        memo: Optional[str],
        decoy_count: int,
    ) -> Dict[str, object]:
        sender = self.get_wallet(sender_wallet_id)
        rotated_address = sender.hd_wallet.rotate_address()

        stealth_out = StealthAddressProtocol.create_one_time_address(
            receiver_scan_public_key,
            receiver_spend_public_key,
        )

        tx_body = (
            f"{sender_wallet_id}:{rotated_address}:{stealth_out.one_time_address}:"
            f"{amount}:{memo or ''}:{sender.hd_wallet.index}"
        )
        tx_id = hashlib.sha256(tx_body.encode("utf-8")).hexdigest()

        decoys = DecoyInjector.generate_decoys(sender_wallet_id, decoy_count)

        return {
            "tx_id": tx_id,
            "rotated_sender_address": rotated_address,
            "stealth_destination_address": stealth_out.one_time_address,
            "sender_ephemeral_pub": stealth_out.sender_ephemeral_pub,
            "decoys": decoys,
        }

    def evaluate_trust(
        self,
        wallet_id: str,
        latitude: float,
        longitude: float,
        device_fingerprint: str,
        dna_reauth_passed: bool,
    ):
        wallet = self.get_wallet(wallet_id)
        decision = self._trust_engine.evaluate(
            wallet.trust_profile,
            latitude,
            longitude,
            device_fingerprint,
            dna_reauth_passed,
        )
        return decision

    def verify_zk_dna(self, wallet_id: str, proof: str, public_signal: str) -> bool:
        wallet = self.get_wallet(wallet_id)
        return ZKDNAVerifier.verify(proof, public_signal, wallet.dna_commitment)

    def create_shards(self, wallet_id: str) -> Dict[str, str]:
        wallet = self.get_wallet(wallet_id)
        wallet.shards = DNAShardCloudEscape.split_key(wallet.root_key)
        return wallet.shards

    def recover_root_key(
        self,
        wallet_id: str,
        available_shards: Dict[str, str],
        dna_scan_present: bool,
    ) -> bytes:
        if not dna_scan_present:
            raise PermissionError("Physical DNA scan is required for key reconstruction")

        wallet = self.get_wallet(wallet_id)
        if not wallet.shards:
            raise ValueError("No shard set exists for this wallet")

        filtered = {
            k: v
            for k, v in available_shards.items()
            if k in wallet.shards and wallet.shards[k] == v
        }
        if len(filtered) < 2:
            raise PermissionError("At least 2 valid shards are required")

        return DNAShardCloudEscape.reconstruct_key(filtered)

    def periodic_decoy_broadcast(self) -> List[Dict[str, str]]:
        payloads: List[Dict[str, str]] = []
        for wallet_id in self._wallets:
            payloads.extend(DecoyInjector.generate_decoys(wallet_id, 1))
        return payloads
