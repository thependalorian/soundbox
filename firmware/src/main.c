#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "rtos.h"
#include "modem.h"
#include "audio.h"
#include "display.h"
#include "security.h"
#include "namqr.h"
#include "api_client.h"
#include "ota_manager.h"
#include "payment_handler.h"

// This is a simulation of a real embedded application.
// The headers above would correspond to actual hardware drivers and middleware.

// Configuration
#define API_BASE_URL "https://api.soundbox.wayame.com.na/api/v1"
#define MAX_RETRIES 3
#define HEARTBEAT_INTERVAL_S 300 // 5 minutes
#define OTA_CHECK_INTERVAL_S 86400 // 24 hours

// Global device state
typedef struct {
    char device_id[32];
    char merchant_id[50];
    char firmware_version[16];
    int network_status;
    int battery_level;
    int is_registered;
    int ota_check_counter;
} DeviceState;

DeviceState g_state = {
    .device_id = "SB-NAM-000001",
    .merchant_id = "MERCH-12345",
    .firmware_version = "v1.0.0",
    .network_status = 0,
    .battery_level = 100,
    .is_registered = 0,
    .ota_check_counter = 0
};

// Forward declarations for tasks
void payment_task(void *pvParameters);
void heartbeat_task(void *pvParameters);
void ota_check_task(void *pvParameters);

// Dummy function to simulate receiving a payment notification
PaymentNotification* receive_payment_notification() {
    // In a real device, this would come from a message queue
    // populated by the modem task upon receiving a push notification.
    // Here, we'll simulate it.
    static int should_simulate = 1;
    if (should_simulate) {
        printf("[SIM] Simulating incoming payment...\n");
        PaymentNotification* notification = (PaymentNotification*)malloc(sizeof(PaymentNotification));
        if (!notification) return NULL;

        strcpy(notification->transaction_id, "TXN123456789");
        strcpy(notification->merchant_id, g_state.merchant_id);
        strcpy(notification->amount, "150.00");
        notification->timestamp = 1672531200; // Example timestamp
        notification->status = 1; // Success
        // A dummy signature would be placed here
        memset(notification->signature, 'A', 128);
        
        should_simulate = 0; // Only simulate once
        return notification;
    }
    return NULL;
}

// Main entry point
int main(void) {
    printf("--- SoundBox Firmware Initializing ---\n");
    printf("--- WayaMe SoundBox v%s ---\n", g_state.firmware_version);

    // Initialize hardware simulation
    hardware_init();
    modem_init();
    audio_init();
    display_init();
    security_init();
    namqr_init();
    ota_init();
    
    printf("Device ID: %s\n", g_state.device_id);
    printf("Merchant ID: %s\n", g_state.merchant_id);

    // Register device with backend
    if (api_client_register_device(g_state.device_id, g_state.merchant_id)) {
        g_state.is_registered = 1;
        display_show_message("Registered");
        printf("[SUCCESS] Device registered.\n");
    } else {
        display_show_message("Reg Failed");
        printf("[ERROR] Device registration failed.\n");
        // In a real device, you would have retry logic here.
    }
    
    // These would be RTOS tasks. We simulate them with function calls.
    printf("--- Starting Tasks ---\n");
    
    // Create a pseudo-RTOS environment
    while(1) {
        payment_task(NULL);
        heartbeat_task(NULL);
        ota_check_task(NULL);
        
        // Simulate a delay
        // In a real RTOS, the scheduler handles this.
        #ifdef _WIN32
        #include <windows.h>
        Sleep(5000);
        #else
        #include <unistd.h>
        sleep(5);
        #endif
    }
    
    return 0;
}

// Payment handling task
void payment_task(void *pvParameters) {
    PaymentNotification* notification = receive_payment_notification();
    if (notification == NULL) {
        return; // No payment to process
    }
    
    printf("[TASK] Payment task running...\n");

    // Verify payment signature (simulation)
    if (verify_signature((uint8_t*)notification, sizeof(PaymentNotification) - 128, 
                         (uint8_t*)notification->signature, get_public_key())) {
        printf("[AUDIO] Playing success sound for amount: %s\n", notification->amount);
        play_audio("payment_success", notification->amount);
        
        printf("[DISPLAY] Showing amount: %s\n", notification->amount);
        display_amount(notification->amount);
        
        // Process NAMQR if present
        NAMQRResult qr_result;
        if (namqr_process("0000000000000000", &qr_result) == NAMQR_OK) {
            printf("[NAMQR] QR code validated successfully\n");
        }
        
        api_client_confirm_payment(notification->transaction_id, g_state.device_id);
    } else {
        printf("[AUDIO] Playing error sound.\n");
        play_audio("payment_error", NULL);
    }
    
    free(notification);
}

// Heartbeat task - sends device status to backend
void heartbeat_task(void *pvParameters) {
    static time_t last_heartbeat = 0;
    time_t now = time(NULL);

    if (now - last_heartbeat < HEARTBEAT_INTERVAL_S) {
        return;
    }

    printf("[TASK] Heartbeat task running...\n");

    // Read battery level (simulation)
    g_state.battery_level = read_battery_level();
    
    // Check network status (simulation)
    g_state.network_status = modem_check_connection();
    
    // Send heartbeat
    api_client_send_heartbeat(
        g_state.device_id,
        g_state.battery_level,
        g_state.network_status
    );
    
    last_heartbeat = now;
}

// OTA check task - checks for firmware updates
void ota_check_task(void *pvParameters) {
    static time_t last_ota_check = 0;
    time_t now = time(NULL);

    if (now - last_ota_check < OTA_CHECK_INTERVAL_S) {
        return;
    }

    printf("[TASK] OTA check task running...\n");

    // Check for updates
    if (ota_check_for_update(API_BASE_URL) > 0) {
        printf("[OTA] Update available, starting download...\n");
        
        // Start download (simulated)
        if (ota_start_download(0x010001, "https://updates.wayame.com.na/firmware/v1.0.1.bin") == 0) {
            // Verify firmware
            if (ota_verify_firmware()) {
                // Install update
                if (ota_install_update() == 0) {
                    printf("[OTA] Update installed successfully\n");
                    strcpy(g_state.firmware_version, "v1.0.1");
                } else {
                    printf("[OTA] Update installation failed, rolling back\n");
                    ota_rollback();
                }
            } else {
                printf("[OTA] Firmware verification failed\n");
                ota_cancel_update();
            }
        }
    }
    
    last_ota_check = now;
}
