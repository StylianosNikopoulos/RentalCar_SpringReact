package com.example.rentalcars.features.reservation;

import com.example.rentalcars.core.valueobject.DateRange;
import com.example.rentalcars.core.valueobject.Money;
import com.example.rentalcars.features.payment.domain.model.Payment;
import com.example.rentalcars.features.payment.domain.port.inbound.PaymentService;
import com.example.rentalcars.features.reservation.domain.enums.ReservationStatus;
import com.example.rentalcars.features.reservation.domain.exception.CarNotAvailableException;
import com.example.rentalcars.features.reservation.domain.exception.InvalidReservationDatesException;
import com.example.rentalcars.features.reservation.domain.exception.ReservationNotFoundException;
import com.example.rentalcars.features.reservation.domain.model.Reservation;
import com.example.rentalcars.features.reservation.domain.port.outbound.ReservationRepository;
import com.example.rentalcars.features.reservation.service.ReservationServiceImpl;
import com.example.rentalcars.features.user.domain.model.User;
import com.example.rentalcars.features.user.domain.port.inbound.UserService;
import com.example.rentalcars.features.vehicle.domain.enums.VehicleStatus;
import com.example.rentalcars.features.vehicle.domain.model.Vehicle;
import com.example.rentalcars.features.vehicle.domain.port.inbound.VehicleService;
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

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReservationServiceImplTest {

    @Mock
    private ReservationRepository reservationRepository;

    @Mock
    private PaymentService paymentService;

    @Mock
    private VehicleService vehicleService;

    @Mock
    private UserService userService;

    private ReservationServiceImpl reservationService;

    @BeforeEach
    void setUp() {
        reservationService = new ReservationServiceImpl(
                reservationRepository,
                paymentService,
                vehicleService,
                userService
        );
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    // CREATE RESERVATION
    @Test
    void createReservation_shouldCreatePendingReservationSuccessfully() {
        UUID userId = UUID.randomUUID();
        UUID vehicleId = UUID.randomUUID();
        String email = "john@example.com";

        setupSecurityContext(email, "ROLE_CUSTOMER");

        User user = User.builder().id(userId).email(email).build();
        Vehicle vehicle = Vehicle.builder()
                .id(vehicleId)
                .brand("Toyota")
                .model("Corolla")
                .dailyPrice(BigDecimal.valueOf(50))
                .build();

        LocalDateTime start = LocalDateTime.now().plusDays(1);
        LocalDateTime end = LocalDateTime.now().plusDays(3);
        DateRange period = new DateRange(start, end);

        Reservation inputReservation = Reservation.builder()
                .vehicleId(vehicleId)
                .period(period)
                .build();

        when(userService.getUserByEmail(email)).thenReturn(user);
        when(vehicleService.getVehicleByIdWithLock(vehicleId)).thenReturn(vehicle);
        when(reservationRepository.existsOverlap(vehicleId, period)).thenReturn(false);
        when(reservationRepository.save(any(Reservation.class))).thenAnswer(i -> i.getArgument(0));

        Reservation result = reservationService.createReservation(inputReservation);

        assertNotNull(result);
        assertEquals(userId, result.getUserId());
        assertEquals("Toyota", result.getVehicleBrand());
        assertEquals("Corolla", result.getVehicleName());
        assertEquals(ReservationStatus.PENDING, result.getStatus());
        assertEquals(email, result.getEmail());
        assertEquals(new Money(BigDecimal.valueOf(100), "EUR"), result.getTotalAmount()); // 2 days * 50

        verify(reservationRepository).save(any(Reservation.class));
    }

    @Test
    void createReservation_shouldThrowExceptionWhenPeriodMissing() {
        setupSecurityContext("john@example.com", "ROLE_CUSTOMER");
        when(userService.getUserByEmail("john@example.com")).thenReturn(User.builder().id(UUID.randomUUID()).build());

        Reservation reservation = Reservation.builder().vehicleId(UUID.randomUUID()).build();

        assertThrows(InvalidReservationDatesException.class, () -> reservationService.createReservation(reservation));
        verify(reservationRepository, never()).save(any());
    }

    @Test
    void createReservation_shouldThrowExceptionWhenDatesInPast() {
        setupSecurityContext("john@example.com", "ROLE_CUSTOMER");
        when(userService.getUserByEmail("john@example.com")).thenReturn(User.builder().id(UUID.randomUUID()).build());

        DateRange pastPeriod = new DateRange(LocalDateTime.now().minusDays(3), LocalDateTime.now().minusDays(1));
        Reservation reservation = Reservation.builder().vehicleId(UUID.randomUUID()).period(pastPeriod).build();

        assertThrows(InvalidReservationDatesException.class, () -> reservationService.createReservation(reservation));
    }

    @Test
    void createReservation_shouldThrowCarNotAvailableExceptionWhenOverlapExists() {
        UUID vehicleId = UUID.randomUUID();
        setupSecurityContext("john@example.com", "ROLE_CUSTOMER");
        when(userService.getUserByEmail("john@example.com")).thenReturn(User.builder().id(UUID.randomUUID()).build());

        DateRange period = new DateRange(LocalDateTime.now().plusDays(1), LocalDateTime.now().plusDays(3));
        Reservation reservation = Reservation.builder().vehicleId(vehicleId).period(period).build();

        Vehicle vehicle = Vehicle.builder().id(vehicleId).dailyPrice(BigDecimal.valueOf(50)).build();
        when(vehicleService.getVehicleByIdWithLock(vehicleId)).thenReturn(vehicle);
        when(reservationRepository.existsOverlap(vehicleId, period)).thenReturn(true);

        assertThrows(CarNotAvailableException.class, () -> reservationService.createReservation(reservation));
        verify(reservationRepository, never()).save(any());
    }

    // GET MY RESERVATIONS & ALL RESERVATIONS
    @Test
    void getMyReservations_shouldReturnUserReservations() {
        UUID userId = UUID.randomUUID();
        String email = "john@example.com";
        setupSecurityContext(email, "ROLE_CUSTOMER");

        when(userService.getUserByEmail(email)).thenReturn(User.builder().id(userId).email(email).build());
        Pageable pageable = PageRequest.of(0, 10);
        Page<Reservation> page = new PageImpl<>(List.of(new Reservation()));
        when(reservationRepository.findByUserId(userId, pageable)).thenReturn(page);

        Page<Reservation> result = reservationService.getMyReservations(pageable);

        assertEquals(1, result.getTotalElements());
        verify(reservationRepository).findByUserId(userId, pageable);
    }

    @Test
    void getAllReservations_shouldReturnAllReservations() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Reservation> page = new PageImpl<>(List.of(new Reservation()));
        when(reservationRepository.findAll(pageable)).thenReturn(page);

        Page<Reservation> result = reservationService.getAllReservations(pageable);

        assertEquals(1, result.getTotalElements());
        verify(reservationRepository).findAll(pageable);
    }

    // GET RESERVATION BY ID (WITH OWNERSHIP)
    @Test
    void getReservationById_shouldReturnReservationWhenOwnerAuthenticated() {
        UUID resId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        String email = "john@example.com";
        setupSecurityContext(email, "ROLE_CUSTOMER");

        Reservation reservation = Reservation.builder().id(resId).userId(userId).build();

        when(reservationRepository.findById(resId)).thenReturn(Optional.of(reservation));
        when(userService.getUserByEmail(email)).thenReturn(User.builder().id(userId).email(email).build());

        Reservation result = reservationService.getReservationById(resId);

        assertSame(reservation, result);
    }

    @Test
    void getReservationById_shouldReturnReservationWhenAdminAuthenticated() {
        UUID resId = UUID.randomUUID();
        setupSecurityContext("admin@example.com", "ROLE_ADMIN");

        Reservation reservation = Reservation.builder().id(resId).userId(UUID.randomUUID()).build();
        when(reservationRepository.findById(resId)).thenReturn(Optional.of(reservation));

        Reservation result = reservationService.getReservationById(resId);

        assertSame(reservation, result);
    }

    @Test
    void getReservationById_shouldThrowAccessDeniedWhenNotOwner() {
        UUID resId = UUID.randomUUID();
        setupSecurityContext("other@example.com", "ROLE_CUSTOMER");

        Reservation reservation = Reservation.builder().id(resId).userId(UUID.randomUUID()).build();
        when(reservationRepository.findById(resId)).thenReturn(Optional.of(reservation));
        when(userService.getUserByEmail("other@example.com")).thenReturn(User.builder().id(UUID.randomUUID()).build());

        assertThrows(AccessDeniedException.class, () -> reservationService.getReservationById(resId));
    }

    @Test
    void getReservationById_shouldThrowNotFoundWhenDoesNotExist() {
        UUID resId = UUID.randomUUID();
        when(reservationRepository.findById(resId)).thenReturn(Optional.empty());

        assertThrows(ReservationNotFoundException.class, () -> reservationService.getReservationById(resId));
    }

    // CANCEL & CONFIRM RESERVATION
    @Test
    void cancelReservation_shouldCancelPendingReservationWithoutRefund() {
        UUID resId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID vehicleId = UUID.randomUUID();
        String email = "john@example.com";

        setupSecurityContext(email, "ROLE_CUSTOMER");
        Reservation reservation = Reservation.builder()
                .id(resId)
                .userId(userId)
                .vehicleId(vehicleId)
                .status(ReservationStatus.PENDING)
                .build();

        when(reservationRepository.findById(resId)).thenReturn(Optional.of(reservation));
        when(userService.getUserByEmail(email)).thenReturn(User.builder().id(userId).email(email).build());

        reservationService.cancelReservation(resId, email);

        assertEquals(ReservationStatus.CANCELED, reservation.getStatus());
        verify(paymentService, never()).refundPayment(any());
        verify(vehicleService).updateVehicleStatus(vehicleId, VehicleStatus.ACTIVE);
        verify(reservationRepository).save(reservation);
    }

    @Test
    void cancelReservation_shouldRefundWhenReservationIsConfirmed() {
        UUID resId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID vehicleId = UUID.randomUUID();
        String email = "john@example.com";

        setupSecurityContext(email, "ROLE_CUSTOMER");
        Reservation reservation = Reservation.builder()
                .id(resId)
                .userId(userId)
                .vehicleId(vehicleId)
                .status(ReservationStatus.CONFIRMED)
                .build();

        Payment payment = Payment.builder().stripePaymentId("ch_stripe_123").build();

        when(reservationRepository.findById(resId)).thenReturn(Optional.of(reservation));
        when(userService.getUserByEmail(email)).thenReturn(User.builder().id(userId).email(email).build());
        when(paymentService.getPaymentByReservationId(resId)).thenReturn(payment);

        reservationService.cancelReservation(resId, email);

        verify(paymentService).refundPayment("ch_stripe_123");
        assertEquals(ReservationStatus.CANCELED, reservation.getStatus());
        verify(vehicleService).updateVehicleStatus(vehicleId, VehicleStatus.ACTIVE);
        verify(reservationRepository).save(reservation);
    }

    @Test
    void confirmReservation_shouldUpdateStatusToConfirmed() {
        UUID resId = UUID.randomUUID();
        Reservation reservation = Reservation.builder().id(resId).status(ReservationStatus.PENDING).build();

        when(reservationRepository.findById(resId)).thenReturn(Optional.of(reservation));
        when(reservationRepository.save(reservation)).thenReturn(reservation);

        Reservation result = reservationService.confirmReservation(resId);

        assertEquals(ReservationStatus.CONFIRMED, result.getStatus());
        verify(reservationRepository).save(reservation);
    }

    @Test
    void cancelAllActiveReservationsByUserId_shouldCancelActiveReservations() {
        UUID userId = UUID.randomUUID();
        Reservation res1 = Reservation.builder().id(UUID.randomUUID()).status(ReservationStatus.PENDING).build();
        Reservation res2 = Reservation.builder().id(UUID.randomUUID()).status(ReservationStatus.CONFIRMED).build();

        when(reservationRepository.findAllByUserIdAndStatusIn(eq(userId), anyList()))
                .thenReturn(List.of(res1, res2));

        reservationService.cancelAllActiveReservationsByUserId(userId);

        assertEquals(ReservationStatus.CANCELED, res1.getStatus());
        assertEquals(ReservationStatus.CANCELED, res2.getStatus());
        verify(reservationRepository, times(2)).save(any(Reservation.class));
    }

    // SCHEDULED TASKS & MAINTENANCE
    @Test
    void cancelExpiredPendingReservationsAndPayments_shouldInvokeRepositories() {
        when(reservationRepository.cancelExpiredPendingReservations(any(LocalDateTime.class))).thenReturn(3);
        when(paymentService.cancelExpiredPendingPayments(any(LocalDateTime.class))).thenReturn(3);

        reservationService.cancelExpiredPendingReservationsAndPayments();

        verify(reservationRepository).cancelExpiredPendingReservations(any(LocalDateTime.class));
        verify(paymentService).cancelExpiredPendingPayments(any(LocalDateTime.class));
    }

    @Test
    void startScheduledReservations_shouldUpdateVehicleAndReservationStatuses() {
        List<UUID> vehicleIds = List.of(UUID.randomUUID(), UUID.randomUUID());
        when(reservationRepository.findVehicleIdsToStart(any(LocalDateTime.class))).thenReturn(vehicleIds);
        when(vehicleService.updateVehiclesStatusBulk(vehicleIds, VehicleStatus.RENTED)).thenReturn(2);
        when(reservationRepository.bulkStartReservations(any(LocalDateTime.class))).thenReturn(2);

        reservationService.startScheduledReservations();

        verify(vehicleService).updateVehiclesStatusBulk(vehicleIds, VehicleStatus.RENTED);
        verify(reservationRepository).bulkStartReservations(any(LocalDateTime.class));
    }

    @Test
    void completeFinishedReservations_shouldUpdateVehicleAndReservationStatuses() {
        List<UUID> vehicleIds = List.of(UUID.randomUUID());
        when(reservationRepository.findVehicleIdsToComplete(any(LocalDateTime.class))).thenReturn(vehicleIds);
        when(vehicleService.updateVehiclesStatusBulk(vehicleIds, VehicleStatus.ACTIVE)).thenReturn(1);
        when(reservationRepository.bulkCompleteReservations(any(LocalDateTime.class))).thenReturn(1);

        reservationService.completeFinishedReservations();

        verify(vehicleService).updateVehiclesStatusBulk(vehicleIds, VehicleStatus.ACTIVE);
        verify(reservationRepository).bulkCompleteReservations(any(LocalDateTime.class));
    }

    // SYSTEM INTERNAL METHODS
    @Test
    void cancelReservationInternal_shouldCancelAndRestoreVehicle() {
        UUID resId = UUID.randomUUID();
        UUID vehicleId = UUID.randomUUID();
        Reservation reservation = Reservation.builder().id(resId).vehicleId(vehicleId).status(ReservationStatus.PENDING).build();

        when(reservationRepository.findById(resId)).thenReturn(Optional.of(reservation));
        when(reservationRepository.save(reservation)).thenReturn(reservation);

        Reservation result = reservationService.cancelReservationInternal(resId);

        assertEquals(ReservationStatus.CANCELED, result.getStatus());
        verify(vehicleService).restoreVehicle(vehicleId);
        verify(reservationRepository).save(reservation);
    }

    @Test
    void markAsCompleted_shouldSetCompletedAndActivateVehicle() {
        UUID resId = UUID.randomUUID();
        UUID vehicleId = UUID.randomUUID();

        Reservation reservation = Reservation.builder()
                .id(resId)
                .vehicleId(vehicleId)
                .status(ReservationStatus.ACTIVE)
                .build();

        when(reservationRepository.findById(resId)).thenReturn(Optional.of(reservation));
        when(reservationRepository.save(reservation)).thenReturn(reservation);

        Reservation result = reservationService.markAsCompleted(resId);

        assertEquals(ReservationStatus.COMPLETED, result.getStatus());
        verify(vehicleService).updateVehicleStatus(vehicleId, VehicleStatus.ACTIVE);
        verify(reservationRepository).save(reservation);
    }

    @Test
    void markAsCompleted_shouldThrowExceptionWhenStatusIsNotActive() {
        UUID resId = UUID.randomUUID();
        Reservation reservation = Reservation.builder()
                .id(resId)
                .status(ReservationStatus.CONFIRMED)
                .build();

        when(reservationRepository.findById(resId)).thenReturn(Optional.of(reservation));

        assertThrows(IllegalStateException.class, () -> reservationService.markAsCompleted(resId));
        verify(reservationRepository, never()).save(any());
    }

    @Test
    void getReservationsByVehicleId_shouldFilterOutCanceledReservations() {
        UUID vehicleId = UUID.randomUUID();
        Reservation activeRes = Reservation.builder().id(UUID.randomUUID()).status(ReservationStatus.CONFIRMED).build();
        Reservation canceledRes = Reservation.builder().id(UUID.randomUUID()).status(ReservationStatus.CANCELED).build();

        when(reservationRepository.findByVehicleId(vehicleId)).thenReturn(List.of(activeRes, canceledRes));

        List<Reservation> result = reservationService.getReservationsByVehicleId(vehicleId);

        assertEquals(1, result.size());
        assertSame(activeRes, result.get(0));
    }

    // Helper method for Security Context setup
    private void setupSecurityContext(String email, String role) {
        var authority = new SimpleGrantedAuthority(role);
        var auth = new UsernamePasswordAuthenticationToken(email, null, List.of(authority));
        SecurityContextHolder.getContext().setAuthentication(auth);
    }
}