import hashlib
from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app


PROJECT_ROOT = Path(__file__).resolve().parent
client = TestClient(app)

PROFILE_ALIASES = {
    "sample11": "sample11",
    "raw1": "raw1",
    "authmail": "authmail",
    "por": "authmail",
}

CURRENCY_BY_PROFILE = {
    "sample11": "BTC",
    "raw1": "ETH",
    "authmail": "SOL",
}


def dna_commitment_from_vcf(vcf_path: Path) -> str:
    variant_lines = []
    for raw_line in vcf_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        variant_lines.append(line)
    canonical = "\n".join(variant_lines)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def create_profile(profile_name: str, dna_commitment: str) -> dict:
    response = client.post(
        "/api/profiles",
        json={"profile_name": profile_name, "dna_commitment": dna_commitment},
    )
    response.raise_for_status()
    return response.json()


def create_currency_wallet(profile_id: str, currency: str, lat: float, lon: float, device: str) -> dict:
    response = client.post(
        "/api/wallets/currency",
        json={
            "profile_id": profile_id,
            "currency": currency,
            "home_latitude": lat,
            "home_longitude": lon,
            "device_fingerprint": device,
        },
    )
    response.raise_for_status()
    return response.json()


def connect_wallet(profile_id: str, wallet_id: str, dna_commitment: str) -> dict:
    response = client.post(
        "/api/wallets/connect",
        json={
            "profile_id": profile_id,
            "wallet_id": wallet_id,
            "dna_commitment": dna_commitment,
        },
    )
    response.raise_for_status()
    return response.json()


def secure_send(connection_token: str, sender_wallet_id: str, receiver_scan: str, receiver_spend: str) -> dict:
    response = client.post(
        "/api/transactions/send-secure",
        json={
            "connection_token": connection_token,
            "sender_wallet_id": sender_wallet_id,
            "receiver": {
                "scan_public_key": receiver_scan,
                "spend_public_key": receiver_spend,
            },
            "amount": 0.25,
            "memo": "demo secure transfer",
            "decoy_count": 1,
        },
    )
    response.raise_for_status()
    return response.json()


def bootstrap_profiles_and_wallets() -> dict:
    c_sample11 = dna_commitment_from_vcf(PROJECT_ROOT / "sample11.vcf")
    c_raw1 = dna_commitment_from_vcf(PROJECT_ROOT / "raw1.vcf")
    c_authmail = dna_commitment_from_vcf(PROJECT_ROOT / "authmail.vcf")

    p1 = create_profile("sample11_user", c_sample11)
    p2 = create_profile("raw1_user", c_raw1)
    p3 = create_profile("authmail_user", c_authmail)

    w_btc = create_currency_wallet(p1["profile_id"], "BTC", 12.9716, 77.5946, "sample11-device")
    w_eth = create_currency_wallet(p2["profile_id"], "ETH", 13.0827, 80.2707, "raw1-device")
    w_sol = create_currency_wallet(p3["profile_id"], "SOL", 28.6139, 77.2090, "authmail-device")

    return {
        "sample11": {"profile": p1, "wallet": w_btc, "dna_commitment": c_sample11},
        "raw1": {"profile": p2, "wallet": w_eth, "dna_commitment": c_raw1},
        "authmail": {"profile": p3, "wallet": w_sol, "dna_commitment": c_authmail},
    }


def transaction_menu1(connection_token: str, sender_wallet: dict, profiles_data: dict) -> None:
    print("\n=== Transaction Menu1 ===")
    print("1. Send secure transaction")
    print("2. Exit")
    choice = input("Choose option: ").strip()

    if choice != "1":
        print("Exiting transaction menu.")
        return

    receiver_currency = input("Receiver currency (BTC/ETH/SOL): ").strip().upper()

    receiver_wallet = None
    for profile_data in profiles_data.values():
        wallet = profile_data["wallet"]
        if wallet["currency"] == receiver_currency:
            receiver_wallet = wallet
            break

    if receiver_wallet is None:
        print("Connection denied: unknown receiver currency.")
        return

    if receiver_wallet["wallet_id"] == sender_wallet["wallet_id"]:
        print("Connection denied: sender and receiver wallet cannot be the same.")
        return

    tx = secure_send(
        connection_token,
        sender_wallet["wallet_id"],
        receiver_wallet["scan_public_key"],
        receiver_wallet["spend_public_key"],
    )
    print("Secure transaction successful.")
    print("tx_id:", tx["tx_id"])
    print("rotated_sender_address:", tx["rotated_sender_address"])
    print("stealth_destination_address:", tx["stealth_destination_address"])
    print("decoy_count:", len(tx["decoys"]))


def main() -> None:
    profiles_data = bootstrap_profiles_and_wallets()

    print("=== BioChain Vault Access Gateway ===")
    print("Available profiles: sample11, raw1, authmail")
    profile_input = input("Enter profile: ").strip().lower()
    selected_profile_key = PROFILE_ALIASES.get(profile_input)
    if selected_profile_key is None:
        print("Connection denied: unknown profile.")
        return

    currency_input = input("Enter requested currency (BTC/ETH/SOL): ").strip().upper()
    expected_currency = CURRENCY_BY_PROFILE[selected_profile_key]
    if currency_input != expected_currency:
        print("Connection denied: profile is not linked to requested currency.")
        return

    selected = profiles_data[selected_profile_key]
    connect = connect_wallet(
        selected["profile"]["profile_id"],
        selected["wallet"]["wallet_id"],
        selected["dna_commitment"],
    )

    if not connect.get("connected"):
        print("Connection denied:", connect.get("message", "authentication failed"))
        return

    print("Connection established for", selected["profile"]["profile_name"], "->", expected_currency)
    transaction_menu1(connect["connection_token"], selected["wallet"], profiles_data)


if __name__ == "__main__":
    main()
