#ifndef OTA_MANAGER_H
#define OTA_MANAGER_H

#include <stdint.h>
#include <stddef.h>

// Firmware version format: 0xXXYYZZ (major.minor.patch)
#define FIRMWARE_VERSION_MAJOR(version) ((version >> 16) & 0xFF)
#define FIRMWARE_VERSION_MINOR(version) ((version >> 8) & 0xFF)
#define FIRMWARE_VERSION_PATCH(version) (version & 0xFF)

// Current firmware version
#define CURRENT_FIRMWARE_VERSION 0x010000  // v1.0.0

// OTA Error Codes
#define OTA_OK               0
#define OTA_ERROR            -1
#define OTA_IN_PROGRESS      -2
#define OTA_VERIFY_FAILED    -3
#define OTA_NO_UPDATE        -4

/**
 * Initialize the OTA manager
 */
void ota_init(void);

/**
 * Check for firmware updates
 * @param server_url: Update server URL
 * @return 1 if update available, 0 if up-to-date, -1 on error
 */
int ota_check_for_update(const char* server_url);

/**
 * Start firmware download
 * @param version: Version to download
 * @param url: Download URL
 * @return 0 on success, -1 on error
 */
int ota_start_download(uint32_t version, const char* url);

/**
 * Verify downloaded firmware
 * @return 1 if valid, 0 if invalid, -1 on error
 */
int ota_verify_firmware(void);

/**
 * Install firmware update
 * @return 0 on success, -1 on error
 */
int ota_install_update(void);

/**
 * Rollback to previous firmware version
 * @return 0 on success, -1 on error
 */
int ota_rollback(void);

/**
 * Get current firmware version string
 * @return Version string (e.g., "v1.0.0")
 */
const char* ota_get_version(void);

/**
 * Get update progress percentage
 * @return Progress (0-100), or -1 if no update in progress
 */
int ota_get_progress(void);

/**
 * Cancel ongoing update
 */
void ota_cancel_update(void);

#endif // OTA_MANAGER_H
