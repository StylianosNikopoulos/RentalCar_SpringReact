package com.example.rentalcars.features.auth;

import com.example.rentalcars.features.auth.domain.model.RefreshToken;
import com.example.rentalcars.features.auth.domain.port.outbound.RefreshTokenRepository;
import com.example.rentalcars.features.auth.service.RefreshTokenService;
import com.example.rentalcars.features.user.domain.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RefreshTokenServiceTest {

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @InjectMocks
    private RefreshTokenService refreshTokenService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(refreshTokenService, "refreshExpiration", 2592000000L); // 30 days
    }

    @Test
    void createRefreshToken_shouldDeleteOldTokensAndSaveNewOne() {
        UUID userId = UUID.randomUUID();
        User user = User.builder()
                .id(userId)
                .email("user@example.com")
                .build();

        when(refreshTokenRepository.save(any(RefreshToken.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        RefreshToken result = refreshTokenService.createRefreshToken(user);

        assertNotNull(result);
        assertEquals(user, result.getUser());
        assertNotNull(result.getToken());
        assertFalse(result.isRevoked());
        assertFalse(result.isExpired());

        verify(refreshTokenRepository).deleteByUserId(userId);
        verify(refreshTokenRepository).save(any(RefreshToken.class));
    }

    @Test
    void findByToken_shouldReturnTokenWhenExists() {
        String tokenStr = "valid-token-123";
        RefreshToken refreshToken = RefreshToken.builder()
                .token(tokenStr)
                .build();

        when(refreshTokenRepository.findByToken(tokenStr)).thenReturn(Optional.of(refreshToken));

        Optional<RefreshToken> result = refreshTokenService.findByToken(tokenStr);

        assertTrue(result.isPresent());
        assertEquals(tokenStr, result.get().getToken());
    }

    @Test
    void findByToken_shouldReturnEmptyWhenNotFound() {
        String tokenStr = "invalid-token";
        when(refreshTokenRepository.findByToken(tokenStr)).thenReturn(Optional.empty());

        Optional<RefreshToken> result = refreshTokenService.findByToken(tokenStr);

        assertTrue(result.isEmpty());
    }
}