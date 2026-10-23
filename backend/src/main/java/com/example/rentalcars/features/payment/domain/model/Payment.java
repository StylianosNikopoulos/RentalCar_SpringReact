package com.example.rentalcars.features.payment.domain.model;

import com.example.rentalcars.core.domain.AggregateRoot;
import com.example.rentalcars.core.valueobject.Money;
import com.example.rentalcars.features.payment.domain.enums.PaymentStatus;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
public class Payment extends AggregateRoot {
    private UUID reservationId;
    private String userEmail;
    private Money amount;
    private String stripePaymentId;
    private String stripePaymentIntentId;
    private PaymentStatus status;
    private String receiptUrl;

    @Builder
    public Payment(UUID id, LocalDateTime createdAt, LocalDateTime updatedAt, UUID reservationId, String userEmail, Money amount, String stripePaymentId, String stripePaymentIntentId, PaymentStatus status, String receiptUrl) {        super(id, createdAt, updatedAt);
        this.reservationId = reservationId;
        this.userEmail = userEmail;
        this.amount = amount;
        this.stripePaymentId = stripePaymentId;
        this.stripePaymentIntentId = stripePaymentIntentId;
        this.status = status;
        this.receiptUrl = receiptUrl;
    }
}