#ifndef SECURITY_H
#define SECURITY_H

#include <stdint.h>
#include <stddef.h>

/* Real ECDSA P-256 / SHA-256 verification via mbedTLS, per Bank of Namibia
 * NAMQR Code Standards v5.0, Annexure I S1.7 ("ECDSA 256 + SHA 256"). No
 * function in this header ever returns success without mbedTLS actually
 * verifying a signature against the given data. */

void security_init(void);

/* Loads the NAMQR issuer/merchant public key used to verify signed QR
 * codes. `pem` must be a NUL-terminated PEM-encoded EC (P-256) public key.
 * Returns 0 on success, a negative mbedTLS error code otherwise. Must be
 * called (and must succeed) before verify_signature() can return 1. */
int security_load_public_key(const char* pem);

/* NAMQR Standards S1.7.6 "Verifying the QR": `data`/`len` is the QR string
 * with the signature's own tag-66 segment removed (step 3, "the entire QR
 * string excluding the signed part"); `signature_b64` is the base64-encoded
 * tag-66 value (steps 1-2). Returns 1 if the signature is valid for this
 * exact data under the loaded public key, 0 otherwise -- including when no
 * key has been loaded. Never fakes success. */
uint8_t verify_signature(const uint8_t* data, size_t len, const char* signature_b64);

// A dummy function to simulate reading the battery level
int read_battery_level(void);

// A dummy function to simulate hardware initialization
void hardware_init(void);

#endif // SECURITY_H
