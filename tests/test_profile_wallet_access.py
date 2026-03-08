import hashlib
from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)
PROJECT_ROOT = Path(__file__).resolve().parents[1]


def _dna_commitment_from_vcf(vcf_file: Path) -> str:
    variant_lines = []
    for raw_line in vcf_file.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        variant_lines.append(line)
    canonical = "\n".join(variant_lines)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def test_profile_locked_currency_wallet_connections() -> None:
    c_sample11 = _dna_commitment_from_vcf(PROJECT_ROOT / "sample11.vcf")
    c_raw1 = _dna_commitment_from_vcf(PROJECT_ROOT / "raw1.vcf")
    c_authmail = _dna_commitment_from_vcf(PROJECT_ROOT / "authmail.vcf")

    p1 = client.post(
        "/api/profiles",
        json={"profile_name": "sample11_user", "dna_commitment": c_sample11},
    ).json()
    p2 = client.post(
        "/api/profiles",
        json={"profile_name": "raw1_user", "dna_commitment": c_raw1},
    ).json()
    p3 = client.post(
        "/api/profiles",
        json={"profile_name": "authmail_user", "dna_commitment": c_authmail},
    ).json()

    w_btc = client.post(
        "/api/wallets/currency",
        json={
            "profile_id": p1["profile_id"],
            "currency": "BTC",
            "home_latitude": 12.9716,
            "home_longitude": 77.5946,
            "device_fingerprint": "sample11-device",
        },
    ).json()
    w_eth = client.post(
        "/api/wallets/currency",
        json={
            "profile_id": p2["profile_id"],
            "currency": "ETH",
            "home_latitude": 13.0827,
            "home_longitude": 80.2707,
            "device_fingerprint": "raw1-device",
        },
    ).json()
    w_sol = client.post(
        "/api/wallets/currency",
        json={
            "profile_id": p3["profile_id"],
            "currency": "SOL",
            "home_latitude": 28.6139,
            "home_longitude": 77.2090,
            "device_fingerprint": "authmail-device",
        },
    ).json()

    connect_ok = client.post(
        "/api/wallets/connect",
        json={
            "profile_id": p1["profile_id"],
            "wallet_id": w_btc["wallet_id"],
            "dna_commitment": c_sample11,
        },
    ).json()
    assert connect_ok["connected"] is True
    token = connect_ok["connection_token"]

    connect_wrong_profile = client.post(
        "/api/wallets/connect",
        json={
            "profile_id": p2["profile_id"],
            "wallet_id": w_btc["wallet_id"],
            "dna_commitment": c_raw1,
        },
    ).json()
    assert connect_wrong_profile["connected"] is False

    connect_wrong_dna = client.post(
        "/api/wallets/connect",
        json={
            "profile_id": p1["profile_id"],
            "wallet_id": w_btc["wallet_id"],
            "dna_commitment": c_authmail,
        },
    ).json()
    assert connect_wrong_dna["connected"] is False

    secure_tx = client.post(
        "/api/transactions/send-secure",
        json={
            "connection_token": token,
            "sender_wallet_id": w_btc["wallet_id"],
            "receiver": {
                "scan_public_key": w_eth["scan_public_key"],
                "spend_public_key": w_eth["spend_public_key"],
            },
            "amount": 0.5,
            "memo": "btc to eth wallet test",
            "decoy_count": 1,
        },
    )
    assert secure_tx.status_code == 200
    secure_tx_body = secure_tx.json()
    assert secure_tx_body["rotated_sender_address"].startswith("bcv1")

    denied_tx = client.post(
        "/api/transactions/send-secure",
        json={
            "connection_token": token,
            "sender_wallet_id": w_sol["wallet_id"],
            "receiver": {
                "scan_public_key": w_eth["scan_public_key"],
                "spend_public_key": w_eth["spend_public_key"],
            },
            "amount": 0.1,
            "memo": "should be denied",
            "decoy_count": 0,
        },
    )
    assert denied_tx.status_code == 403

    print("profiles:", p1["profile_name"], p2["profile_name"], p3["profile_name"])
    print("wallet_currencies:", w_btc["currency"], w_eth["currency"], w_sol["currency"])
    print("connect_ok:", connect_ok["message"])
    print("connect_wrong_profile:", connect_wrong_profile["message"])
    print("connect_wrong_dna:", connect_wrong_dna["message"])
    print("secure_tx_rotated_address:", secure_tx_body["rotated_sender_address"])
    print("denied_tx_status:", denied_tx.status_code)
