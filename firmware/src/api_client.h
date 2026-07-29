#ifndef API_CLIENT_H
#define API_CLIENT_H

#include <stdint.h>

// Registers the device with the backend server
// Returns 1 on success, 0 on failure
int api_client_register_device(const char* device_id, const char* merchant_id);

// Sends a heartbeat signal to the backend
// Returns 1 on success, 0 on failure
int api_client_send_heartbeat(const char* device_id, int battery_level, int signal_strength);

// Confirms to the backend that a payment notification has been processed
// Returns 1 on success, 0 on failure
int api_client_confirm_payment(const char* transaction_id, const char* device_id);

#endif // API_CLIENT_H
