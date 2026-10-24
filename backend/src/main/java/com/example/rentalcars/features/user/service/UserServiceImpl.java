package com.example.rentalcars.features.user.service;

import com.example.rentalcars.core.exception.BusinessException;
import com.example.rentalcars.features.reservation.domain.port.inbound.ReservationService;
import com.example.rentalcars.features.user.domain.enums.Role;
import com.example.rentalcars.features.user.domain.exception.UserNotFoundException;
import com.example.rentalcars.features.user.domain.model.CustomerProfile;
import com.example.rentalcars.features.user.domain.model.User;
import com.example.rentalcars.features.user.domain.port.inbound.UserService;
import com.example.rentalcars.features.user.domain.port.outbound.UserRepository;
import com.example.rentalcars.features.user.infrastructure.adapter.inbound.rest.dto.UpdateUserRequest;
import com.example.rentalcars.features.user.infrastructure.adapter.inbound.rest.dto.UserRequest;
import jakarta.transaction.Transactional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ReservationService reservationService;

    private static final String DELETED_USER_FIRST_NAME = "Deleted";
    private static final String DELETED_USER_LAST_NAME = "User";
    private static final String DELETED_USER_EMAIL_SUFFIX = "@system.local";
    private static final String DELETED_USER_EMAIL_PREFIX = "deleted_";
    private static final String DELETED_USER_PASSWORD_PREFIX = "DELETED_";

    public UserServiceImpl(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Lazy ReservationService reservationService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.reservationService = reservationService;
    }

    @Override
    @Cacheable(value = "user_profile", key = "#id")
    public User getUserById(UUID id) {
        User user = userRepository.findById(id).orElseThrow(() -> new UserNotFoundException(id));
        validateOwnership(user);
        return user;
    }

    @Override
    public User getUserByEmail(String email) {
        User user = userRepository.findByEmail(email).orElseThrow(() -> new UserNotFoundException(email));
        validateOwnership(user);
        return user;
    }

    @Override
    public User getInternalUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException(email));
    }

    @Override
    @Cacheable(value = "user_profile", key = "#id")
    public User getInternalUserById(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new UserNotFoundException(id));
    }

    @Override
    @Transactional
    public User register(UserRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            log.warn("Registration failed: Email {} is already registered", request.getEmail());
            throw new BusinessException("Email already exists", "EMAIL_TAKEN");
        }

        var profile = CustomerProfile.builder()
                .id(UUID.randomUUID())
                .phoneNumber(null)
                .address(null)
                .driverLicenseNumber(null)
                .build();

        var user = User.builder()
                .id(UUID.randomUUID())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .role(Role.CUSTOMER)
                .profile(profile)
                .build();

        User savedUser = userRepository.save(user);
        log.info("New user registered successfully with email: {} and ID: {}", savedUser.getEmail(), savedUser.getId());
        return savedUser;
    }

    @Override
    public boolean existsByEmail(String email) {
        return userRepository.findByEmail(email).isPresent();
    }

    @Override
    public Optional<User> findByResetToken(String token) {
        return userRepository.findByResetToken(token);
    }

    @Override
    @CacheEvict(value = "user_profile", key = "#user.id")
    public void save(User user) {
        userRepository.save(user);
    }

    @Override
    @Transactional
    @CacheEvict(value = "user_profile", key = "#id")
    public User update(UUID id, UpdateUserRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new UserNotFoundException(id));

        validateOwnership(user);

        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());

        CustomerProfile profile = user.getProfile();

        if (profile == null) {
            profile = CustomerProfile.builder()
                    .id(UUID.randomUUID())
                    .phoneNumber(request.getPhoneNumber())
                    .address(request.getAddress())
                    .driverLicenseNumber(request.getDriverLicenseNumber())
                    .build();
            user.setProfile(profile);
        } else {
            CustomerProfile existingProfile = user.getProfile();
            existingProfile.setAddress(request.getAddress());
            existingProfile.setPhoneNumber(request.getPhoneNumber());
            existingProfile.setDriverLicenseNumber(request.getDriverLicenseNumber());
        }

        User updated = userRepository.save(user);
        log.info("User profile updated for user ID: {}", id);
        return updated;
    }

    @Override
    public Page<User> getAllUsers(Pageable pageable) {
        return userRepository.findAll(pageable);
    }

    @Override
    @Transactional
    @CacheEvict(value = "user_profile", key = "#id")
    public void delete(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new UserNotFoundException(id));

        validateOwnership(user);

        if (DELETED_USER_FIRST_NAME.equalsIgnoreCase(user.getFirstName())) {
            log.warn("Soft-delete failed: Account {} is already deleted", id);
            throw new BusinessException("Account is already deleted.", "USER_ALREADY_DELETED");
        }

        reservationService.cancelAllActiveReservationsByUserId(id);

        user.setFirstName(DELETED_USER_FIRST_NAME);
        user.setLastName(DELETED_USER_LAST_NAME);
        user.setEmail(DELETED_USER_EMAIL_PREFIX + id + DELETED_USER_EMAIL_SUFFIX);
        user.setPasswordHash(DELETED_USER_PASSWORD_PREFIX + UUID.randomUUID());

        if (user.getProfile() != null) {
            CustomerProfile profile = user.getProfile();
            profile.setPhoneNumber(null);
            profile.setAddress(null);
            profile.setDriverLicenseNumber(null);
        }

        userRepository.save(user);
        log.info("User account soft-deleted for user ID: {}", id);
    }

    // Helper method for security
    private void validateOwnership(User user) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) {
            throw new AccessDeniedException("You don't have permission to perform this action.");
        }

        if (isAdmin(auth)) {
            return;
        }

        if (!user.getEmail().equalsIgnoreCase(auth.getName())) {
            log.warn("Access denied for authentication: {} trying to access user ID: {}", auth.getName(), user.getId());
            throw new AccessDeniedException("You do not have permission to access this user's data");
        }
    }

    // Helper method for admin check
    private boolean isAdmin(Authentication auth) {
        return auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }
}