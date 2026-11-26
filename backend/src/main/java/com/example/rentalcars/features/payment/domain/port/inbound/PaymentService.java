package com.example.rentalcars.features.payment.domain.port.inbound;

import com.example.rentalcars.core.valueobject.Money;
import com.example.rentalcars.features.payment.domain.enums.PaymentStatus;
import com.example.rentalcars.features.payment.domain.model.Payment;
import com.example.rentalcars.features.payment.domain.model.PaymentStatistics;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.UUID;

public interface PaymentService {
    String initiatePayment(UUID reservationId, Money amount);
    void processSuccessfulPayment(String stripeIntentId, String receiptUrl);
    void refundPayment(String stripePaymentId);
    void processFailedPayment(String stripePaymentId);
    Payment getPaymentByReservationId(UUID reservationId);
    Page<Payment> getAllPaymentsFiltered(PaymentStatus status, LocalDateTime startDate, LocalDateTime endDate, String userEmail, Pageable pageable);
    PaymentStatistics getPaymentStatistics(LocalDateTime startDate, LocalDateTime endDate, String userEmail);
    int cancelExpiredPendingPayments(LocalDateTime threshold);
}