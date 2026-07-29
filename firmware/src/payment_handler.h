#ifndef PAYMENT_HANDLER_H
#define PAYMENT_HANDLER_H

#include <stdint.h>

// Represents a payment notification received from the backend
typedef struct {
    char transaction_id[32];
    char merchant_id[50];
    char amount[20];
    uint64_t timestamp;
    uint8_t status;  // 0=pending, 1=success, 2=failed
    char signature[128]; // Signature of the notification payload
} PaymentNotification;

#endif // PAYMENT_HANDLER_H
