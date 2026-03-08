from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class WalletCreateRequest(BaseModel):
    dna_commitment: str = Field(..., description="Hashed or committed DNA reference")
    home_latitude: float
    home_longitude: float
    device_fingerprint: str


class WalletCreateResponse(BaseModel):
    wallet_id: str
    current_address: str
    scan_public_key: str
    spend_public_key: str


class ReceiverBundle(BaseModel):
    scan_public_key: str
    spend_public_key: str


class SendTransactionRequest(BaseModel):
    sender_wallet_id: str
    receiver: ReceiverBundle
    amount: float = Field(..., gt=0)
    memo: Optional[str] = None
    decoy_count: int = Field(0, ge=0, le=10)


class SendTransactionResponse(BaseModel):
    tx_id: str
    rotated_sender_address: str
    stealth_destination_address: str
    sender_ephemeral_pub: str
    decoys: List[Dict[str, str]]


class TrustEvaluateRequest(BaseModel):
    wallet_id: str
    latitude: float
    longitude: float
    device_fingerprint: str
    dna_reauth_passed: bool = False


class TrustEvaluateResponse(BaseModel):
    trust_score: float
    zone: Literal["high", "unknown", "new_device"]
    action: Literal["full_access", "dna_reauth_and_delay", "social_recovery_quorum"]
    delay_seconds: int


class ZKProofRequest(BaseModel):
    wallet_id: str
    proof: str
    public_signal: str


class ZKProofResponse(BaseModel):
    valid: bool


class ShardCreateRequest(BaseModel):
    wallet_id: str


class ShardCreateResponse(BaseModel):
    shard_locations: Dict[str, str]


class ShardRecoverRequest(BaseModel):
    wallet_id: str
    available_shards: Dict[str, str]
    dna_scan_present: bool


class ShardRecoverResponse(BaseModel):
    recovered: bool
    root_key_hex: Optional[str] = None


class UserProfileCreateRequest(BaseModel):
    profile_name: str
    dna_commitment: str


class UserProfileCreateResponse(BaseModel):
    profile_id: str
    profile_name: str
    dna_commitment: str


class CurrencyWalletCreateRequest(BaseModel):
    profile_id: str
    currency: str
    home_latitude: float
    home_longitude: float
    device_fingerprint: str


class CurrencyWalletCreateResponse(BaseModel):
    wallet_id: str
    profile_id: str
    currency: str
    current_address: str
    scan_public_key: str
    spend_public_key: str


class WalletConnectRequest(BaseModel):
    profile_id: str
    wallet_id: str
    dna_commitment: str


class WalletConnectResponse(BaseModel):
    connected: bool
    connection_token: Optional[str] = None
    message: str


class SecureSendTransactionRequest(BaseModel):
    connection_token: str
    sender_wallet_id: str
    receiver: ReceiverBundle
    amount: float = Field(..., gt=0)
    memo: Optional[str] = None
    decoy_count: int = Field(0, ge=0, le=10)
