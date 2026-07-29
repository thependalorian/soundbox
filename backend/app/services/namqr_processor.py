"""NAMQR TLV parsing, CRC integrity, and ECDSA signature verification.

Per Bank of Namibia NAMQR Code Standards v5.0 (09 May 2025), Annexure I
"Signed QR":
  - Key pair: ECDSA P-256 ("ECDSA 256") + SHA-256 (S1.2, S1.7.1).
  - Signing (S1.7.3): hash-and-sign the QR string with the signature's own
    tag removed, base64-encode the signature, append it in tag 66.
  - Verifying (S1.7.6): extract tag 66, base64-decode it, verify "the
    entire QR string excluding the signed part" against it.
  - Actions (S1.7.7): valid -> proceed. Invalid/tampered -> decline ("QR is
    tampered or corrupt"). Absent -> warn, but do not block (unsigned QR is
    not fatal on its own).

Tag 66 = Signature, ANS, length up to 99 (Table 1, NAMQR payload data
objects) -- confirmed against the standard, not assumed.
"""

import base64
import logging
from typing import Dict, Iterator, Optional, Tuple

import crcmod
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.ec import EllipticCurvePublicKey

logger = logging.getLogger(__name__)

SIGNATURE_TAG = "66"


class NAMQRProcessor:
    def __init__(self):
        try:
            self.crc16 = crcmod.mkCrcFun(0x11021, initCrc=0xFFFF, rev=False)
        except Exception as e:
            logger.error(f"Failed to initialize CRC function: {e}")
            raise

    def _iter_tlv(self, qr_data: str) -> Iterator[Tuple[str, str, int]]:
        """Yields (tag, value, byte_offset_of_this_segment) in order. Shared
        by parse_payload and the signature-boundary lookup so both agree on
        exactly where each field starts and ends."""
        i = 0
        n = len(qr_data)
        while i < n:
            if i + 4 > n:
                raise ValueError("Truncated TLV header")
            tag = qr_data[i:i + 2]
            try:
                length = int(qr_data[i + 2:i + 4])
            except ValueError:
                raise ValueError(f"Non-numeric TLV length at index {i}")
            value_start = i + 4
            if value_start + length > n:
                raise ValueError("Truncated TLV value")
            value = qr_data[value_start:value_start + length]
            yield tag, value, i
            i = value_start + length

    def parse_payload(self, qr_data: str) -> Dict[str, str]:
        """Parse NAMQR TLV (Tag-Length-Value) payload."""
        tags: Dict[str, str] = {}
        try:
            for tag, value, _ in self._iter_tlv(qr_data):
                tags[tag] = value
        except ValueError as e:
            logger.error(f"Failed to parse QR payload: {e}")
            raise ValueError("Malformed TLV structure in QR data")
        return tags

    def validate_crc(self, qr_data: str) -> bool:
        """Validate CRC (Tag 63) of the NAMQR data."""
        if len(qr_data) < 8:
            return False

        data_to_check = qr_data[:-4]
        provided_crc = qr_data[-4:]

        # Per standard, the CRC is calculated over the data including the CRC tag and length
        full_data_for_crc = data_to_check

        try:
            calculated_crc = self.crc16(full_data_for_crc.encode())
            calculated_crc_hex = f"{calculated_crc:04X}"

            is_valid = calculated_crc_hex == provided_crc.upper()
            if not is_valid:
                logger.warning(f"CRC mismatch. Provided: {provided_crc}, Calculated: {calculated_crc_hex}")
            return is_valid
        except Exception as e:
            logger.error(f"CRC calculation failed: {e}")
            return False

    def extract_token_vault_id(self, tags: Dict[str, str]) -> Optional[str]:
        """Extract Token Vault Unique ID (Tag 65)"""
        return tags.get("65")

    def _signed_segment_start(self, qr_data: str) -> Optional[int]:
        """Byte offset where the tag-66 TLV segment begins, or None if the
        payload carries no signature tag."""
        try:
            for tag, _, start in self._iter_tlv(qr_data):
                if tag == SIGNATURE_TAG:
                    return start
        except ValueError:
            return None
        return None

    def verify_signature(
        self,
        qr_data: str,
        tags: Dict[str, str],
        public_key: EllipticCurvePublicKey,
    ) -> bool:
        """NAMQR Standards S1.7.6 'Verifying the QR':
        1. Extract the signature (tag 66) and separate it from the original text.
        2. Base64-decode the extracted value.
        3. Verify the remaining string against it with ECDSA/SHA-256.
        Returns False on any failure -- corrupt base64, wrong key, tampered
        payload, or a missing signature -- there is no code path that
        returns True without cryptography.hazmat actually verifying a
        signature against this exact payload.
        """
        signature_b64 = tags.get(SIGNATURE_TAG)
        if not signature_b64:
            return False

        start = self._signed_segment_start(qr_data)
        if start is None:
            return False
        signed_payload = qr_data[:start]

        try:
            signature = base64.b64decode(signature_b64, validate=True)
        except Exception:
            logger.warning("NAMQR signature (tag 66) is not valid base64.")
            return False

        try:
            public_key.verify(signature, signed_payload.encode("utf-8"), ec.ECDSA(hashes.SHA256()))
            return True
        except InvalidSignature:
            return False
        except Exception as e:
            logger.error(f"NAMQR signature verification error: {e}")
            return False

    @staticmethod
    def load_public_key(pem: str) -> EllipticCurvePublicKey:
        """Loads an ECDSA P-256 public key (NAMQR Standards S1.2: "ECDSA 256
        + SHA 256"). Raises ValueError if the PEM is malformed or is not an
        EC key -- callers must not swallow this into a silent accept."""
        key = serialization.load_pem_public_key(pem.encode("utf-8"))
        if not isinstance(key, EllipticCurvePublicKey):
            raise ValueError("NAMQR issuer/merchant key must be an EC (P-256) public key.")
        return key
