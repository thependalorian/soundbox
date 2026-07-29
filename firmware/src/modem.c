#include "modem.h"
#include <stdio.h>

void modem_init(void) {
    printf("[MODEM] Initializing modem...\n");
}

int modem_check_connection(void) {
    // Simulate a good signal
    return 4;
}

int modem_send_data(const char* data, int len) {
    printf("[MODEM] Sending %d bytes of data.\n", len);
    return len; // Simulate success
}

