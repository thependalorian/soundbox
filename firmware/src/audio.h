#ifndef AUDIO_H
#define AUDIO_H

#include <stdint.h>

// Audio configuration
typedef struct {
    uint8_t volume_level;      // 0-100
    char language_code[4];     // "en", "af", "on" (Oshiwambo)
    uint8_t is_playing;
} AudioConfig;

// Initializes the audio subsystem
void audio_init(void);

// Plays an audio file or a text-to-speech message
// In a real system, `message_type` would be an enum or defined constant
void play_audio(const char* message_type, const char* dynamic_text);

#endif // AUDIO_H
