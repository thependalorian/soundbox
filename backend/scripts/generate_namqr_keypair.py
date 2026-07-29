"""Generate an ECDSA P-256 keypair for signed NAMQR codes.

Referenced by `.env`, `.env.example` and the README, and until now absent —
so the instruction "generate a keypair with this script" could not be
followed.

**What the two halves are for**, per Bank of Namibia NAMQR Code Standards
v5.0, Annexure I:

- The **public** key goes into `NAMQR_ORG_PUBLIC_KEY_PEM`. The API uses it to
  verify the signature in tag 66 of a presented QR code when the merchant has
  no key of its own on file (`merchants.namqr_public_key_pem`) — the
  "parent Org ID" fallback of S1.7.2(b/c).
- The **private** key signs QR codes. This service does not sign anything, so
  it must not hold one in normal operation. The private half is printed here
  only because a development keypair is useless for testing without it: the
  test suite needs to produce a validly signed QR in order to check that
  verification accepts it and rejects a tampered one.

**Do not put the private key in `.env`.** Nothing in the application reads it,
so storing it there adds risk and buys nothing. In production the signing key
belongs to whoever presents the QR — the merchant, or its acquiring PSP on
the merchant's behalf — and this service only ever holds public halves.

Run:
    cd backend && source venv/bin/activate
    PYTHONPATH=. python scripts/generate_namqr_keypair.py
"""

import sys

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec


def main() -> int:
    # SECP256R1 is P-256, the curve the standard names. Not a choice.
    private_key = ec.generate_private_key(ec.SECP256R1())

    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode()

    public_pem = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    ).decode()

    print("=" * 70)
    print("PUBLIC KEY -- put this in NAMQR_ORG_PUBLIC_KEY_PEM (quoted, keep the")
    print("newlines exactly as shown; the PEM is invalid without them).")
    print("=" * 70)
    print(f'NAMQR_ORG_PUBLIC_KEY_PEM="{public_pem.strip()}"')
    print()
    print("=" * 70)
    print("PRIVATE KEY -- for signing QR codes in development and tests only.")
    print("Do NOT add this to .env: nothing in this service reads it, and in")
    print("production the signing key belongs to the presenting merchant or")
    print("its acquiring PSP, never to this API.")
    print("=" * 70)
    print(private_pem.strip())
    return 0


if __name__ == "__main__":
    sys.exit(main())
