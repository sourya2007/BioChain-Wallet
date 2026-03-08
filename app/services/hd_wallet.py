import hashlib
import hmac
from dataclasses import dataclass


@dataclass
class HDNode:
    private_key: bytes
    chain_code: bytes


class HDWallet:
    """A compact BIP32-inspired wallet for deterministic address rotation."""

    def __init__(self, root_seed: bytes) -> None:
        i = hmac.new(b"BioChain-HD", root_seed, hashlib.sha512).digest()
        self._master = HDNode(private_key=i[:32], chain_code=i[32:])
        self._index = 0

    @property
    def index(self) -> int:
        return self._index

    def _derive_child(self, index: int) -> HDNode:
        payload = b"\x00" + self._master.private_key + index.to_bytes(4, "big")
        i = hmac.new(self._master.chain_code, payload, hashlib.sha512).digest()
        return HDNode(private_key=i[:32], chain_code=i[32:])

    @staticmethod
    def _to_address(key_material: bytes) -> str:
        digest = hashlib.sha256(key_material).hexdigest()
        return f"bcv1{digest[:38]}"

    def current_address(self) -> str:
        node = self._derive_child(self._index)
        return self._to_address(node.private_key)

    def rotate_address(self) -> str:
        self._index += 1
        node = self._derive_child(self._index)
        return self._to_address(node.private_key)
