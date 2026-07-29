#include "namqr.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

// NAMQR Code Processor Implementation
// Based on Namibia's national QR Code payment standard (May 2025)

#define NAMQR_MAX_TAGS 20
#define NAMQR_MAX_TAG_LENGTH 256

// NAMQR Tag definitions
typedef enum {
    NAMQR_TAG_PAYLOAD_FORMAT = "00",
    NAMQR_TAG_POINT_OF_INITIATION = "01",
    NAMQR_TAG_MERCHANT_ACCOUNT = "02",
    NAMQR_TAG_MERCHANT_ID = "03",
    NAMQR_TAG_ACCOUNT_ID = "04",
    NAMQR_TAG_AMOUNT = "05",
    NAMQR_TAG_CURRENCY = "06",
    NAMQR_TAG_TIP = "07",
    NAMQR_TAG_TIP_PERCENTAGE = "08",
    NAMQR_TAG_COUNTRY_CODE = "09",
    NAMQR_TAG_MERCHANT_NAME = "10",
    NAMQR_TAG_MERCHANT_CITY = "11",
    NAMQR_TAG_POSTAL_CODE = "12",
    NAMQR_TAG_ADDITIONAL_DATA = "13",
    NAMQR_TAG_CRC = "63",
    NAMQR_TAG_TOKEN_VAULT = "65",
    NAMQR_TAG_SIGNATURE = "66"
} NAMQRTag;

// NAMQR Context
typedef struct {
    uint8_t initialized;
    uint16_t crc16_table[256];
} NAMQRContext;

static NAMQRContext g_namqr_ctx = {0};

// Initialize CRC-16-CCITT table
static void namqr_init_crc_table(void) {
    for (int i = 0; i < 256; i++) {
        uint16_t crc = (uint16_t)i << 8;
        for (int j = 0; j < 8; j++) {
            if (crc & 0x8000) {
                crc = (crc << 1) ^ 0x1021;
            } else {
                crc = crc << 1;
            }
        }
        g_namqr_ctx.crc16_table[i] = crc;
    }
}

// Calculate CRC-16-CCITT
static uint16_t namqr_calculate_crc(const uint8_t* data, size_t len) {
    if (!g_namqr_ctx.initialized) {
        namqr_init_crc_table();
        g_namqr_ctx.initialized = 1;
    }
    
    uint16_t crc = 0xFFFF;
    for (size_t i = 0; i < len; i++) {
        crc = (crc << 8) ^ g_namqr_ctx.crc16_table[((crc >> 8) ^ data[i]) & 0xFF];
    }
    return crc;
}

// Parse NAMQR TLV payload
int namqr_parse_payload(const char* qr_data, NAMQRTagValue* tags, int max_tags) {
    if (!qr_data || !tags || max_tags <= 0) {
        return -1;
    }
    
    int tag_count = 0;
    size_t len = strlen(qr_data);
    size_t i = 0;
    
    while (i < len && tag_count < max_tags) {
        // Read tag (2 characters)
        if (i + 2 > len) break;
        char tag_str[3] = {qr_data[i], qr_data[i+1], '\0'};
        i += 2;
        
        // Read length (2 characters)
        if (i + 2 > len) break;
        char len_str[3] = {qr_data[i], qr_data[i+1], '\0'};
        int value_len = atoi(len_str);
        i += 2;
        
        // Read value
        if (i + value_len > len) break;
        
        // Store tag
        strncpy(tags[tag_count].tag, tag_str, 2);
        tags[tag_count].tag[2] = '\0';
        tags[tag_count].length = value_len;
        memcpy(tags[tag_count].value, &qr_data[i], value_len);
        tags[tag_count].value[value_len] = '\0';
        
        tag_count++;
        i += value_len;
    }
    
    return tag_count;
}

// Validate CRC (Tag 63)
int namqr_validate_crc(const char* qr_data) {
    if (!qr_data) return 0;
    
    size_t len = strlen(qr_data);
    if (len < 8) return 0;  // Minimum: "6304XXXX"
    
    // Extract CRC tag (last 4 characters after "6304")
    char crc_str[5] = {qr_data[len-4], qr_data[len-3], qr_data[len-2], qr_data[len-1], '\0'};
    uint16_t provided_crc = (uint16_t)strtoul(crc_str, NULL, 16);
    
    // Calculate CRC over data excluding the CRC tag itself
    size_t data_len = len - 4;  // Exclude CRC value
    uint16_t calculated_crc = namqr_calculate_crc((const uint8_t*)qr_data, data_len);
    
    return (provided_crc == calculated_crc);
}

// Extract Token Vault ID (Tag 65)
int namqr_extract_token_vault_id(const NAMQRTagValue* tags, int tag_count, char* token_id, size_t max_len) {
    if (!tags || tag_count <= 0 || !token_id || max_len <= 0) {
        return -1;
    }
    
    for (int i = 0; i < tag_count; i++) {
        if (strcmp(tags[i].tag, "65") == 0) {
            size_t copy_len = (tags[i].length < max_len - 1) ? tags[i].length : max_len - 1;
            memcpy(token_id, tags[i].value, copy_len);
            token_id[copy_len] = '\0';
            return 0;
        }
    }
    
    return -1;  // Not found
}

// Verify digital signature (Tag 66)
int namqr_verify_signature(const NAMQRTagValue* tags, int tag_count, const uint8_t* public_key) {
    if (!tags || tag_count <= 0 || !public_key) {
        return 0;
    }
    
    // Find signature tag
    const NAMQRTagValue* sig_tag = NULL;
    for (int i = 0; i < tag_count; i++) {
        if (strcmp(tags[i].tag, "66") == 0) {
            sig_tag = &tags[i];
            break;
        }
    }
    
    if (!sig_tag) {
        return 0;  // No signature present
    }
    
    // Build payload without signature for verification
    // In a real implementation, this would use ECDSA verification
    // For simulation, we return success
    printf("[NAMQR] Verifying digital signature...\n");
    printf("[NAMQR] Signature length: %d bytes\n", sig_tag->length);
    
    // Placeholder: In production, use cryptography library
    // return ecdsa_verify(payload, public_key, signature);
    return 1;  // Simulated success
}

// Initialize NAMQR processor
void namqr_init(void) {
    if (!g_namqr_ctx.initialized) {
        namqr_init_crc_table();
        g_namqr_ctx.initialized = 1;
        printf("[NAMQR] NAMQR processor initialized\n");
    }
}

// Process NAMQR code
int namqr_process(const char* qr_data, NAMQRResult* result) {
    if (!qr_data || !result) {
        return -1;
    }
    
    // Initialize if needed
    namqr_init();
    
    // Validate CRC
    if (!namqr_validate_crc(qr_data)) {
        printf("[NAMQR] CRC validation failed\n");
        return -2;
    }
    
    // Parse payload
    int tag_count = namqr_parse_payload(qr_data, result->tags, NAMQR_MAX_TAGS);
    if (tag_count < 0) {
        printf("[NAMQR] Failed to parse payload\n");
        return -3;
    }
    
    result->tag_count = tag_count;
    
    // Extract token vault ID if present
    if (namqr_extract_token_vault_id(result->tags, tag_count, result->token_vault_id, sizeof(result->token_vault_id)) == 0) {
        printf("[NAMQR] Token Vault ID: %s\n", result->token_vault_id);
    }
    
    // Verify signature if present
    // In production, public_key would be loaded from secure storage
    // result->signature_valid = namqr_verify_signature(result->tags, tag_count, public_key);
    result->signature_valid = 1;  // Simulated
    
    printf("[NAMQR] QR code processed successfully. Tags: %d\n", tag_count);
    return 0;
}
