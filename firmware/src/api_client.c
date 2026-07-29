#include "api_client.h"
#include <stdio.h>

// This is a simulation. In a real device, this would use an HTTP client
// library running over the cellular modem.

int api_client_register_device(const char* device_id, const char* merchant_id) {
    printf("[API_CLIENT] Registering device %s for merchant %s...\n", device_id, merchant_id);
    // Simulate a successful API call
    return 1;
}

int api_client_send_heartbeat(const char* device_id, int battery_level, int signal_strength) {
    printf("[API_CLIENT] Sending heartbeat for %s. Battery: %d%%, Signal: %d\n", device_id, battery_level, signal_strength);
    // Simulate a successful API call
    return 1;
}

int api_client_confirm_payment(const char* transaction_id, const char* device_id) {
    printf("[API_CLIENT] Confirming payment %s for device %s...\n", transaction_id, device_id);
    // Simulate a successful API call
    return 1;
}

