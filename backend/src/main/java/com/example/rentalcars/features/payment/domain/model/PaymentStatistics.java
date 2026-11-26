package com.example.rentalcars.features.payment.domain.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentStatistics {
    private BigDecimal totalRevenue;
    private BigDecimal totalRefunded;
    private long completedCount;
    private long pendingCount;
    private long failedCount;
    private long refundedCount;
    private long totalCount;
    private int successRate;
}