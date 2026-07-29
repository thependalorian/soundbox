#include "display.h"
#include <stdio.h>

void display_init(void) {
    printf("[DISPLAY] Initializing display...\n");
}

void display_show_message(const char* message) {
    printf("[DISPLAY] Showing message: %s\n", message);
}

void display_amount(const char* amount) {
    printf("[DISPLAY] Showing amount: N$ %s\n", amount);
}

