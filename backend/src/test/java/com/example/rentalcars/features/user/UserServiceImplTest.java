package com.example.rentalcars.features.user;

import com.example.rentalcars.core.exception.BusinessException;
import com.example.rentalcars.features.reservation.domain.port.inbound.ReservationService;
import com.example.rentalcars.features.user.domain.enums.Role;
import com.example.rentalcars.features.user.domain.exception.UserNotFoundException;
import com.example.rentalcars.features.user.domain.model.CustomerProfile;
import com.example.rentalcars.features.user.domain.model.User;
import com.example.rentalcars.features.user.domain.port.outbound.UserRepository;
import com.example.rentalcars.features.user.infrastructure.adapter.inbound.rest.dto.UpdateUserRequest;
import com.example.rentalcars.features.user.infrastructure.adapter.inbound.rest.dto.UserRequest;
import com.example.rentalcars.features.user.service.UserServiceImpl;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceImplTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private ReservationService reservationService;

    private UserServiceImpl userService;

    @BeforeEach
    void setUp() {
        userService = new UserServiceImpl(userRepository, passwordEncoder, reservationService);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    // GET USER BY ID / EMAIL (WITH OWNERSHIP)
    @Test
    void getUserById_shouldReturnUserWhenOwnerAuthenticated() {
        UUID id = UUID.randomUUID();
        User user = createSampleUser(id, "user@example.com", "ROLE_CUSTOMER");
        setupSecurityContext("user@example.com", "ROLE_CUSTOMER");

        when(userRepository.findById(id)).thenReturn(Optional.of(user));

        User result = userService.getUserById(id);

        assertSame(user, result);
        verify(userRepository).findById(id);
    }

    @Test
    void getUserById_shouldReturnUserWhenAdminAuthenticated() {
        UUID id = UUID.randomUUID();
        User user = createSampleUser(id, "user@example.com", "ROLE_CUSTOMER");
        setupSecurityContext("admin@example.com", "ROLE_ADMIN");

        when(userRepository.findById(id)).thenReturn(Optional.of(user));

        User result = userService.getUserById(id);

        assertSame(user, result);
    }

    @Test
    void getUserById_shouldThrowAccessDeniedWhenNotOwnerOrAdmin() {
        UUID id = UUID.randomUUID();
        User user = createSampleUser(id, "user@example.com", "ROLE_CUSTOMER");
        setupSecurityContext("other@example.com", "ROLE_CUSTOMER");

        when(userRepository.findById(id)).thenReturn(Optional.of(user));

        assertThrows(AccessDeniedException.class, () -> userService.getUserById(id));
    }

    @Test
    void getUserById_shouldThrowNotFoundWhenUserDoesNotExist() {
        UUID id = UUID.randomUUID();
        when(userRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(UserNotFoundException.class, () -> userService.getUserById(id));
    }

    @Test
    void getUserByEmail_shouldReturnUserWhenOwner() {
        User user = createSampleUser(UUID.randomUUID(), "john@example.com", "ROLE_CUSTOMER");
        setupSecurityContext("john@example.com", "ROLE_CUSTOMER");

        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.of(user));

        User result = userService.getUserByEmail("john@example.com");

        assertSame(user, result);
    }

    @Test
    void getUserByEmail_shouldThrowNotFoundWhenEmailDoesNotExist() {
        when(userRepository.findByEmail("notfound@example.com")).thenReturn(Optional.empty());

        assertThrows(UserNotFoundException.class, () -> userService.getUserByEmail("notfound@example.com"));
    }

    // INTERNAL GETTERS (NO OWNERSHIP CHECK)
    @Test
    void getInternalUserByEmail_shouldReturnUserWithoutSecurityCheck() {
        User user = createSampleUser(UUID.randomUUID(), "internal@example.com", "ROLE_CUSTOMER");
        when(userRepository.findByEmail("internal@example.com")).thenReturn(Optional.of(user));

        User result = userService.getInternalUserByEmail("internal@example.com");

        assertSame(user, result);
    }

    @Test
    void getInternalUserById_shouldReturnUserWithoutSecurityCheck() {
        UUID id = UUID.randomUUID();
        User user = createSampleUser(id, "internal@example.com", "ROLE_CUSTOMER");
        when(userRepository.findById(id)).thenReturn(Optional.of(user));

        User result = userService.getInternalUserById(id);

        assertSame(user, result);
    }

    // REGISTER USER
    @Test
    void register_shouldCreateNewCustomerUserWithProfile() {
        UserRequest request = new UserRequest();
        request.setEmail("newuser@example.com");
        request.setPassword("Secret123!");
        request.setFirstName("John");
        request.setLastName("Doe");

        when(userRepository.findByEmail("newuser@example.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("Secret123!")).thenReturn("encodedPassword");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        User result = userService.register(request);

        assertNotNull(result);
        assertEquals("newuser@example.com", result.getEmail());
        assertEquals("encodedPassword", result.getPasswordHash());
        assertEquals("John", result.getFirstName());
        assertEquals("Doe", result.getLastName());
        assertEquals(Role.CUSTOMER, result.getRole());
        assertNotNull(result.getProfile());
        verify(userRepository).save(any(User.class));
    }

    @Test
    void register_shouldThrowExceptionWhenEmailAlreadyExists() {
        UserRequest request = new UserRequest();
        request.setEmail("existing@example.com");

        when(userRepository.findByEmail("existing@example.com")).thenReturn(Optional.of(new User()));

        BusinessException exception = assertThrows(BusinessException.class, () -> userService.register(request));

        assertEquals("EMAIL_TAKEN", exception.getErrorCode());
        verify(userRepository, never()).save(any());
    }

    // UPDATE PROFILE
    @Test
    void update_shouldUpdateExistingProfile() {
        UUID id = UUID.randomUUID();
        User user = createSampleUser(id, "john@example.com", "ROLE_CUSTOMER");
        setupSecurityContext("john@example.com", "ROLE_CUSTOMER");

        UpdateUserRequest request = new UpdateUserRequest();
        request.setFirstName("Johnny");
        request.setLastName("Updated");
        request.setPhoneNumber("+306999999999");
        request.setAddress("Athens 123");
        request.setDriverLicenseNumber("B");

        when(userRepository.findById(id)).thenReturn(Optional.of(user));
        when(userRepository.save(user)).thenReturn(user);

        User updated = userService.update(id, request);

        assertEquals("Johnny", updated.getFirstName());
        assertEquals("Updated", updated.getLastName());
        assertEquals("+306999999999", updated.getProfile().getPhoneNumber());
        assertEquals("Athens 123", updated.getProfile().getAddress());
        assertEquals("B", updated.getProfile().getDriverLicenseNumber());
        verify(userRepository).save(user);
    }

    @Test
    void update_shouldCreateProfileIfMissing() {
        UUID id = UUID.randomUUID();
        User user = createSampleUser(id, "john@example.com", "ROLE_CUSTOMER");
        user.setProfile(null);
        setupSecurityContext("john@example.com", "ROLE_CUSTOMER");

        UpdateUserRequest request = new UpdateUserRequest();
        request.setFirstName("Johnny");
        request.setLastName("Updated");

        when(userRepository.findById(id)).thenReturn(Optional.of(user));
        when(userRepository.save(user)).thenReturn(user);

        User updated = userService.update(id, request);

        assertNotNull(updated.getProfile());
        verify(userRepository).save(user);
    }

    // SOFT DELETE USER
    @Test
    void delete_shouldSoftDeleteUserAndCancelActiveReservations() {
        UUID id = UUID.randomUUID();
        User user = createSampleUser(id, "john@example.com", "ROLE_CUSTOMER");
        setupSecurityContext("john@example.com", "ROLE_CUSTOMER");

        when(userRepository.findById(id)).thenReturn(Optional.of(user));

        userService.delete(id);

        verify(reservationService).cancelAllActiveReservationsByUserId(id);
        verify(userRepository).save(argThat(savedUser ->
                savedUser.getFirstName().equals("Deleted")
                        && savedUser.getLastName().equals("User")
                        && savedUser.getEmail().equals("deleted_" + id + "@system.local")
                        && savedUser.getPasswordHash().startsWith("DELETED_")
                        && savedUser.getProfile().getPhoneNumber() == null
                        && savedUser.getProfile().getAddress() == null
                        && savedUser.getProfile().getDriverLicenseNumber() == null
        ));
    }

    @Test
    void delete_shouldRejectIfAlreadyDeleted() {
        UUID id = UUID.randomUUID();
        User user = createSampleUser(id, "deleted_" + id + "@system.local", "ROLE_CUSTOMER");
        user.setFirstName("Deleted");
        setupSecurityContext("deleted_" + id + "@system.local", "ROLE_CUSTOMER");

        when(userRepository.findById(id)).thenReturn(Optional.of(user));

        BusinessException exception = assertThrows(BusinessException.class, () -> userService.delete(id));

        assertEquals("USER_ALREADY_DELETED", exception.getErrorCode());
        verify(reservationService, never()).cancelAllActiveReservationsByUserId(any());
        verify(userRepository, never()).save(any());
    }

    // HELPER & UTILITY METHODS
    @Test
    void existsByEmail_shouldReturnTrueWhenEmailPresent() {
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(new User()));
        assertTrue(userService.existsByEmail("test@example.com"));
    }

    @Test
    void findByResetToken_shouldReturnUserWhenTokenMatches() {
        User user = new User();
        when(userRepository.findByResetToken("valid-token")).thenReturn(Optional.of(user));

        Optional<User> result = userService.findByResetToken("valid-token");
        assertTrue(result.isPresent());
        assertSame(user, result.get());
    }

    @Test
    void getAllUsers_shouldReturnPagedUsers() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<User> page = new PageImpl<>(List.of(new User()));
        when(userRepository.findAll(pageable)).thenReturn(page);

        Page<User> result = userService.getAllUsers(pageable);
        assertEquals(1, result.getTotalElements());
    }

    // Helper methods for security setup & fixture creation
    private void setupSecurityContext(String email, String role) {
        var authority = new SimpleGrantedAuthority(role);
        var auth = new UsernamePasswordAuthenticationToken(email, null, List.of(authority));
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    private User createSampleUser(UUID id, String email, String role) {
        CustomerProfile profile = CustomerProfile.builder()
                .id(UUID.randomUUID())
                .phoneNumber("+306912345678")
                .address("Test Street 1")
                .driverLicenseNumber("B")
                .build();

        return User.builder()
                .id(id)
                .email(email)
                .firstName("John")
                .lastName("Doe")
                .passwordHash("hashedPass")
                .role(Role.valueOf(role.replace("ROLE_", "")))
                .profile(profile)
                .build();
    }
}