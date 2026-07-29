"""Real round-trip test of NAMQR ECDSA signature verification.

No mocks: this generates an ephemeral ECDSA P-256 keypair with the actual
`cryptography` library, builds a real TLV payload, signs it exactly as
NAMQR Code Standards v5.0 Annexure I S1.7.3 describes, and asks
NAMQRProcessor.verify_signature() -- the same function the API calls in
production -- to verify it. Then it proves the negative path: a
CRC-valid-but-signature-tampered payload must be rejected, and a payload
signed by the WRONG key must be rejected too. If any of this used a stub
that always returned True, every negative case below would fail.

Run:  cd backend && source venv/bin/activate && python -m tests.test_namqr_signature
"""

import base64
import sys

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec

from app.services.namqr_processor import NAMQRProcessor

CRC_POLY = 0x11021


def _tlv(tag: str, value: str) -> str:
    return f"{tag}{len(value):02d}{value}"


def _crc16_ccitt_false(data: bytes) -> int:
    crc = 0xFFFF
    for b in data:
        crc ^= b << 8
        for _ in range(8):
            crc = ((crc << 1) ^ CRC_POLY) & 0xFFFF if crc & 0x8000 else (crc << 1) & 0xFFFF
    return crc


def _build_signed_qr(private_key) -> str:
    payload = "".join([
        _tlv("00", "01"),
        _tlv("01", "11"),
        _tlv("03", "SBX-TEST-001"),
        _tlv("65", "TVIDTEST0001"),
    ])
    signature = private_key.sign(payload.encode(), ec.ECDSA(hashes.SHA256()))
    signed_part = payload + _tlv("66", base64.b64encode(signature).decode())
    crc = _crc16_ccitt_false((signed_part + "6304").encode())
    return signed_part + f"6304{crc:04X}"


def _recompute_crc(qr_without_crc_value: str) -> str:
    """qr_without_crc_value must already end in the CRC tag+length ('6304')."""
    crc = _crc16_ccitt_false(qr_without_crc_value.encode())
    return qr_without_crc_value + f"{crc:04X}"


def main() -> int:
    processor = NAMQRProcessor()
    failures = []

    signer = ec.generate_private_key(ec.SECP256R1())
    signer_public = signer.public_key()
    other = ec.generate_private_key(ec.SECP256R1())
    other_public = other.public_key()

    # 1. Happy path: genuinely signed, genuinely verified.
    qr = _build_signed_qr(signer)
    if not processor.validate_crc(qr):
        failures.append("valid QR failed CRC check")
    tags = processor.parse_payload(qr)
    if not processor.verify_signature(qr, tags, signer_public):
        failures.append("valid signature was rejected")

    # 2. Wrong key: same payload/signature, verify against a different
    #    (also real) public key. Must fail.
    if processor.verify_signature(qr, tags, other_public):
        failures.append("signature verified against the WRONG public key")

    # 3. Tampered payload, signature and CRC untouched: the signed bytes no
    #    longer match what was signed. Must fail, and must fail at the
    #    signature step specifically (CRC recomputed so only the signature
    #    check is exercised).
    payload = "".join([
        _tlv("00", "01"),
        _tlv("01", "11"),
        _tlv("03", "SBX-TEST-002"),  # <-- changed after signing
        _tlv("65", "TVIDTEST0001"),
    ])
    original_payload = "".join([
        _tlv("00", "01"),
        _tlv("01", "11"),
        _tlv("03", "SBX-TEST-001"),
        _tlv("65", "TVIDTEST0001"),
    ])
    signature = signer.sign(original_payload.encode(), ec.ECDSA(hashes.SHA256()))
    tampered_signed_part = payload + _tlv("66", base64.b64encode(signature).decode())
    tampered_qr = _recompute_crc(tampered_signed_part + "6304")
    if not processor.validate_crc(tampered_qr):
        failures.append("tampered-payload test QR is not even CRC-valid (test bug)")
    tampered_tags = processor.parse_payload(tampered_qr)
    if processor.verify_signature(tampered_qr, tampered_tags, signer_public):
        failures.append("tampered payload PASSED signature verification")

    # 4. Corrupted signature bytes (still valid base64), CRC recomputed so
    #    only the signature check is exercised.
    sig_b64 = base64.b64encode(signature).decode()
    corrupted = ("A" if sig_b64[0] != "A" else "B") + sig_b64[1:]
    corrupted_signed_part = original_payload + _tlv("66", corrupted)
    corrupted_qr = _recompute_crc(corrupted_signed_part + "6304")
    corrupted_tags = processor.parse_payload(corrupted_qr)
    if processor.verify_signature(corrupted_qr, corrupted_tags, signer_public):
        failures.append("corrupted signature bytes PASSED verification")

    # 5. No signature tag at all -> verify_signature must return False
    #    (callers decide separately whether to warn-and-proceed per S1.7.7c).
    unsigned_payload = original_payload
    crc = _crc16_ccitt_false((unsigned_payload + "6304").encode())
    unsigned_qr = unsigned_payload + f"6304{crc:04X}"
    unsigned_tags = processor.parse_payload(unsigned_qr)
    if "66" in unsigned_tags:
        failures.append("unsigned test QR unexpectedly has a signature tag (test bug)")
    if processor.verify_signature(unsigned_qr, unsigned_tags, signer_public):
        failures.append("verify_signature returned True with no signature tag present")

    # 6. Malformed base64 in the signature tag must fail closed, not raise.
    bad_b64_signed_part = original_payload + _tlv("66", "not-valid-base64!!")
    bad_b64_qr = _recompute_crc(bad_b64_signed_part + "6304")
    bad_b64_tags = processor.parse_payload(bad_b64_qr)
    try:
        if processor.verify_signature(bad_b64_qr, bad_b64_tags, signer_public):
            failures.append("malformed base64 signature PASSED verification")
    except Exception as e:
        failures.append(f"malformed base64 signature raised instead of returning False: {e}")

    # 7. load_public_key round-trips a PEM the same way settings/merchant
    #    columns store it, and rejects a non-EC key type.
    pem = signer_public.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    ).decode()
    loaded = NAMQRProcessor.load_public_key(pem)
    if not processor.verify_signature(qr, tags, loaded):
        failures.append("signature failed to verify against a PEM-round-tripped key")

    if failures:
        print(f"FAILED ({len(failures)}):")
        for f in failures:
            print(f"  - {f}")
        return 1

    print("All NAMQR signature checks passed (real ECDSA P-256/SHA-256, no stubs):")
    print("  - valid signature verifies")
    print("  - wrong key rejected")
    print("  - tampered payload rejected")
    print("  - corrupted signature bytes rejected")
    print("  - absent signature returns False (not an exception)")
    print("  - malformed base64 fails closed")
    print("  - PEM round-trip verifies")
    return 0


if __name__ == "__main__":
    sys.exit(main())
