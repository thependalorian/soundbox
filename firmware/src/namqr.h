#ifndef NAMQR_H
#define NAMQR_H

#include <stdint.h>
#include <stddef.h>

// Table 1 (NAMQR payload data objects): tag length is fixed at 2 digits
// (max 20 fields fit our simulated buffer), value length is at most 99
// chars (2-digit length field) -- 256 leaves headroom without over-allocating.
// Moved here (was previously #define'd in namqr.c *after* this header was
// included, which used them undefined in the structs below) so both this
// header and every translation unit that includes it see the same values.
#define NAMQR_MAX_TAGS 20
#define NAMQR_MAX_TAG_LENGTH 256

// NAMQR Tag-Value structure
typedef struct {
    char tag[3];           // 2-character tag + null terminator
    int length;            // Value length
    char value[NAMQR_MAX_TAG_LENGTH];  // Value data
} NAMQRTagValue;

// NAMQR Processing Result
typedef struct {
    NAMQRTagValue tags[NAMQR_MAX_TAGS];
    int tag_count;
    char token_vault_id[64];
    // NAMQR Standards S1.7.7: whether a signature (tag 66) was present at
    // all, and -- only meaningful when is_signed is true -- whether it
    // verified. is_signed=0 is not a failure (S1.7.7c: warn, don't block).
    int is_signed;
    int signature_valid;
} NAMQRResult;

// NAMQR Error Codes
#define NAMQR_OK              0
#define NAMQR_ERROR           -1
#define NAMQR_CRC_ERROR       -2
#define NAMQR_PARSE_ERROR     -3
// NAMQR Standards S1.7.7(b): "If verification is failure either due to
// corruption or tampering the signature, then the QR request must be
// declined stating 'QR is tampered or corrupt'."
#define NAMQR_SIGNATURE_ERROR -4

/**
 * Initialize the NAMQR processor
 * Must be called before any other NAMQR functions
 */
void namqr_init(void);

/**
 * Process a NAMQR code string
 * @param qr_data: NAMQR encoded string
 * @param result: Pointer to result structure
 * @return NAMQR_OK on success, error code on failure
 */
int namqr_process(const char* qr_data, NAMQRResult* result);

/**
 * Validate CRC of NAMQR data
 * @param qr_data: NAMQR encoded string
 * @return 1 if valid, 0 if invalid
 */
int namqr_validate_crc(const char* qr_data);

/**
 * Extract Token Vault ID from parsed tags
 * @param tags: Array of parsed tags
 * @param tag_count: Number of tags
 * @param token_id: Output buffer for token ID
 * @param max_len: Maximum length of output buffer
 * @return 0 on success, -1 if not found
 */
int namqr_extract_token_vault_id(const NAMQRTagValue* tags, int tag_count,
                                 char* token_id, size_t max_len);

/**
 * Verify the digital signature (Tag 66) of a NAMQR payload, per NAMQR
 * Standards v5.0 Annexure I S1.7.6. Calls into verify_signature()
 * (security.h), which must have a public key loaded via
 * security_load_public_key() first.
 *
 * @param qr_data: the original, full NAMQR string (needed to recover the
 *                 exact bytes that were signed -- the parsed tag values
 *                 alone are not enough to reconstruct them byte-for-byte)
 * @param tags: array of parsed tags
 * @param tag_count: number of tags
 * @return 1 if a tag-66 signature is present and verifies, 0 otherwise
 *         (including when no signature tag is present at all)
 */
int namqr_verify_signature(const char* qr_data, const NAMQRTagValue* tags, int tag_count);

#endif // NAMQR_H
