#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#ifdef _WIN32
#include <windows.h>
#else
#include <unistd.h>
#endif
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

// DEMO keypair for this simulation only -- generated with
// backend/scripts/generate_namqr_keypair.py, public key only (the matching
// private key never ships on the device; only an issuer/merchant signs).
// Replace before this ever talks to a real merchant's signed QR.
static const char* NAMQR_DEMO_PUBLIC_KEY_PEM =
    "-----BEGIN PUBLIC KEY-----\n"
    "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE6MCR9XE4EXdhFrhXc6Y3gdZ7QCN3\n"
    "NeoT6G4tfX/Pqhk3B6Lofkiei8wj5LsEQn/ugu/icM8Tx26CN0HZ/D42sQ==\n"
    "-----END PUBLIC KEY-----\n";

// A NAMQR string genuinely signed with the matching private key (tags 00,
// 01, 03, 65, then 66=signature, then 63=CRC) -- this is real ECDSA
// output, not a placeholder, so the verification below either actually
// passes or actually fails depending on what's loaded above.
static const char* NAMQR_DEMO_SIGNED_QR =
    "0002010102110312SBX-DEMO-0016512TVID000000016696MEYCIQD4YNxoNCfh"
    "CvI/OWCjm6qkwkEOKZjaFdKVIaL8wLdMpgIhAJQncyOYNhCu5bmAHyc6OO1RXEuw"
    "ZE5sjb19/c9llyuN63049C40";

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
        // The push notification itself carries no signature in this flow --
        // authenticity comes from the NAMQR the payer's device presented
        // (verified in payment_task via namqr_process()), not from this
        // struct. Left zeroed rather than filled with placeholder bytes
        // that would look like an unused signature check.
        memset(notification->signature, 0, sizeof(notification->signature));

        should_simulate = 0; // Only simulate once
        return notification;
    }
    return NULL;
}

// Main entry point
int main(void) {
    // A real device's log sink is a UART, not a buffered file -- each line
    // should reach it immediately. Also means the simulation's output
    // isn't silently lost if the process is stopped mid-run.
    setvbuf(stdout, NULL, _IONBF, 0);

    printf("--- SoundBox Firmware Initializing ---\n");
    printf("--- WayaMe SoundBox v%s ---\n", g_state.firmware_version);

    // Initialize hardware simulation
    hardware_init();
    modem_init();
    audio_init();
    display_init();
    security_init();
    if (security_load_public_key(NAMQR_DEMO_PUBLIC_KEY_PEM) != 0) {
        printf("[ERROR] Failed to load NAMQR public key -- signed QR will not verify.\n");
    }
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
        Sleep(5000);
        #else
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

    // Real ECDSA verification of the NAMQR the payer's device presented
    // (NAMQR Standards v5.0, Annexure I S1.7) -- CRC integrity, then a
    // genuine signature check via mbedTLS. Nothing here fakes success:
    // NAMQR_DEMO_SIGNED_QR is signed with the private key matching
    // NAMQR_DEMO_PUBLIC_KEY_PEM loaded in main(), so this either really
    // passes or really fails depending on what's loaded.
    NAMQRResult qr_result;
    int namqr_status = namqr_process(NAMQR_DEMO_SIGNED_QR, &qr_result);

    // S1.7.7: a present-but-invalid signature declines the transaction; an
    // absent signature is only a warning, and unsigned static/legacy QR is
    // still accepted (both map to namqr_status == NAMQR_OK here).
    if (namqr_status == NAMQR_OK) {
        if (qr_result.is_signed) {
            printf("[NAMQR] Signed QR verified -- proceeding without extra prompt.\n");
        } else {
            printf("[NAMQR] Unsigned QR -- source could not be verified, proceeding with warning.\n");
        }

        printf("[AUDIO] Playing success sound for amount: %s\n", notification->amount);
        play_audio("payment_success", notification->amount);

        printf("[DISPLAY] Showing amount: %s\n", notification->amount);
        display_amount(notification->amount);

        api_client_confirm_payment(notification->transaction_id, g_state.device_id);
    } else if (namqr_status == NAMQR_SIGNATURE_ERROR) {
        printf("[NAMQR] QR is tampered or corrupt -- declining.\n");
        printf("[AUDIO] Playing error sound.\n");
        play_audio("payment_error", NULL);
    } else {
        printf("[NAMQR] QR processing failed (status %d).\n", namqr_status);
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
