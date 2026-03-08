import hashlib
import hmac


class ZKDNAVerifier:
    """Prototype verifier interface for a DNA-match ZK proof.

    Replace this with a real zk-SNARK verifier (Groth16/Plonk) in production.
    """

    @staticmethod
    def verify(proof: str, public_signal: str, expected_commitment: str) -> bool:
        # Deterministic stand-in for verifier logic to keep API and flow testable.
        verifier_key = hashlib.sha256(expected_commitment.encode("utf-8")).hexdigest()
        expected_tag = hmac.new(
            verifier_key.encode("utf-8"),
            public_signal.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(proof, expected_tag)
