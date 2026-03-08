from fastapi import APIRouter, HTTPException

from app.models.schemas import (
    CurrencyWalletCreateRequest,
    CurrencyWalletCreateResponse,
    SendTransactionRequest,
    SendTransactionResponse,
    SecureSendTransactionRequest,
    ShardCreateRequest,
    ShardCreateResponse,
    ShardRecoverRequest,
    ShardRecoverResponse,
    TrustEvaluateRequest,
    TrustEvaluateResponse,
    UserProfileCreateRequest,
    UserProfileCreateResponse,
    WalletConnectRequest,
    WalletConnectResponse,
    WalletCreateRequest,
    WalletCreateResponse,
    ZKProofRequest,
    ZKProofResponse,
)
from app.services.vault_service import VaultService


router = APIRouter()
service = VaultService()


@router.post("/profiles", response_model=UserProfileCreateResponse)
def create_profile(payload: UserProfileCreateRequest) -> UserProfileCreateResponse:
    profile = service.create_profile(
        profile_name=payload.profile_name,
        dna_commitment=payload.dna_commitment,
    )
    return UserProfileCreateResponse(
        profile_id=profile.profile_id,
        profile_name=profile.profile_name,
        dna_commitment=profile.dna_commitment,
    )


@router.post("/wallets/currency", response_model=CurrencyWalletCreateResponse)
def create_currency_wallet(payload: CurrencyWalletCreateRequest) -> CurrencyWalletCreateResponse:
    try:
        wallet = service.create_currency_wallet(
            profile_id=payload.profile_id,
            currency=payload.currency,
            home_latitude=payload.home_latitude,
            home_longitude=payload.home_longitude,
            device_fingerprint=payload.device_fingerprint,
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return CurrencyWalletCreateResponse(
        wallet_id=wallet.wallet_id,
        profile_id=payload.profile_id,
        currency=wallet.currency,
        current_address=wallet.hd_wallet.current_address(),
        scan_public_key=wallet.scan_public_key,
        spend_public_key=wallet.spend_public_key,
    )


@router.post("/wallets/connect", response_model=WalletConnectResponse)
def connect_wallet(payload: WalletConnectRequest) -> WalletConnectResponse:
    try:
        token = service.connect_wallet(
            profile_id=payload.profile_id,
            wallet_id=payload.wallet_id,
            dna_commitment=payload.dna_commitment,
        )
        return WalletConnectResponse(
            connected=True,
            connection_token=token,
            message="Connection established",
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PermissionError as exc:
        return WalletConnectResponse(
            connected=False,
            connection_token=None,
            message=str(exc),
        )


@router.post("/wallets", response_model=WalletCreateResponse)
def create_wallet(payload: WalletCreateRequest) -> WalletCreateResponse:
    record = service.create_wallet(
        dna_commitment=payload.dna_commitment,
        home_latitude=payload.home_latitude,
        home_longitude=payload.home_longitude,
        device_fingerprint=payload.device_fingerprint,
    )
    return WalletCreateResponse(
        wallet_id=record.wallet_id,
        current_address=record.hd_wallet.current_address(),
        scan_public_key=record.scan_public_key,
        spend_public_key=record.spend_public_key,
    )


@router.post("/transactions/send", response_model=SendTransactionResponse)
def send_transaction(payload: SendTransactionRequest) -> SendTransactionResponse:
    try:
        result = service.send_transaction(
            sender_wallet_id=payload.sender_wallet_id,
            receiver_scan_public_key=payload.receiver.scan_public_key,
            receiver_spend_public_key=payload.receiver.spend_public_key,
            amount=payload.amount,
            memo=payload.memo,
            decoy_count=payload.decoy_count,
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return SendTransactionResponse(**result)


@router.post("/transactions/send-secure", response_model=SendTransactionResponse)
def send_secure_transaction(payload: SecureSendTransactionRequest) -> SendTransactionResponse:
    try:
        result = service.secure_send_transaction(
            connection_token=payload.connection_token,
            sender_wallet_id=payload.sender_wallet_id,
            receiver_scan_public_key=payload.receiver.scan_public_key,
            receiver_spend_public_key=payload.receiver.spend_public_key,
            amount=payload.amount,
            memo=payload.memo,
            decoy_count=payload.decoy_count,
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc

    return SendTransactionResponse(**result)


@router.post("/trust/evaluate", response_model=TrustEvaluateResponse)
def evaluate_trust(payload: TrustEvaluateRequest) -> TrustEvaluateResponse:
    try:
        decision = service.evaluate_trust(
            wallet_id=payload.wallet_id,
            latitude=payload.latitude,
            longitude=payload.longitude,
            device_fingerprint=payload.device_fingerprint,
            dna_reauth_passed=payload.dna_reauth_passed,
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return TrustEvaluateResponse(
        trust_score=decision.trust_score,
        zone=decision.zone,
        action=decision.action,
        delay_seconds=decision.delay_seconds,
    )


@router.post("/dna/verify-zk", response_model=ZKProofResponse)
def verify_zk_proof(payload: ZKProofRequest) -> ZKProofResponse:
    try:
        valid = service.verify_zk_dna(
            wallet_id=payload.wallet_id,
            proof=payload.proof,
            public_signal=payload.public_signal,
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return ZKProofResponse(valid=valid)


@router.post("/shards/create", response_model=ShardCreateResponse)
def create_shards(payload: ShardCreateRequest) -> ShardCreateResponse:
    try:
        locations = service.create_shards(payload.wallet_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return ShardCreateResponse(shard_locations=locations)


@router.post("/shards/recover", response_model=ShardRecoverResponse)
def recover_shards(payload: ShardRecoverRequest) -> ShardRecoverResponse:
    try:
        key = service.recover_root_key(
            wallet_id=payload.wallet_id,
            available_shards=payload.available_shards,
            dna_scan_present=payload.dna_scan_present,
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except (PermissionError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return ShardRecoverResponse(recovered=True, root_key_hex=key.hex())


@router.get("/decoys/broadcast")
def trigger_decoy_broadcast():
    return {"broadcasts": service.periodic_decoy_broadcast()}
