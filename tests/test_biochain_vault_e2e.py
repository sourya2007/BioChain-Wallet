import hashlib
import hmac
from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


PROJECT_ROOT = Path(__file__).resolve().parents[1]


def _dna_commitment_from_vcf(vcf_file: Path) -> str:
    # Canonicalize to variant records only to avoid metadata/header differences.
    variant_lines = []
    for raw_line in vcf_file.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        variant_lines.append(line)
    canonical = "\n".join(variant_lines)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _zk_proof(dna_commitment: str, public_signal: str) -> str:
    verifier_key = hashlib.sha256(dna_commitment.encode("utf-8")).hexdigest()
    return hmac.new(
        verifier_key.encode("utf-8"),
        public_signal.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def test_biochain_vault_e2e_flow() -> None:
    sample11_commitment = _dna_commitment_from_vcf(PROJECT_ROOT / "sample11.vcf")
    raw1_commitment = _dna_commitment_from_vcf(PROJECT_ROOT / "raw1.vcf")
    authmail_commitment = _dna_commitment_from_vcf(PROJECT_ROOT / "authmail.vcf")

    # 1) Create wallets
    w1_resp = client.post(
        "/api/wallets",
        json={
            "dna_commitment": sample11_commitment,
            "home_latitude": 12.9716,
            "home_longitude": 77.5946,
            "device_fingerprint": "alice-phone-1",
        },
    )
    assert w1_resp.status_code == 200
    w1 = w1_resp.json()

    w2_resp = client.post(
        "/api/wallets",
        json={
            "dna_commitment": raw1_commitment,
            "home_latitude": 13.0827,
            "home_longitude": 80.2707,
            "device_fingerprint": "bob-phone-1",
        },
    )
    assert w2_resp.status_code == 200
    w2 = w2_resp.json()

    # 2) Send transaction and validate rotation + stealth + decoys
    tx_resp = client.post(
        "/api/transactions/send",
        json={
            "sender_wallet_id": w1["wallet_id"],
            "receiver": {
                "scan_public_key": w2["scan_public_key"],
                "spend_public_key": w2["spend_public_key"],
            },
            "amount": 1.25,
            "memo": "test transfer",
            "decoy_count": 2,
        },
    )
    assert tx_resp.status_code == 200
    tx = tx_resp.json()
    assert tx["rotated_sender_address"].startswith("bcv1")
    assert tx["stealth_destination_address"].startswith("stl1")
    assert len(tx["decoys"]) == 2

    # 3) Trust-zone checks
    high_trust_resp = client.post(
        "/api/trust/evaluate",
        json={
            "wallet_id": w1["wallet_id"],
            "latitude": 12.9716,
            "longitude": 77.5946,
            "device_fingerprint": "alice-phone-1",
            "dna_reauth_passed": False,
        },
    )
    assert high_trust_resp.status_code == 200
    high_trust = high_trust_resp.json()
    assert high_trust["zone"] == "high"
    assert high_trust["action"] == "full_access"

    new_device_resp = client.post(
        "/api/trust/evaluate",
        json={
            "wallet_id": w1["wallet_id"],
            "latitude": 12.9716,
            "longitude": 77.5946,
            "device_fingerprint": "unknown-device",
            "dna_reauth_passed": False,
        },
    )
    assert new_device_resp.status_code == 200
    new_device = new_device_resp.json()
    assert new_device["zone"] == "new_device"
    assert new_device["action"] == "social_recovery_quorum"

    # 4) Shard split + 2-of-3 recovery with DNA presence
    shards_resp = client.post("/api/shards/create", json={"wallet_id": w1["wallet_id"]})
    assert shards_resp.status_code == 200
    shard_locations = shards_resp.json()["shard_locations"]

    recover_resp = client.post(
        "/api/shards/recover",
        json={
            "wallet_id": w1["wallet_id"],
            "available_shards": {
                "ipfs": shard_locations["ipfs"],
                "device": shard_locations["device"],
            },
            "dna_scan_present": True,
        },
    )
    assert recover_resp.status_code == 200
    recover = recover_resp.json()
    assert recover["recovered"] is True
    assert isinstance(recover["root_key_hex"], str)
    assert len(recover["root_key_hex"]) == 64

    # 5) ZK-DNA verifier hook
    signal = "login-2026-03-08"
    proof = _zk_proof(sample11_commitment, signal)
    zk_resp = client.post(
        "/api/dna/verify-zk",
        json={
            "wallet_id": w1["wallet_id"],
            "proof": proof,
            "public_signal": signal,
        },
    )
    assert zk_resp.status_code == 200
    zk = zk_resp.json()
    assert zk["valid"] is True

    wrong_proof = _zk_proof(authmail_commitment, signal)
    zk_fail_resp = client.post(
        "/api/dna/verify-zk",
        json={
            "wallet_id": w1["wallet_id"],
            "proof": wrong_proof,
            "public_signal": signal,
        },
    )
    assert zk_fail_resp.status_code == 200
    zk_fail = zk_fail_resp.json()
    assert zk_fail["valid"] is False

    # 6) Periodic decoy broadcast
    decoy_resp = client.get("/api/decoys/broadcast")
    assert decoy_resp.status_code == 200
    decoys = decoy_resp.json()["broadcasts"]
    assert len(decoys) >= 2

    print("wallet_1:", w1["wallet_id"])
    print("wallet_2:", w2["wallet_id"])
    print("sample11_commitment:", sample11_commitment)
    print("raw1_commitment:", raw1_commitment)
    print("authmail_commitment:", authmail_commitment)
    print("rotated_sender_address:", tx["rotated_sender_address"])
    print("stealth_destination_address:", tx["stealth_destination_address"])
    print("high_trust_action:", high_trust["action"])
    print("new_device_action:", new_device["action"])
    print("recovered_root_key_hex_prefix:", recover["root_key_hex"][:16])
    print("zk_valid:", zk["valid"])
    print("zk_valid_with_authmail_proof:", zk_fail["valid"])
    print("broadcast_decoy_count:", len(decoys))
