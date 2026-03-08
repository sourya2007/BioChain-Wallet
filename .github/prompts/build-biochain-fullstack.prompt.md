---
name: build-biochain-fullstack
description: "Create the full BioChain Vault project end-to-end (backend + frontend + tests) with working API contracts and run instructions."
argument-hint: "Optional: custom app name, color theme, or extra features"
agent: agent
---
Build a complete, runnable **BioChain Vault** application from scratch in this workspace.

## Objective
Implement a production-style prototype where DNA commitment is used for profile/wallet authorization and crypto identity rotates during transactions.

## Tech and Structure Requirements
Use:
- Python + FastAPI backend
- Pydantic schemas for API contracts
- In-memory service layer (no DB required)
- Pytest tests for end-to-end behavior
- Static frontend (HTML/CSS/JS) served by FastAPI

Create/maintain this shape:
- `app/main.py`
- `app/api/routes.py`
- `app/core/config.py`
- `app/models/schemas.py`
- `app/services/*.py` for domain logic
- `app/static/index.html`
- `app/static/styles.css`
- `app/static/app.js`
- `tests/test_biochain_vault_e2e.py`
- `README.md`
- `requirements.txt`

## Functional Requirements
Implement all flows below with concrete logic and deterministic behavior suitable for tests.

### 1) Profile-Locked Wallet Access
- Create profile endpoint with `profile_name` and `dna_commitment`.
- Create currency wallet endpoint bound to `profile_id`.
- Connect wallet endpoint validating profile ownership and DNA commitment.
- Return `connection_token` for successful connect.
- Deny mismatched ownership/commitment with clear error message.

### 2) Wallet and Identity Rotation
- Implement HD-style deterministic wallet/address derivation.
- Rotate sender address on each transaction send.
- Include sender and receiver key bundles in wallet model.

### 3) Stealth Transaction Sending
- Provide standard send and secure send endpoints.
- Secure send must require valid `connection_token`.
- Generate one-time stealth destination address.
- Include ephemeral sender public key in response.
- Support configurable decoy count (bounded).

### 4) Geo-Genomic Trust Zones
- Evaluate trust from wallet id + geolocation + device fingerprint + DNA re-auth flag.
- Return:
  - trust score (float)
  - zone (`high`, `unknown`, `new_device`)
  - action (`full_access`, `dna_reauth_and_delay`, `social_recovery_quorum`)
  - delay seconds (int)

### 5) ZK DNA Proof Verifier Hook
- Add deterministic verifier endpoint for DNA proof validity.
- Keep implementation as mock/verifier hook, but predictable and testable.

### 6) DNA Shard Escape Recovery
- Add shard creation endpoint producing 2-of-3 style shard map.
- Add recovery endpoint requiring DNA scan presence and quorum shards.
- Return recovered root key hex on success.

### 7) Decoy Broadcast
- Add endpoint to trigger periodic decoy broadcasts.
- Return broadcast list payload.

## API Contracts
Expose these routes under `/api`:
- `POST /profiles`
- `POST /wallets`
- `POST /wallets/currency`
- `POST /wallets/connect`
- `POST /transactions/send`
- `POST /transactions/send-secure`
- `POST /trust/evaluate`
- `POST /dna/verify-zk`
- `POST /shards/create`
- `POST /shards/recover`
- `GET /decoys/broadcast`

Use explicit request/response models in `app/models/schemas.py`.

## Frontend Requirements
Build a responsive UI at `/frontend` with:
- Profile login/create section
- Dashboard section
- Transaction menu section
- Process stream/log panel showing:
  - frontend hashing steps (DNA input -> SHA-256 commitment)
  - backend operation responses for trust, tx, zk, shard, decoy flows

Frontend behavior:
- Hash DNA source string in browser before sending profile/connect payload.
- Call live backend endpoints via `fetch`.
- Show success/error events in a process timeline.
- Display active profile, wallet keys, token, trust result in dashboard cards.
- Include intentional visual design (custom palette, typography, motion) and mobile support.

## Non-Functional Requirements
- Keep code readable and modular.
- Add brief comments only where logic is non-obvious.
- Avoid placeholder TODO behavior for core features.
- Ensure deterministic output where tests depend on values.

## Testing Requirements
Create/update pytest coverage for end-to-end flow:
- profile creation
- wallet creation/connect allow-deny rules
- secure transaction response shape and address rotation
- trust evaluation decisions
- zk verify behavior
- shard create + recover success/failure conditions
- decoy broadcast response

Tests must pass with a single command.

## Run and Docs Requirements
Update `README.md` with:
- install command
- backend run command
- docs URL (`/docs`)
- frontend URL (`/frontend`)
- one-command test execution

Keep `requirements.txt` minimal and sufficient (FastAPI, uvicorn, pydantic, pytest, httpx).

## Execution Rules
- Before editing, inspect existing files and reuse working code where possible.
- Do not break existing endpoint contracts unless you update all callers/tests.
- After edits, run diagnostics/tests and fix failures.
- If assumptions are needed, choose sensible defaults and state them clearly.

## Output Format (important)
When finished, return:
1. `What was implemented` (concise bullet list)
2. `Files created/updated` (paths)
3. `How to run` (exact terminal commands)
4. `Verification` (tests or checks run and results)
5. `Known limitations` (if any)

If the workspace already contains parts of this project, complete and align them rather than rewriting everything unnecessarily.
