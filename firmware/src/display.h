#ifndef DISPLAY_H
#define DISPLAY_H

// Initializes the display
void display_init(void);

// Shows a static message on the display
void display_show_message(const char* message);

// Shows a formatted transaction amount on the display
void display_amount(const char* amount);

#endif // DISPLAY_H
