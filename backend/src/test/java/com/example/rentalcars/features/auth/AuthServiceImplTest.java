package com.example.rentalcars.features.auth;

import com.example.rentalcars.core.exception.BusinessException;
import com.example.rentalcars.features.auth.domain.exception.EmailAlreadyExistsException;
import com.example.rentalcars.features.auth.domain.exception.InvalidCredentialsException;
import com.example.rentalcars.features.auth.domain.model.AuthenticationToken;
import com.example.rentalcars.features.auth.domain.model.RefreshToken;
import com.example.rentalcars.features.auth.domain.port.outbound.AuthEmailPort;
import com.example.rentalcars.features.auth.domain.port.outbound.IdentityPort;
import com.example.rentalcars.features.auth.infrastructure.adapter.inbound.rest.dto.AuthResponse;
import com.example.rentalcars.features.auth.infrastructure.adapter.inbound.rest.dto.LoginRequest;
import com.example.rentalcars.features.auth.infrastructure.adapter.inbound.rest.dto.RegisterRequest;
import com.example.rentalcars.features.auth.infrastructure.adapter.inbound.rest.mapper.UserRestMapper;
import com.example.rentalcars.features.auth.service.AuthServiceImpl;
import com.example.rentalcars.features.auth.service.RefreshTokenService;
import com.example.rentalcars.features.user.domain.exception.UserNotFoundException;
import com.example.rentalcars.features.user.domain.model.User;
import com.example.rentalcars.features.user.domain.port.inbound.UserService;
import com.example.rentalcars.features.user.infrastructure.adapter.inbound.rest.dto.UserResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceImplTest {

    @Mock
    private IdentityPort identityPort;

    @Mock
    private UserService userService;

    @Mock
    private UserRestMapper userRestMapper;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AuthEmailPort authEmailPort;

    @Mock
    private RefreshTokenService refreshTokenService;

    @InjectMocks
    private AuthServiceImpl authService;

    // LOGIN TESTS
    @Test
    void login_shouldReturnAuthResponseOnValidCredentials() {
        LoginRequest request = new LoginRequest();
        request.setEmail("user@example.com");
        request.setPassword("password123");

        User user = User.builder().id(UUID.randomUUID()).email(request.getEmail()).build();
        AuthenticationToken tokens = AuthenticationToken.builder().accessToken("access").refreshToken("refresh").build();
        UserResponse userResponse = new UserResponse();

        doNothing().when(identityPort).authenticate(request.getEmail(), request.getPassword());
        when(userService.getInternalUserByEmail(request.getEmail())).thenReturn(user);
        when(identityPort.generateTokens(user)).thenReturn(tokens);
        when(userRestMapper.toResponse(user)).thenReturn(userResponse);

        AuthResponse response = authService.login(request);

        assertNotNull(response);
        assertEquals("access", response.getAccessToken());
        assertEquals("refresh", response.getRefreshToken());
        assertEquals(userResponse, response.getUser());
    }

    @Test
    void login_shouldThrowInvalidCredentialsExceptionWhenAuthenticationFails() {
        LoginRequest request = new LoginRequest();
        request.setEmail("user@example.com");
        request.setPassword("wrong");

        doThrow(new RuntimeException("Bad credentials"))
                .when(identityPort).authenticate(request.getEmail(), request.getPassword());

        assertThrows(InvalidCredentialsException.class, () -> authService.login(request));
        verify(userService, never()).getInternalUserByEmail(any());
    }

    // REGISTER TESTS
    @Test
    void register_shouldCreateUserAndSendWelcomeEmail() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("new@example.com");
        request.setPassword("pass123");
        request.setFirstName("John");
        request.setLastName("Doe");

        User user = User.builder().id(UUID.randomUUID()).email(request.getEmail()).firstName("John").build();
        AuthenticationToken tokens = AuthenticationToken.builder().accessToken("access").refreshToken("refresh").build();

        when(userService.existsByEmail(request.getEmail())).thenReturn(false);
        when(userService.register(any())).thenReturn(user);
        when(identityPort.generateTokens(user)).thenReturn(tokens);
        when(userRestMapper.toResponse(user)).thenReturn(new UserResponse());

        AuthResponse response = authService.register(request);

        assertNotNull(response);
        verify(authEmailPort).sendWelcomeEmail(user.getEmail(), user.getFirstName());
    }

    @Test
    void register_shouldThrowEmailAlreadyExistsException() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("existing@example.com");

        when(userService.existsByEmail(request.getEmail())).thenReturn(true);

        assertThrows(EmailAlreadyExistsException.class, () -> authService.register(request));
        verify(userService, never()).register(any());
    }

    @Test
    void register_shouldNotFailIfEmailSendingFails() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("new@example.com");
        request.setPassword("pass123");

        User user = User.builder().id(UUID.randomUUID()).email(request.getEmail()).build();
        AuthenticationToken tokens = AuthenticationToken.builder().accessToken("access").refreshToken("refresh").build();

        when(userService.existsByEmail(request.getEmail())).thenReturn(false);
        when(userService.register(any())).thenReturn(user);
        when(identityPort.generateTokens(user)).thenReturn(tokens);
        when(userRestMapper.toResponse(user)).thenReturn(new UserResponse());

        doThrow(new RuntimeException("Email service down"))
                .when(authEmailPort).sendWelcomeEmail(any(), any());

        AuthResponse response = authService.register(request);

        assertNotNull(response);
        assertEquals("access", response.getAccessToken());
    }

    // REFRESH TOKEN TESTS
    @Test
    void refreshToken_shouldReturnNewTokensWhenValid() {
        String tokenStr = "valid-refresh-token";
        User user = User.builder().id(UUID.randomUUID()).email("user@example.com").build();
        RefreshToken refreshTokenEntity = RefreshToken.builder()
                .token(tokenStr)
                .user(user)
                .expiryDate(Instant.now().plusSeconds(3600))
                .build();

        AuthenticationToken newTokens = AuthenticationToken.builder().accessToken("new-access").refreshToken("new-refresh").build();

        when(refreshTokenService.findByToken(tokenStr)).thenReturn(Optional.of(refreshTokenEntity));
        when(identityPort.generateTokens(user)).thenReturn(newTokens);
        when(userRestMapper.toResponse(user)).thenReturn(new UserResponse());

        AuthResponse response = authService.refreshToken(tokenStr);

        assertNotNull(response);
        assertEquals("new-access", response.getAccessToken());
        assertEquals("new-refresh", response.getRefreshToken());
    }

    @Test
    void refreshToken_shouldThrowBusinessExceptionWhenTokenNotFound() {
        String tokenStr = "invalid-token";
        when(refreshTokenService.findByToken(tokenStr)).thenReturn(Optional.empty());

        BusinessException exception = assertThrows(BusinessException.class, () -> authService.refreshToken(tokenStr));
        assertEquals("INVALID_REFRESH_TOKEN", exception.getErrorCode());
    }

    @Test
    void refreshToken_shouldThrowBusinessExceptionWhenTokenExpired() {
        String tokenStr = "expired-token";
        RefreshToken refreshTokenEntity = RefreshToken.builder()
                .token(tokenStr)
                .expiryDate(Instant.now().minusSeconds(3600)) // Expired 1 hour ago
                .build();

        when(refreshTokenService.findByToken(tokenStr)).thenReturn(Optional.of(refreshTokenEntity));

        BusinessException exception = assertThrows(BusinessException.class, () -> authService.refreshToken(tokenStr));
        assertEquals("REFRESH_TOKEN_EXPIRED", exception.getErrorCode());
    }

    // REFRESH BY USER ID (ADMIN)
    @Test
    void refreshTokenByUserId_shouldGenerateTokensForUser() {
        UUID userId = UUID.randomUUID();
        User user = User.builder().id(userId).build();
        AuthenticationToken tokens = AuthenticationToken.builder().accessToken("access").refreshToken("refresh").build();

        when(userService.getUserById(userId)).thenReturn(user);
        when(identityPort.generateTokens(user)).thenReturn(tokens);
        when(userRestMapper.toResponse(user)).thenReturn(new UserResponse());

        AuthResponse response = authService.refreshTokenByUserId(userId);

        assertNotNull(response);
        assertEquals("access", response.getAccessToken());
    }

    // FORGOT / RESET PASSWORD TESTS
    @Test
    void forgotPassword_shouldGenerateTokenAndSendEmailWhenUserExists() {
        String email = "john@example.com";
        User user = User.builder().email(email).build();

        when(userService.getInternalUserByEmail(email)).thenReturn(user);

        authService.forgotPassword(email);

        assertNotNull(user.getResetToken());
        assertNotNull(user.getResetTokenExpiry());
        verify(userService).save(user);
        verify(authEmailPort).sendPasswordResetEmail(eq(email), anyString());
    }

    @Test
    void forgotPassword_shouldLogWarningAndNotFailWhenUserNotFound() {
        String email = "notfound@example.com";
        when(userService.getInternalUserByEmail(email)).thenThrow(new UserNotFoundException("User not found"));

        assertDoesNotThrow(() -> authService.forgotPassword(email));
        verify(userService, never()).save(any());
        verify(authEmailPort, never()).sendPasswordResetEmail(any(), any());
    }

    @Test
    void resetPassword_shouldUpdateUserPasswordOnValidToken() {
        String token = "valid-reset-token";
        String newPassword = "newPassword123";

        User user = User.builder()
                .resetToken(token)
                .resetTokenExpiry(LocalDateTime.now().plusMinutes(30))
                .build();

        when(userService.findByResetToken(token)).thenReturn(Optional.of(user));
        when(passwordEncoder.encode(newPassword)).thenReturn("encodedPassword");

        authService.resetPassword(token, newPassword);

        assertEquals("encodedPassword", user.getPasswordHash());
        assertNull(user.getResetToken());
        assertNull(user.getResetTokenExpiry());
        verify(userService).save(user);
    }

    @Test
    void resetPassword_shouldThrowExceptionWhenTokenExpired() {
        String token = "expired-reset-token";

        User user = User.builder()
                .resetToken(token)
                .resetTokenExpiry(LocalDateTime.now().minusMinutes(10)) // Expired
                .build();

        when(userService.findByResetToken(token)).thenReturn(Optional.of(user));

        BusinessException exception = assertThrows(BusinessException.class, () -> authService.resetPassword(token, "newPass"));
        assertEquals("TOKEN_EXPIRED", exception.getErrorCode());
        verify(userService, never()).save(any());
    }
}