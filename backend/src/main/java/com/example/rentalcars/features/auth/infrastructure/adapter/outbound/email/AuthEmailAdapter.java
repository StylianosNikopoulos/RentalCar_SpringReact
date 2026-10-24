package com.example.rentalcars.features.auth.infrastructure.adapter.outbound.email;

import com.example.rentalcars.features.auth.domain.port.outbound.AuthEmailPort;
import com.example.rentalcars.shared.email.MailjetEmailSender;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class AuthEmailAdapter implements AuthEmailPort {

    private final MailjetEmailSender mailjetEmailSender;

    @Value("${APP_FRONTEND_URL}")
    private String frontendUrl;

    @Override
    @Async
    public void sendPasswordResetEmail(String toEmail, String token) {
        log.info("Preparing password reset email for recipient: {}", toEmail);
        String resetLink = frontendUrl + "/reset-password?token=" + token;

        String htmlContent = """
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
                <h2 style="color: #ff4d00; text-align: center;">RentalCars</h2>
                <p>Hello,</p>
                <p>You requested to reset your password. Please click the button below to set a new password. This link will expire in 1 hour.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="%s" style="background-color: #ff4d00; color: white; padding: 12px 25px; text-decoration: none; font-weight: bold; border-radius: 3px; display: inline-block;">Reset Password</a>
                </div>
                <p>If the button doesn't work, copy and paste this URL into your browser:</p>
                <p style="color: #666; font-size: 12px; word-break: break-all;">%s</p>
                <hr style="border: none; border-top: 1px solid #eee; margin-top: 30px;">
                <p style="color: #999; font-size: 12px; text-align: center;">If you did not request this, you can safely ignore this email.</p>
            </div>
            """.formatted(resetLink, resetLink);

        mailjetEmailSender.sendEmail(toEmail, "Reset Your Password - RentalCars", htmlContent);
    }

    @Override
    @Async
    public void sendWelcomeEmail(String email, String firstName) {
        log.info("Preparing welcome email for new user: {}", email);

        String name = (firstName != null && !firstName.isBlank()) ? firstName : "there";

        String htmlContent = """
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
                <h2 style="color: #ff4d00; text-align: center;">RentalCars</h2>
                <h3 style="color: #333; text-align: center;">Welcome to RentalCars, %s!</h3>
                <p>Hello %s,</p>
                <p>Your account has been successfully created. We're excited to have you on board!</p>
                <p>You can now browse our fleet and make vehicle reservations anytime.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin-top: 30px;">
                <p style="color: #999; font-size: 12px; text-align: center;">Thank you for choosing RentalCars!</p>
            </div>
            """.formatted(name, name);

        mailjetEmailSender.sendEmail(email, "Welcome to RentalCars!", htmlContent);
    }
}