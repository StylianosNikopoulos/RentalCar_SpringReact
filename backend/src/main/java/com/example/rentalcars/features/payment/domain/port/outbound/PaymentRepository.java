package com.example.rentalcars.features.payment.domain.port.outbound;

import com.example.rentalcars.features.payment.domain.enums.PaymentStatus;
import com.example.rentalcars.features.payment.domain.model.Payment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

public interface PaymentRepository {
    Payment save(Payment payment);
    Optional<Payment> findByStripeId(String stripeId);
    Optional<Payment> findById(UUID id);
    Optional<Payment> findByReservationId(UUID reservationId);
    Page<Payment> findAllFiltered(PaymentStatus status, LocalDateTime startDate, LocalDateTime endDate, String userEmail, Pageable pageable);
    int cancelExpiredPending(LocalDateTime threshold);
}