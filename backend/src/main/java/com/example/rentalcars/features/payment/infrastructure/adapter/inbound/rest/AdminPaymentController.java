package com.example.rentalcars.features.payment.infrastructure.adapter.inbound.rest;

import com.example.rentalcars.features.payment.domain.enums.PaymentStatus;
import com.example.rentalcars.features.payment.domain.port.inbound.PaymentService;
import com.example.rentalcars.features.payment.infrastructure.adapter.inbound.rest.dto.PaymentResponse;
import com.example.rentalcars.features.payment.infrastructure.adapter.inbound.rest.dto.PaymentStatisticsResponse;
import com.example.rentalcars.features.payment.infrastructure.adapter.inbound.rest.mapper.PaymentRestMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/admin/payments")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminPaymentController {

    private final PaymentService paymentService;
    private final PaymentRestMapper paymentRestMapper;

    @PostMapping("/{paymentId}/refund")
    public ResponseEntity<String> handleManualRefund(@PathVariable String paymentId) {
        paymentService.refundPayment(paymentId);
        return ResponseEntity.ok("Refund processed successfully");
    }

    @GetMapping
    public ResponseEntity<Page<PaymentResponse>> getAllPayments(@RequestParam(required = false) PaymentStatus status,
                                                                @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
                                                                @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
                                                                @RequestParam(required = false) String email,
                                                                @PageableDefault(size = 15, sort = "created_at", direction = Sort.Direction.DESC) Pageable pageable) {

        Page<PaymentResponse> responsePage = paymentService.getAllPaymentsFiltered(status, startDate, endDate, email, pageable)
                .map(paymentRestMapper::toResponse);

        return ResponseEntity.ok(responsePage);
    }

    @GetMapping("/stats")
    public ResponseEntity<PaymentStatisticsResponse> getPaymentStatistics(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
                                                                          @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
                                                                          @RequestParam(required = false) String email) {

        PaymentStatisticsResponse response = paymentService.getPaymentStatistics(startDate, endDate, email)
                .map(paymentRestMapper::toStatisticsResponse);

        return ResponseEntity.ok(response);
    }
}
