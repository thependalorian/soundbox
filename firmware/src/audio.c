#include "audio.h"
#include <stdio.h>

void audio_init(void) {
    printf("[AUDIO] Initializing audio subsystem...\n");
}

void play_audio(const char* message_type, const char* dynamic_text) {
    if (dynamic_text) {
        printf("[AUDIO] Playing: %s - %s\n", message_type, dynamic_text);
    } else {
        printf("[AUDIO] Playing: %s\n", message_type);
    }
}

