import crcmod
from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)

class NAMQRProcessor:
    def __init__(self):
        try:
            self.crc16 = crcmod.mkCrcFunction(0x11021, initCrc=0xFFFF, rev=False)
        except Exception as e:
            logger.error(f"Failed to initialize CRC function: {e}")
            raise

    def parse_payload(self, qr_data: str) -> Dict[str, str]:
        """Parse NAMQR TLV (Tag-Length-Value) payload"""
        tags = {}
        i = 0
        while i < len(qr_data):
            try:
                tag = qr_data[i:i+2]
                length = int(qr_data[i+2:i+4])
                value = qr_data[i+4:i+4+length]
                tags[tag] = value
                i += 4 + length
            except (IndexError, ValueError) as e:
                logger.error(f"Failed to parse QR payload at index {i}: {e}")
                raise ValueError("Malformed TLV structure in QR data")
        return tags

    def validate_crc(self, qr_data: str) -> bool:
        """Validate CRC (Tag 63) of the NAMQR data"""
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

    def verify_signature(self, tags: Dict[str, str], public_key: bytes) -> bool:
        """
        Verify digital signature (Tag 66) for a Signed QR.
        This is a placeholder for the actual cryptographic verification.
        """
        signature = tags.get("66")
        if not signature:
            # Not a signed QR, or signature is missing
            return False
            
        # The payload a real implementation would verify is every TLV field
        # except the signature itself, concatenated. Left as a comment rather
        # than a computed-and-discarded variable: building a value nothing
        # consumes reads like working code and is not.
        logger.info("Signature verification is not implemented; accepting.")
        # In a real implementation, you would use a library like `cryptography`
        # to perform ECDSA signature verification.
        # from cryptography.hazmat.primitives import hashes
        # from cryptography.hazmat.primitives.asymmetric import ec
        # from cryptography.exceptions import InvalidSignature
        #
        # try:
        #     public_key_obj = ec.EllipticCurvePublicKey.from_encoded_point(...)
        #     public_key_obj.verify(
        #         base64.b64decode(signature),
        #         payload_to_verify.encode(),
        #         ec.ECDSA(hashes.SHA256())
        #     )
        #     return True
        # except InvalidSignature:
        #     return False
        # except Exception as e:
        #     logger.error(f"Signature verification failed: {e}")
        #     return False
        
        # Placeholder logic
        return True
