#ifndef MODEM_H
#define MODEM_H

// Initializes the cellular modem
void modem_init(void);

// Checks the modem's connection status
// Returns a signal strength indicator (e.g., 0-5) or a negative value on error
int modem_check_connection(void);

// Sends data over the modem
int modem_send_data(const char* data, int len);

#endif // MODEM_H
