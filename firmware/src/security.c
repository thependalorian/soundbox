#include "security.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include <mbedtls/pk.h>
#include <mbedtls/sha256.h>
#include <mbedtls/base64.h>
#include <mbedtls/error.h>

static mbedtls_pk_context g_public_key;
static uint8_t g_public_key_loaded = 0;

void security_init(void) {
    mbedtls_pk_init(&g_public_key);
    printf("[SECURITY] Initializing security module...\n");
}

int security_load_public_key(const char* pem) {
    if (!pem) {
        return -1;
    }

    mbedtls_pk_free(&g_public_key);
    mbedtls_pk_init(&g_public_key);
    g_public_key_loaded = 0;

    /* mbedtls_pk_parse_public_key expects the PEM buffer length to include
     * the terminating NUL when the input is PEM (vs. raw DER). */
    int ret = mbedtls_pk_parse_public_key(&g_public_key, (const unsigned char*)pem, strlen(pem) + 1);
    if (ret != 0) {
        char errbuf[128];
        mbedtls_strerror(ret, errbuf, sizeof(errbuf));
        printf("[SECURITY] Failed to load NAMQR public key: %s\n", errbuf);
        return ret;
    }

    if (!mbedtls_pk_can_do(&g_public_key, MBEDTLS_PK_ECDSA)) {
        printf("[SECURITY] Loaded key cannot perform ECDSA -- refusing it.\n");
        mbedtls_pk_free(&g_public_key);
        mbedtls_pk_init(&g_public_key);
        return -1;
    }

    g_public_key_loaded = 1;
    printf("[SECURITY] NAMQR issuer/merchant public key loaded.\n");
    return 0;
}

uint8_t verify_signature(const uint8_t* data, size_t len, const char* signature_b64) {
    if (!g_public_key_loaded) {
        printf("[SECURITY] No NAMQR public key loaded; refusing to trust an unverifiable signature.\n");
        return 0;
    }
    if (!data || len == 0 || !signature_b64 || signature_b64[0] == '\0') {
        return 0;
    }

    /* NAMQR Standards S1.7.6 step 2: base64-decode the signature. */
    size_t b64_len = strlen(signature_b64);
    unsigned char* signature = (unsigned char*)malloc(b64_len);
    if (!signature) {
        printf("[SECURITY] Out of memory decoding signature.\n");
        return 0;
    }
    size_t sig_len = 0;
    int ret = mbedtls_base64_decode(signature, b64_len, &sig_len,
                                     (const unsigned char*)signature_b64, b64_len);
    if (ret != 0) {
        printf("[SECURITY] Signature is not valid base64.\n");
        free(signature);
        return 0;
    }

    /* SHA-256 digest of the QR string with the signature's own tag removed
     * (S1.7.6 step 3: "the entire QR string excluding the signed part"). */
    unsigned char hash[32];
    if (mbedtls_sha256(data, len, hash, 0) != 0) {
        free(signature);
        return 0;
    }

    ret = mbedtls_pk_verify(&g_public_key, MBEDTLS_MD_SHA256, hash, sizeof(hash), signature, sig_len);
    free(signature);

    if (ret != 0) {
        char errbuf[128];
        mbedtls_strerror(ret, errbuf, sizeof(errbuf));
        printf("[SECURITY] Signature verification FAILED: %s\n", errbuf);
        return 0;
    }

    printf("[SECURITY] Signature verification succeeded.\n");
    return 1;
}

int read_battery_level(void) {
    // Simulate battery level decreasing over time
    static int battery = 100;
    if (battery > 5) {
        battery -= 1;
    }
    return battery;
}

void hardware_init(void) {
    printf("[HW] Initializing hardware...\n");
}
