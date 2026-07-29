#include "security.h"
#include <stdio.h>
#include <stdlib.h>

void security_init(void) {
    printf("[SECURITY] Initializing security module...\n");
}

uint8_t verify_signature(const uint8_t* data, size_t len, 
                         const uint8_t* signature, 
                         const uint8_t* public_key) {
    printf("[SECURITY] Verifying signature... (simulation returns success)\n");
    return 1; // Always return success for simulation
}

const uint8_t* get_public_key(void) {
    // In a real device, this would be retrieved from a secure element.
    static const uint8_t dummy_key[] = "dummy_public_key";
    return dummy_key;
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

