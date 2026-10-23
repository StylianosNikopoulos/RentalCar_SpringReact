package com.example.rentalcars.features.payment.infrastructure.adapter.outbound.persistence;

import com.example.rentalcars.features.payment.domain.enums.PaymentStatus;
import com.example.rentalcars.features.payment.domain.model.Payment;
import com.example.rentalcars.features.payment.domain.port.outbound.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class PaymentRepositoryImpl implements PaymentRepository {
    private final PaymentJpaRepository jpaRepository;
    private final PaymentPersistenceMapper mapper;

    @Override
    public Payment save(Payment payment) {
        PaymentJpaEntity entity = mapper.toEntity(payment);
        PaymentJpaEntity savedEntity = jpaRepository.save(entity);
        return mapper.toDomain(savedEntity);
    }

    @Override
    public Optional<Payment> findByStripeId(String stripeId) {
        return jpaRepository.findByStripePaymentId(stripeId)
                .map(mapper::toDomain);
    }

    @Override
    public Optional<Payment> findByReservationId(UUID reservationId) {
        return jpaRepository.findByReservationId(reservationId)
                .map(mapper::toDomain);
    }

    @Override
    public Page<Payment> findAllFiltered(PaymentStatus status, LocalDateTime startDate, LocalDateTime endDate, String userEmail, Pageable pageable) {
        String statusStr = status != null ? status.name() : null;
        String emailFilter = (userEmail != null && !userEmail.isBlank()) ? userEmail.trim() : null;

        return jpaRepository.findAllFilteredNative(statusStr, startDate, endDate, emailFilter, pageable)
                .map(mapper::toDomain);
    }

    @Override
    public int cancelExpiredPending(LocalDateTime threshold) {
        return jpaRepository.cancelExpiredPendingPayments(threshold);
    }

    @Override
    public Optional<Payment> findById(UUID id) {
        return jpaRepository.findById(id)
                .map(mapper::toDomain);
    }
}