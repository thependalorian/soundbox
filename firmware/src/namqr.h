#ifndef NAMQR_H
#define NAMQR_H

#include <stdint.h>
#include <stddef.h>

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
    int signature_valid;
} NAMQRResult;

// NAMQR Error Codes
#define NAMQR_OK              0
#define NAMQR_ERROR           -1
#define NAMQR_CRC_ERROR       -2
#define NAMQR_PARSE_ERROR     -3

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
 * Verify digital signature of NAMQR code
 * @param tags: Array of parsed tags
 * @param tag_count: Number of tags
 * @param public_key: Public key for verification
 * @return 1 if valid, 0 if invalid
 */
int namqr_verify_signature(const NAMQRTagValue* tags, int tag_count, 
                           const uint8_t* public_key);

#endif // NAMQR_H
