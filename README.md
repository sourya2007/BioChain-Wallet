# BioChain Vault Backend (Python)

A prototype backend for **BioChain Vault**: a crypto wallet architecture where DNA-derived identity anchors wallet control while on-chain transaction identity continuously rotates.

## Implemented Feature Set

1. **Stealth Address Rotation (HD Wallet++)**
- BIP32-inspired deterministic derivation in `app/services/hd_wallet.py`.
- Every call to `/api/transactions/send` rotates to the next derived sender address.
- One-time destination address generation in `app/services/stealth.py`.

2. **Geo-Genomic Trust Zones**
- Trust scoring from location + device fingerprint + DNA re-auth flag.
- Decision classes:
  - `high` -> full access
  - `unknown` -> DNA re-auth + enforced delay
  - `new_device` -> social recovery quorum required

3. **Zero-Knowledge DNA Proof (Verifier Hook)**
- `app/services/zk_dna.py` provides a deterministic verifier interface.
- This is a placeholder for real zk-SNARK integration (Groth16/Plonk).

4. **DNA Shard Cloud Escape**
- 2-of-3 key shard generation and reconstruction in `app/services/shard_escape.py`.
- Recovery endpoint requires DNA scan presence and at least 2 valid shards.

## API Endpoints

- `POST /api/profiles`
- `POST /api/wallets`
- `POST /api/wallets/currency`
- `POST /api/wallets/connect`
- `POST /api/transactions/send`
- `POST /api/transactions/send-secure`
- `POST /api/trust/evaluate`
- `POST /api/dna/verify-zk`
- `POST /api/shards/create`
- `POST /api/shards/recover`
- `GET /api/decoys/broadcast`

## Run Locally

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Open docs at:
- `http://127.0.0.1:8000/docs`

## One-Step Automated Test

Run one command to execute a full end-to-end validation and print key outputs:

```bash
python -m pytest -s -q tests/test_biochain_vault_e2e.py
```

It validates:
- wallet creation
- sender address rotation + stealth destination generation
- decoy injection and periodic decoy broadcast
- geo-genomic trust zone decisions
- zero-knowledge DNA proof verification hook
- 2-of-3 DNA shard recovery flow
- profile-locked wallet connection authorization and deny rules

`requirements.txt` includes `pytest` and `httpx` so this test runs without extra manual setup.

## One-Command Profile Wallet Demo

Run a complete demo for 3 VCF-based user profiles, 3 currency wallets, connection allow/deny checks, and a secure transaction:

```bash
python demo_profile_wallet_flow.py
```

## Profile-Locked Currency Wallet Workflow

1. Create a user profile (`/api/profiles`) with a DNA commitment.
2. Create a currency wallet bound to that profile (`/api/wallets/currency`).
3. Connect to wallet with profile id + matching DNA commitment (`/api/wallets/connect`).
4. Use returned connection token to transact (`/api/transactions/send-secure`).

If profile or DNA commitment does not match wallet ownership, connection is denied.

## Production Notes

- Replace hash-based stealth primitives with proper elliptic-curve stealth addressing.
- Replace mock ZK verifier with real circuit verification.
- Persist wallet state in a secure DB/KMS instead of in-memory service storage.
- Add authenticated API access, rate limits, secure enclave integration, and auditable policy controls.
