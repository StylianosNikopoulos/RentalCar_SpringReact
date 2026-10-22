package com.example.rentalcars.features.payment.service;

import com.example.rentalcars.core.valueobject.Money;
import com.example.rentalcars.features.payment.domain.enums.PaymentStatus;
import com.example.rentalcars.features.payment.domain.exception.InvalidPaymentStatusException;
import com.example.rentalcars.features.payment.domain.exception.PaymentNotFoundException;
import com.example.rentalcars.features.payment.domain.exception.StripePaymentException;
import com.example.rentalcars.features.payment.domain.model.Payment;
import com.example.rentalcars.features.payment.domain.port.inbound.PaymentService;
import com.example.rentalcars.features.payment.domain.port.outbound.PaymentEmailPort;
import com.example.rentalcars.features.payment.domain.port.outbound.PaymentRepository;
import com.example.rentalcars.features.reservation.domain.model.Reservation;
import com.example.rentalcars.features.reservation.domain.port.inbound.ReservationService;
import com.example.rentalcars.features.user.domain.model.User;
import com.example.rentalcars.features.user.domain.port.inbound.UserService;
import com.stripe.exception.StripeException;
import com.stripe.model.PaymentIntent;
import com.stripe.model.Refund;
import com.stripe.model.checkout.Session;
import com.stripe.param.PaymentIntentRetrieveParams;
import com.stripe.param.RefundCreateParams;
import com.stripe.param.checkout.SessionCreateParams;
import jakarta.transaction.Transactional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
public class PaymentServiceImpl implements PaymentService {

    private final PaymentRepository paymentRepository;
    private final ReservationService reservationService;
    private final PaymentEmailPort paymentEmailPort;
    private final UserService userService;

    @Value("${APP_FRONTEND_URL}")
    private String frontendUrl;

    public PaymentServiceImpl(PaymentRepository paymentRepository, @Lazy ReservationService reservationService, PaymentEmailPort paymentEmailPort, UserService userService) {
        this.paymentRepository = paymentRepository;
        this.reservationService = reservationService;
        this.paymentEmailPort = paymentEmailPort;
        this.userService = userService;
    }

    @Override
    @Transactional
    public String initiatePayment(UUID reservationId, Money amount) {
        try {
            SessionCreateParams params = SessionCreateParams.builder()
                    .addPaymentMethodType(SessionCreateParams.PaymentMethodType.CARD)
                    .setMode(SessionCreateParams.Mode.PAYMENT)
                    .setSuccessUrl(frontendUrl + "/reservations?success=true")
                    .setCancelUrl(frontendUrl + "/reservations?canceled=true")
                    .addLineItem(SessionCreateParams.LineItem.builder()
                            .setQuantity(1L)
                            .setPriceData(SessionCreateParams.LineItem.PriceData.builder()
                                    .setCurrency("eur")
                                    .setUnitAmount((long) (amount.amount().doubleValue() * 100))
                                    .setProductData(SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                            .setName("Rental Car" + reservationId.toString().substring(0, 8))
                                            .build())
                                    .build())
                            .build())
                    .putMetadata("reservationId", reservationId.toString())
                    .build();

            Session session = Session.create(params);
            log.info("Stripe Checkout Session created successfully with ID: {} for reservation ID: {}", session.getId(), reservationId);

            Payment payment = Payment.builder()
                    .id(UUID.randomUUID())
                    .reservationId(reservationId)
                    .amount(amount)
                    .stripePaymentId(session.getId())
                    .status(PaymentStatus.PENDING)
                    .receiptUrl(null)
                    .build();

            paymentRepository.save(payment);
            log.debug("Payment record saved with status PENDING for reservation ID: {}", reservationId);

            return session.getUrl();

        } catch (StripeException e) {
            log.error("Stripe Exception occurred while creating Checkout Session for reservation ID: {}. Error: {}", reservationId, e.getMessage(), e);
            throw new StripePaymentException("Stripe Session Creation Failed", "STRIPE_PAYMENT_FAILED");
        }
    }

    @Override
    @Transactional
    public void processSuccessfulPayment(String stripePaymentId, String paymentIntentId) {
        log.info("Processing successful payment webhook for Stripe Payment ID: {}", stripePaymentId);

        Payment payment = paymentRepository.findByStripeId(stripePaymentId)
                .orElseThrow(() -> {
                    log.error("Payment not found with Stripe ID: {}", stripePaymentId);
                    return new PaymentNotFoundException(stripePaymentId);
                });

        String receiptUrl = extractReceiptUrlFromPaymentIntent(paymentIntentId);

        payment.setStatus(PaymentStatus.COMPLETED);
        payment.setReceiptUrl(receiptUrl);
        payment.setStripePaymentIntentId(paymentIntentId);
        paymentRepository.save(payment);
        log.info("Payment ID: {} status updated to COMPLETED with Receipt URL: {}", payment.getId(), receiptUrl);

        Reservation reservation = reservationService.confirmReservation(payment.getReservationId());

        Optional.ofNullable(reservation)
                .map(Reservation::getUserId)
                .map(userService::getInternalUserById)
                .filter(user -> user.getEmail() != null && !user.getEmail().isBlank())
                .ifPresentOrElse(
                        user -> sendConfirmationEmail(user, payment, receiptUrl, reservation.getId()),
                        () -> log.warn("User or User Email not found for reservation ID: {}. Email was not sent.",
                                Optional.ofNullable(reservation).map(Reservation::getId).orElse(null))
                );
    }

    @Override
    @Transactional
    public void refundPayment(String stripePaymentId) {
        log.info("Initiating refund process for Stripe Payment ID: {}", stripePaymentId);

        Payment payment = paymentRepository.findByStripeId(stripePaymentId)
                .orElseThrow(() -> {
                    log.error("Payment not found for refund with Stripe ID: {}", stripePaymentId);
                    return new PaymentNotFoundException(stripePaymentId);
                });

        if (payment.getStatus() != PaymentStatus.COMPLETED) {
            log.warn("Attempted refund on payment ID: {} with non-COMPLETED status: {}", payment.getId(), payment.getStatus());
            throw new InvalidPaymentStatusException("Refund can only be processed for COMPLETED payments. Current status: " + payment.getStatus());
        }

        try {
            RefundCreateParams params = RefundCreateParams.builder()
                    .setPaymentIntent(payment.getStripePaymentIntentId())
                    .build();

            Refund.create(params);
            payment.setStatus(PaymentStatus.REFUNDED);
            paymentRepository.save(payment);
            log.info("Payment ID: {} successfully refunded and updated in DB", payment.getId());

        } catch (StripeException e) {
            log.error("Stripe refund exception for Stripe Payment ID: {}. Error: {}", stripePaymentId, e.getMessage(), e);
            throw new StripePaymentException("Error communication with Stripe for Refund", "STRIPE_REFUND_FAILED");
        }
    }

    @Override
    @Transactional
    public void processFailedPayment(String stripePaymentId) {
        log.info("Processing failed payment webhook for Stripe Payment ID: {}", stripePaymentId);

        Payment payment = paymentRepository.findByStripeId(stripePaymentId)
                .orElseThrow(() -> {
                    log.error("Payment not found for failed status update with Stripe ID: {}", stripePaymentId);
                    return new PaymentNotFoundException(stripePaymentId);
                });

        payment.setStatus(PaymentStatus.FAILED);
        paymentRepository.save(payment);
        log.info("Payment ID: {} status set to FAILED", payment.getId());

        reservationService.cancelReservationInternal(payment.getReservationId());
        log.info("Reservation ID: {} automatically canceled due to payment failure", payment.getReservationId());
    }

    @Override
    public Payment getPaymentByReservationId(UUID reservationId) {
        log.debug("Fetching payment details for reservation ID: {}", reservationId);
        return paymentRepository.findByReservationId(reservationId)
                .orElseThrow(() -> {
                    log.warn("No payment found for reservation ID: {}", reservationId);
                    return new PaymentNotFoundException(reservationId.toString());
                });
    }

    @Override
    public Page<Payment> getAllPaymentsFiltered(PaymentStatus status, LocalDateTime startDate, LocalDateTime endDate, String userEmail, Pageable pageable) {
        return paymentRepository.findAllFiltered(status, startDate, endDate, userEmail, pageable);
    }

    private String extractReceiptUrlFromPaymentIntent(String paymentIntentId) {
        if (paymentIntentId == null || paymentIntentId.isBlank()) {
            return null;
        }

        try {
            PaymentIntentRetrieveParams params = PaymentIntentRetrieveParams.builder()
                    .addExpand("latest_charge")
                    .build();

            PaymentIntent paymentIntent = PaymentIntent.retrieve(paymentIntentId, params, null);
            if (paymentIntent != null && paymentIntent.getLatestChargeObject() != null) {
                return paymentIntent.getLatestChargeObject().getReceiptUrl();
            }
        } catch (StripeException e) {
            log.error("Failed to fetch PaymentIntent details from Stripe for receipt URL. PaymentIntent ID: {}. Error: {}", paymentIntentId, e.getMessage(), e);
        }

        return null;
    }

    private void sendConfirmationEmail(User user, Payment payment, String receiptUrl, UUID reservationId) {
        String formattedAmount = payment.getAmount().amount() + " " + payment.getAmount().currency();
        log.info("Sending payment confirmation email to: {} for reservation ID: {}", user.getEmail(), reservationId);
        paymentEmailPort.sendPaymentConfirmationEmail(user.getEmail(), formattedAmount, receiptUrl);
    }
}