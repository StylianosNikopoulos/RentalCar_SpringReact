package com.example.rentalcars.features.payment;

import com.example.rentalcars.core.valueobject.Money;
import com.example.rentalcars.features.payment.domain.enums.PaymentStatus;
import com.example.rentalcars.features.payment.domain.exception.InvalidPaymentStatusException;
import com.example.rentalcars.features.payment.domain.exception.PaymentNotFoundException;
import com.example.rentalcars.features.payment.domain.exception.StripePaymentException;
import com.example.rentalcars.features.payment.domain.model.Payment;
import com.example.rentalcars.features.payment.domain.port.outbound.PaymentEmailPort;
import com.example.rentalcars.features.payment.domain.port.outbound.PaymentRepository;
import com.example.rentalcars.features.payment.service.PaymentServiceImpl;
import com.example.rentalcars.features.reservation.domain.model.Reservation;
import com.example.rentalcars.features.reservation.domain.port.inbound.ReservationService;
import com.example.rentalcars.features.user.domain.model.User;
import com.example.rentalcars.features.user.domain.port.inbound.UserService;
import com.stripe.exception.InvalidRequestException;
import com.stripe.model.Charge;
import com.stripe.model.PaymentIntent;
import com.stripe.model.Refund;
import com.stripe.model.checkout.Session;
import com.stripe.param.PaymentIntentRetrieveParams;
import com.stripe.param.RefundCreateParams;
import com.stripe.param.checkout.SessionCreateParams;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentServiceImplTest {

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private ReservationService reservationService;

    @Mock
    private PaymentEmailPort paymentEmailPort;

    @Mock
    private UserService userService;

    private PaymentServiceImpl paymentService;

    @BeforeEach
    void setUp() {
        paymentService = new PaymentServiceImpl(
                paymentRepository,
                reservationService,
                paymentEmailPort,
                userService
        );
        ReflectionTestUtils.setField(paymentService, "frontendUrl", "http://localhost:3000");
    }

    // INITIATE PAYMENT
    @Test
    void initiatePayment_shouldCreateStripeSessionAndSavePendingPayment() {
        UUID reservationId = UUID.randomUUID();
        Money amount = new Money(BigDecimal.valueOf(100), "EUR");

        Session mockSession = mock(Session.class);
        when(mockSession.getId()).thenReturn("cs_test_123");
        when(mockSession.getUrl()).thenReturn("https://checkout.stripe.com/pay/cs_test_123");

        try (MockedStatic<Session> mockedSession = mockStatic(Session.class)) {
            mockedSession.when(() -> Session.create(any(SessionCreateParams.class))).thenReturn(mockSession);

            String sessionUrl = paymentService.initiatePayment(reservationId, amount);

            assertEquals("https://checkout.stripe.com/pay/cs_test_123", sessionUrl);
            verify(paymentRepository).save(argThat(payment ->
                    payment.getReservationId().equals(reservationId)
                            && payment.getAmount().equals(amount)
                            && payment.getStripePaymentId().equals("cs_test_123")
                            && payment.getStatus() == PaymentStatus.PENDING
            ));
        }
    }

    @Test
    void initiatePayment_shouldThrowStripePaymentExceptionWhenStripeFails() {
        UUID reservationId = UUID.randomUUID();
        Money amount = new Money(BigDecimal.valueOf(100), "EUR");

        try (MockedStatic<Session> mockedSession = mockStatic(Session.class)) {
            mockedSession.when(() -> Session.create(any(SessionCreateParams.class)))
                    .thenThrow(new InvalidRequestException("Stripe error", null, null, null, null, null));

            assertThrows(StripePaymentException.class, () -> paymentService.initiatePayment(reservationId, amount));
            verify(paymentRepository, never()).save(any());
        }
    }

    // PROCESS SUCCESSFUL PAYMENT
    @Test
    void processSuccessfulPayment_shouldUpdatePaymentConfirmReservationAndSendEmail() {
        String stripePaymentId = "cs_test_123";
        String paymentIntentId = "pi_test_456";
        UUID reservationId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        Payment payment = Payment.builder()
                .id(UUID.randomUUID())
                .reservationId(reservationId)
                .amount(new Money(BigDecimal.valueOf(100), "EUR"))
                .stripePaymentId(stripePaymentId)
                .status(PaymentStatus.PENDING)
                .build();

        Reservation reservation = Reservation.builder()
                .id(reservationId)
                .userId(userId)
                .build();

        User user = User.builder()
                .id(userId)
                .email("john@example.com")
                .build();

        PaymentIntent mockPaymentIntent = mock(PaymentIntent.class);
        Charge mockCharge = mock(Charge.class);
        when(mockCharge.getReceiptUrl()).thenReturn("https://receipt.stripe.com/123");
        when(mockPaymentIntent.getLatestChargeObject()).thenReturn(mockCharge);

        when(paymentRepository.findByStripeId(stripePaymentId)).thenReturn(Optional.of(payment));
        when(reservationService.confirmReservation(reservationId)).thenReturn(reservation);
        when(userService.getInternalUserById(userId)).thenReturn(user);

        try (MockedStatic<PaymentIntent> mockedPaymentIntent = mockStatic(PaymentIntent.class)) {
            mockedPaymentIntent.when(() -> PaymentIntent.retrieve(eq(paymentIntentId), any(PaymentIntentRetrieveParams.class), any()))
                    .thenReturn(mockPaymentIntent);

            paymentService.processSuccessfulPayment(stripePaymentId, paymentIntentId);

            assertEquals(PaymentStatus.COMPLETED, payment.getStatus());
            assertEquals("https://receipt.stripe.com/123", payment.getReceiptUrl());
            assertEquals(paymentIntentId, payment.getStripePaymentIntentId());

            verify(paymentRepository).save(payment);
            verify(reservationService).confirmReservation(reservationId);
            verify(paymentEmailPort).sendPaymentConfirmationEmail("john@example.com", "100.00 EUR", "https://receipt.stripe.com/123");
        }
    }

    @Test
    void processSuccessfulPayment_shouldThrowNotFoundWhenStripeIdInvalid() {
        when(paymentRepository.findByStripeId("invalid_id")).thenReturn(Optional.empty());

        assertThrows(PaymentNotFoundException.class, () -> paymentService.processSuccessfulPayment("invalid_id", "pi_123"));
    }

    // REFUND PAYMENT
    @Test
    void refundPayment_shouldProcessRefundAndUpdateStatusAndSendEmail() {
        String stripePaymentId = "cs_test_123";
        UUID reservationId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        Payment payment = Payment.builder()
                .id(UUID.randomUUID())
                .reservationId(reservationId)
                .amount(new Money(BigDecimal.valueOf(100), "EUR"))
                .stripePaymentId(stripePaymentId)
                .stripePaymentIntentId("pi_test_456")
                .status(PaymentStatus.COMPLETED)
                .build();

        Reservation reservation = Reservation.builder()
                .id(reservationId)
                .userId(userId)
                .build();

        User user = User.builder()
                .id(userId)
                .email("john@example.com")
                .build();

        when(paymentRepository.findByStripeId(stripePaymentId)).thenReturn(Optional.of(payment));
        when(reservationService.cancelReservationInternal(reservationId)).thenReturn(reservation);
        when(userService.getInternalUserById(userId)).thenReturn(user);

        try (MockedStatic<Refund> mockedRefund = mockStatic(Refund.class)) {
            mockedRefund.when(() -> Refund.create(any(RefundCreateParams.class))).thenReturn(mock(Refund.class));

            paymentService.refundPayment(stripePaymentId);

            assertEquals(PaymentStatus.REFUNDED, payment.getStatus());
            verify(paymentRepository).save(payment);
            verify(reservationService).cancelReservationInternal(reservationId);
            verify(paymentEmailPort).sendRefundConfirmationEmail("john@example.com", "100.00 EUR", reservationId.toString());
        }
    }

    @Test
    void refundPayment_shouldThrowInvalidStatusWhenNotCompleted() {
        String stripePaymentId = "cs_test_123";
        Payment payment = Payment.builder()
                .id(UUID.randomUUID())
                .stripePaymentId(stripePaymentId)
                .status(PaymentStatus.PENDING)
                .build();

        when(paymentRepository.findByStripeId(stripePaymentId)).thenReturn(Optional.of(payment));

        assertThrows(InvalidPaymentStatusException.class, () -> paymentService.refundPayment(stripePaymentId));
        verify(paymentRepository, never()).save(any());
    }

    // PROCESS FAILED PAYMENT
    @Test
    void processFailedPayment_shouldSetStatusFailedAndCancelReservation() {
        String stripePaymentId = "cs_test_123";
        UUID reservationId = UUID.randomUUID();

        Payment payment = Payment.builder()
                .id(UUID.randomUUID())
                .reservationId(reservationId)
                .stripePaymentId(stripePaymentId)
                .status(PaymentStatus.PENDING)
                .build();

        when(paymentRepository.findByStripeId(stripePaymentId)).thenReturn(Optional.of(payment));

        paymentService.processFailedPayment(stripePaymentId);

        assertEquals(PaymentStatus.FAILED, payment.getStatus());
        verify(paymentRepository).save(payment);
        verify(reservationService).cancelReservationInternal(reservationId);
    }

    // READ & MAINTENANCE METHODS
    @Test
    void getPaymentByReservationId_shouldReturnPayment() {
        UUID resId = UUID.randomUUID();
        Payment payment = Payment.builder().id(UUID.randomUUID()).reservationId(resId).build();

        when(paymentRepository.findByReservationId(resId)).thenReturn(Optional.of(payment));

        Payment result = paymentService.getPaymentByReservationId(resId);
        assertSame(payment, result);
    }

    @Test
    void getPaymentByReservationId_shouldThrowExceptionWhenNotFound() {
        UUID resId = UUID.randomUUID();
        when(paymentRepository.findByReservationId(resId)).thenReturn(Optional.empty());

        assertThrows(PaymentNotFoundException.class, () -> paymentService.getPaymentByReservationId(resId));
    }

    @Test
    void getAllPaymentsFiltered_shouldReturnPagedPayments() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Payment> page = new PageImpl<>(List.of(new Payment()));
        when(paymentRepository.findAllFiltered(eq(PaymentStatus.COMPLETED), any(), any(), any(), eq(pageable))).thenReturn(page);

        Page<Payment> result = paymentService.getAllPaymentsFiltered(PaymentStatus.COMPLETED, null, null, null, pageable);
        assertEquals(1, result.getTotalElements());
    }

    @Test
    void cancelExpiredPendingPayments_shouldReturnUpdatedCount() {
        LocalDateTime threshold = LocalDateTime.now().minusHours(1);
        when(paymentRepository.cancelExpiredPending(threshold)).thenReturn(5);

        int count = paymentService.cancelExpiredPendingPayments(threshold);
        assertEquals(5, count);
        verify(paymentRepository).cancelExpiredPending(threshold);
    }
}