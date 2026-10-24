package com.example.rentalcars.features.payment.infrastructure.adapter.outbound.email;

import com.example.rentalcars.features.payment.domain.port.outbound.PaymentEmailPort;
import com.example.rentalcars.shared.email.MailjetEmailSender;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class PaymentEmailAdapter implements PaymentEmailPort {

    private final MailjetEmailSender mailjetEmailSender;

    @Override
    @Async
    public void sendPaymentConfirmationEmail(String toEmail, String amount, String receiptUrl) {
        log.info("Preparing payment confirmation email for recipient: {} (Amount: {})", toEmail, amount);

        String receiptButtonHtml = (receiptUrl != null && !receiptUrl.isBlank()) ? """
            <div style="text-align: center; margin: 30px 0;">
                <a href="%s" style="background-color: #ff4d00; color: white; padding: 12px 25px; text-decoration: none; font-weight: bold; border-radius: 3px; display: inline-block;">View Official Stripe Receipt</a>
            </div>
            """.formatted(receiptUrl) : "";

        String htmlContent = """
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
                <h2 style="color: #ff4d00; text-align: center;">RentalCars</h2>
                <h3 style="color: #333; text-align: center;">Payment Successful!</h3>
                <p>Hello,</p>
                <p>Thank you for your payment. Your reservation has been successfully confirmed!</p>
                <p><strong>Total Amount Paid:</strong> %s</p>
                %s
                <hr style="border: none; border-top: 1px solid #eee; margin-top: 30px;">
                <p style="color: #999; font-size: 12px; text-align: center;">Thank you for choosing RentalCars!</p>
            </div>
            """.formatted(amount, receiptButtonHtml);

        mailjetEmailSender.sendEmail(toEmail, "Payment Confirmation - RentalCars", htmlContent);
    }

    @Override
    @Async
    public void sendRefundConfirmationEmail(String email, String amount, String reservationId) {
        log.info("Preparing refund confirmation email for recipient: {} (Amount: {})", email, amount);

        String displayReservationId = (reservationId != null && reservationId.length() >= 8)
                ? reservationId.substring(0, 8)
                : (reservationId != null ? reservationId : "N/A");

        String htmlContent = """
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
                <h2 style="color: #ff4d00; text-align: center;">RentalCars</h2>
                <h3 style="color: #333; text-align: center;">Refund Processed</h3>
                <p>Hello,</p>
                <p>Your refund of <strong>%s</strong> for reservation <strong>#%s</strong> has been successfully processed and sent back to your original payment method.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin-top: 30px;">
                <p style="color: #999; font-size: 12px; text-align: center;">Thank you for using RentalCars!</p>
            </div>
            """.formatted(amount, displayReservationId);

        mailjetEmailSender.sendEmail(email, "Refund Confirmation - RentalCars", htmlContent);
    }
}