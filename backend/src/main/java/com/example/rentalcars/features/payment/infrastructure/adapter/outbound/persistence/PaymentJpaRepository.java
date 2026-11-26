package com.example.rentalcars.features.payment.infrastructure.adapter.outbound.persistence;

import com.example.rentalcars.features.payment.domain.model.PaymentStatistics;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

public interface PaymentJpaRepository extends JpaRepository<PaymentJpaEntity, UUID> {
    Optional<PaymentJpaEntity> findByStripePaymentId(String stripePaymentId);
    Optional<PaymentJpaEntity> findByReservationId(UUID reservationId);

    @Query(value = """
            SELECT p.*
            FROM payments p
            LEFT JOIN reservations r ON p.reservation_id = r.id
            LEFT JOIN users u ON r.user_id = u.id
            WHERE (CAST(:status AS text) IS NULL OR :status = '' OR p.status = :status)
              AND (CAST(:startDate AS timestamp) IS NULL OR p.created_at >= :startDate)
              AND (CAST(:endDate AS timestamp) IS NULL OR p.created_at <= :endDate)
              AND (CAST(:email AS text) IS NULL OR :email = '' OR LOWER(u.email) LIKE LOWER(CONCAT('%', :email, '%')))
            """,
            countQuery = """
            SELECT COUNT(p.id)
            FROM payments p
            LEFT JOIN reservations r ON p.reservation_id = r.id
            LEFT JOIN users u ON r.user_id = u.id
            WHERE (CAST(:status AS text) IS NULL OR :status = '' OR p.status = :status)
              AND (CAST(:startDate AS timestamp) IS NULL OR p.created_at >= :startDate)
              AND (CAST(:endDate AS timestamp) IS NULL OR p.created_at <= :endDate)
              AND (CAST(:email AS text) IS NULL OR :email = '' OR LOWER(u.email) LIKE LOWER(CONCAT('%', :email, '%')))
            """,
            nativeQuery = true)
    Page<PaymentJpaEntity> findAllFilteredNative(
            @Param("status") String status,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate,
            @Param("email") String email,
            Pageable pageable
    );

    @Modifying(clearAutomatically = true)
    @Query("UPDATE PaymentJpaEntity p SET p.status = 'FAILED', p.updatedAt = CURRENT_TIMESTAMP " +
            "WHERE p.status = 'PENDING' AND p.createdAt < :threshold")
    int cancelExpiredPendingPayments(@Param("threshold") LocalDateTime threshold);

    @Query(value = """
            SELECT
                CAST(COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'COMPLETED'), 0) AS NUMERIC) AS totalRevenue,
                CAST(COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'REFUNDED'), 0) AS NUMERIC) AS totalRefunded,
                COUNT(*) FILTER (WHERE p.status = 'COMPLETED') AS completedCount,
                COUNT(*) FILTER (WHERE p.status = 'PENDING') AS pendingCount,
                COUNT(*) FILTER (WHERE p.status = 'FAILED') AS failedCount,
                COUNT(*) FILTER (WHERE p.status = 'REFUNDED') AS refundedCount,
                COUNT(*) AS totalCount,
                CAST(
                    CASE WHEN COUNT(*) = 0 THEN 0
                         ELSE ROUND(COUNT(*) FILTER (WHERE p.status = 'COMPLETED') * 100.0 / COUNT(*))
                    END AS INTEGER
                ) AS successRate
            FROM payments p
            LEFT JOIN reservations r ON p.reservation_id = r.id
            LEFT JOIN users u ON r.user_id = u.id
            WHERE (CAST(:startDate AS timestamp) IS NULL OR p.created_at >= :startDate)
              AND (CAST(:endDate AS timestamp) IS NULL OR p.created_at <= :endDate)
              AND (CAST(:email AS text) IS NULL OR :email = '' OR LOWER(u.email) LIKE LOWER(CONCAT('%', :email, '%')))
            """,
            nativeQuery = true)
    PaymentStatistics getStatistics(
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate,
            @Param("email") String email
    );
}