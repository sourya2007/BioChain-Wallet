# How The Automated Test Works

This file explains the full process in `tests/test_biochain_vault_e2e.py`: the sample input, which backend logic runs, and how each output value is produced.

## Test Command

```powershell
& "c:/Users/Admin/Downloads/Technovate Project/.venv/Scripts/python.exe" -m pytest -s -q tests/test_biochain_vault_e2e.py
```

- `-q` keeps pytest output concise.
- `-s` allows `print(...)` results from the test to be shown.

## End-to-End Flow

### 1. Wallet Creation

Endpoint called twice:
- `POST /api/wallets`

Sample input A:
```json
{
  "dna_commitment": "dna_hash_alice",
  "home_latitude": 12.9716,
  "home_longitude": 77.5946,
  "device_fingerprint": "alice-phone-1"
}
```

Sample input B:
```json
{
  "dna_commitment": "dna_hash_bob",
  "home_latitude": 13.0827,
  "home_longitude": 80.2707,
  "device_fingerprint": "bob-phone-1"
}
```

Process (`app/services/vault_service.py`):
- `wallet_id` is generated as UUID.
- A random `salt` is generated.
- `root_key = sha256(dna_commitment + ":" + salt)`.
- Random scan and spend private keys are generated.
- Public keys are `sha256(private_key)`.
- `TrustProfile` stores:
  - home location from the request.
  - known device set with the provided fingerprint.
- `HDWallet(root_key)` is created with index `0`.

Output fields:
- `wallet_id`: random UUID.
- `current_address`: derived from HD child index `0`.
  - Internally: `hmac_sha512(master_chain_code, payload)` -> child private key -> `sha256` -> prefixed `bcv1...`
- `scan_public_key`: hash of scan private key.
- `spend_public_key`: hash of spend private key.

Why outputs differ each run:
- UUID, salt, and private keys are random.

### 2. Transaction Send (Rotation + Stealth + Decoys)

Endpoint:
- `POST /api/transactions/send`

Sample input:
```json
{
  "sender_wallet_id": "<wallet_1_id>",
  "receiver": {
    "scan_public_key": "<wallet_2_scan_public_key>",
    "spend_public_key": "<wallet_2_spend_public_key>"
  },
  "amount": 1.25,
  "memo": "test transfer",
  "decoy_count": 2
}
```

Process:
1. Sender wallet is loaded from memory.
2. Address rotation:
   - `hd_wallet.rotate_address()` increments HD index from `0` to `1`.
   - New address is derived and returned as `rotated_sender_address` (prefix `bcv1...`).
3. Stealth one-time destination:
   - random ephemeral private bytes are generated.
   - `sender_ephemeral_pub = sha256(eph_priv)`.
   - `shared_hint = sha256(sender_ephemeral_pub + receiver_scan_public_key)`.
   - `one_time = sha256(shared_hint + receiver_spend_public_key)`.
   - `stealth_destination_address = "stl1" + one_time[:44]`.
4. Tx id:
   - `tx_id = sha256(sender_wallet_id:rotated_address:stealth_address:amount:memo:index)`.
5. Decoys:
   - `generate_decoys(wallet_id, 2)` returns two dummy tx objects with tiny amount `0.000001`.

Output fields:
- `tx_id`: deterministic hash of transaction body for this run.
- `rotated_sender_address`: new address from HD index `1`.
- `stealth_destination_address`: one-time `stl1...` address.
- `sender_ephemeral_pub`: temporary sender pubkey used for stealth computation.
- `decoys`: list of 2 generated dummy tx entries.

### 3. Geo-Genomic Trust Evaluation

Endpoint called twice:
- `POST /api/trust/evaluate`

Case A sample input (known device + home location):
```json
{
  "wallet_id": "<wallet_1_id>",
  "latitude": 12.9716,
  "longitude": 77.5946,
  "device_fingerprint": "alice-phone-1",
  "dna_reauth_passed": false
}
```

Process in `app/services/trust_zone.py`:
- Distance from home is computed with Haversine formula.
- `known_device = True` because fingerprint matches stored known device.
- Score components:
  - +0.5 if within `home_radius_km` (default 2.0 km), else +0.1
  - +0.4 if known device
  - +0.1 if DNA reauth passed
- Decision rule:
  - known device + in home radius -> zone `high`, action `full_access`, delay `0`

Case B sample input (unknown device):
```json
{
  "wallet_id": "<wallet_1_id>",
  "latitude": 12.9716,
  "longitude": 77.5946,
  "device_fingerprint": "unknown-device",
  "dna_reauth_passed": false
}
```

Decision rule for this case:
- unknown device -> zone `new_device`, action `social_recovery_quorum`, delay `0`

Output fields:
- `trust_score`: numeric score built from location/device/dna flags.
- `zone`: `high` or `new_device` in this test.
- `action`: `full_access` or `social_recovery_quorum`.
- `delay_seconds`: policy delay from the selected branch.

### 4. DNA Shard Cloud Escape (2-of-3)

Endpoints:
- `POST /api/shards/create`
- `POST /api/shards/recover`

Create sample input:
```json
{
  "wallet_id": "<wallet_1_id>"
}
```

Create process (`app/services/shard_escape.py`):
- Root key bytes are split using a 2-of-3 Shamir-style linear polynomial in finite field `mod 257`.
- For each byte `b`:
  - random slope `m` chosen.
  - shares at x=1,2,3 computed as `y = (b + m*x) mod 257`.
- Shares are encoded and returned as:
  - `ipfs`, `device`, `enclave`.

Create output:
```json
{
  "shard_locations": {
    "ipfs": "1:<encoded>",
    "device": "2:<encoded>",
    "enclave": "3:<encoded>"
  }
}
```

Recover sample input used by test:
```json
{
  "wallet_id": "<wallet_1_id>",
  "available_shards": {
    "ipfs": "1:<encoded>",
    "device": "2:<encoded>"
  },
  "dna_scan_present": true
}
```

Recover process (`app/services/vault_service.py` + `app/services/shard_escape.py`):
- Rejects if `dna_scan_present` is false.
- Filters provided shards against wallet's stored shard set.
- Requires at least 2 valid shards.
- Reconstructs original key bytes via Lagrange interpolation at x=0.

Recover output:
- `recovered: true`
- `root_key_hex`: hex string of reconstructed 32-byte root key (length 64 chars)

### 5. ZK DNA Proof Verification Hook

Endpoint:
- `POST /api/dna/verify-zk`

Sample input:
```json
{
  "wallet_id": "<wallet_1_id>",
  "proof": "<computed_hmac_hex>",
  "public_signal": "login-2026-03-08"
}
```

How the test computes `proof`:
- `verifier_key = sha256("dna_hash_alice").hexdigest()`
- `proof = hmac_sha256(key=verifier_key, message="login-2026-03-08")`

How backend validates (`app/services/zk_dna.py`):
- Loads wallet's stored DNA commitment.
- Recomputes the same expected HMAC tag from `expected_commitment` and `public_signal`.
- Compares expected tag vs provided `proof` using `hmac.compare_digest`.

Output:
- `{"valid": true}` when tags match.

### 6. Periodic Decoy Broadcast

Endpoint:
- `GET /api/decoys/broadcast`

Process:
- For each wallet in memory, backend generates one decoy tx.
- Since test created 2 wallets, output count is at least 2.

Output:
```json
{
  "broadcasts": [
    {"tx_id": "...", "to": "dcy1...", "amount": "0.000001"},
    {"tx_id": "...", "to": "dcy1...", "amount": "0.000001"}
  ]
}
```

## Why Printed Test Output Looks Like It Does

The test prints:
- `wallet_1`, `wallet_2`: UUIDs from wallet creation.
- `rotated_sender_address`: sender HD address after one rotation.
- `stealth_destination_address`: one-time stealth destination for receiver.
- `high_trust_action`: `full_access` for known device at home.
- `new_device_action`: `social_recovery_quorum` for unknown device.
- `recovered_root_key_hex_prefix`: first 16 chars from reconstructed key hex.
- `zk_valid`: `True` because proof generation matches verifier logic.
- `broadcast_decoy_count`: number of generated periodic decoys.

Some values are deterministic only within one test run, but differ run-to-run due to random UUID/salt/ephemeral keys and share slopes.
