package com.example.rentalcars.features.payment.infrastructure.adapter.inbound.rest.dto;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class PaymentStatisticsResponse {
    private BigDecimal totalRevenue;
    private BigDecimal totalRefunded;
    private long completedCount;
    private long pendingCount;
    private long failedCount;
    private long refundedCount;
    private long totalCount;
    private int successRate;
}