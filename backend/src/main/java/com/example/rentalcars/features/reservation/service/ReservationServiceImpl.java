package com.example.rentalcars.features.reservation.service;

import com.example.rentalcars.core.valueobject.Money;
import com.example.rentalcars.features.payment.domain.port.inbound.PaymentService;
import com.example.rentalcars.features.reservation.domain.enums.ReservationStatus;
import com.example.rentalcars.features.reservation.domain.exception.CarNotAvailableException;
import com.example.rentalcars.features.reservation.domain.exception.InvalidReservationDatesException;
import com.example.rentalcars.features.reservation.domain.exception.ReservationNotFoundException;
import com.example.rentalcars.features.reservation.domain.model.Reservation;
import com.example.rentalcars.features.reservation.domain.port.inbound.ReservationService;
import com.example.rentalcars.features.reservation.domain.port.outbound.ReservationRepository;
import com.example.rentalcars.features.user.domain.port.inbound.UserService;
import com.example.rentalcars.features.vehicle.domain.enums.VehicleStatus;
import com.example.rentalcars.features.vehicle.domain.port.inbound.VehicleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReservationServiceImpl implements ReservationService {

    private final ReservationRepository reservationRepository;
    private final PaymentService paymentService;
    private final VehicleService vehicleService;
    private final UserService userService;

    @Override
    @Transactional
    public Reservation createReservation(Reservation reservation) {
        var auth = SecurityContextHolder.getContext().getAuthentication();

        var user = userService.getUserByEmail(auth.getName());
        reservation.setUserId(user.getId());

        if (reservation.getPeriod() == null) {
            throw new InvalidReservationDatesException("Reservation period is missing.");
        }

        if (reservation.getPeriod().isPast()) {
            throw new InvalidReservationDatesException("Pickup date cannot be in the past.");
        }

        var vehicle = vehicleService.getVehicleByIdWithLock(reservation.getVehicleId());

        if (reservationRepository.existsOverlap(reservation.getVehicleId(), reservation.getPeriod())) {
            log.warn("Reservation creation failed: Vehicle {} is already booked for period {}", reservation.getVehicleId(), reservation.getPeriod());
            throw new CarNotAvailableException();
        }

        reservation.setVehicleName(vehicle.getModel());
        reservation.setVehicleBrand(vehicle.getBrand());
        reservation.calculateTotal(new Money(vehicle.getDailyPrice(), "EUR"));
        reservation.setStatus(ReservationStatus.PENDING);
        reservation.setEmail(user.getEmail());

        Reservation savedReservation = reservationRepository.save(reservation);
        log.info("Reservation created with ID: {} for user: {} and vehicle: {}", savedReservation.getId(), user.getEmail(), vehicle.getId());
        return savedReservation;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<Reservation> getMyReservations(Pageable pageable) {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        var user = userService.getUserByEmail(auth.getName());
        return reservationRepository.findByUserId(user.getId(), pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<Reservation> getAllReservations(Pageable pageable) {
        return reservationRepository.findAll(pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public Reservation getReservationById(UUID id) {
        Reservation reservation = reservationRepository.findById(id)
                .orElseThrow(() -> new ReservationNotFoundException(id));

        validateOwnership(reservation);
        return reservation;
    }

    @Override
    @Transactional
    public void cancelReservation(UUID reservationId, String userEmail) {
        var reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new ReservationNotFoundException(reservationId));

        validateOwnership(reservation);

        if (reservation.getStatus() == ReservationStatus.CONFIRMED) {
            var payment = paymentService.getPaymentByReservationId(reservationId);
            paymentService.refundPayment(payment.getStripePaymentId());
            log.info("Refund initiated for confirmed reservation: {}", reservationId);
        }

        reservation.cancel();
        reservationRepository.save(reservation);
        vehicleService.updateVehicleStatus(reservation.getVehicleId(), VehicleStatus.ACTIVE);

        log.info("Reservation {} canceled successfully by user {}", reservationId, userEmail);
    }

    @Override
    @Transactional
    public Reservation confirmReservation(UUID reservationId) {
        var reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new ReservationNotFoundException(reservationId));

        reservation.confirm();
        Reservation saved = reservationRepository.save(reservation);
        log.info("Reservation {} status updated to CONFIRMED", reservationId);
        return saved;
    }

    @Override
    @Transactional
    public void cancelAllActiveReservationsByUserId(UUID userId) {
        List<Reservation> activeReservations = reservationRepository.findAllByUserIdAndStatusIn(
                userId,
                List.of(ReservationStatus.PENDING, ReservationStatus.CONFIRMED)
        );

        if (!activeReservations.isEmpty()) {
            for (Reservation res : activeReservations) {
                res.setStatus(ReservationStatus.CANCELED);
                reservationRepository.save(res);
            }
            log.info("Canceled {} active reservation(s) for user ID: {}", activeReservations.size(), userId);
        }
    }

    @Override
    @Transactional
    public void cancelExpiredPendingReservationsAndPayments() {
        LocalDateTime threshold = LocalDateTime.now().minusHours(1);

        int canceledReservations = reservationRepository.cancelExpiredPendingReservations(threshold);
        int failedPayments = paymentService.cancelExpiredPendingPayments(threshold);

        if (canceledReservations > 0 || failedPayments > 0) {
            log.info("Cleanup completed: Canceled {} reservation(s) and marked {} payment(s) as FAILED",
                    canceledReservations, failedPayments);
        }
    }

    @Override
    @Transactional
    public void startScheduledReservations() {
        LocalDateTime now = LocalDateTime.now();
        List<UUID> vehicleIds = reservationRepository.findVehicleIdsToStart(now);

        if (!vehicleIds.isEmpty()) {
            int updatedCount = reservationRepository.bulkStartReservations(now);
            int updatedVehicles = vehicleService.updateVehiclesStatusBulk(vehicleIds, VehicleStatus.RENTED);
            log.info("Auto-start task: Updated {} reservation(s) and {} vehicle(s)", updatedCount, updatedVehicles);
        }
    }

    @Override
    @Transactional
    public void completeFinishedReservations() {
        LocalDateTime now = LocalDateTime.now();
        List<UUID> vehicleIds = reservationRepository.findVehicleIdsToComplete(now);

        if (!vehicleIds.isEmpty()) {
            int updatedCount = reservationRepository.bulkCompleteReservations(now);
            int updatedVehicles = vehicleService.updateVehiclesStatusBulk(vehicleIds, VehicleStatus.ACTIVE);
            log.info("Auto-complete task: Updated {} reservation(s) and {} vehicle(s)", updatedCount, updatedVehicles);
        }
    }

    @Override
    @Transactional
    public Reservation cancelReservationInternal(UUID reservationId) {
        var reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new ReservationNotFoundException(reservationId));

        reservation.setStatus(ReservationStatus.CANCELED);
        Reservation savedReservation = reservationRepository.save(reservation);

        if (savedReservation.getVehicleId() != null) {
            vehicleService.restoreVehicle(reservation.getVehicleId());
        }
        log.info("Reservation {} canceled internally by system", reservationId);
        return savedReservation;
    }

    @Override
    @Transactional
    public Reservation markAsCompleted(UUID reservationId) {
        var reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new ReservationNotFoundException(reservationId));

        reservation.markAsCompleted();
        var updatedReservation = reservationRepository.save(reservation);

        vehicleService.updateVehicleStatus(reservation.getVehicleId(), VehicleStatus.ACTIVE);
        log.info("Reservation {} marked as COMPLETED. Vehicle {} set to AVAILABLE", reservationId, reservation.getVehicleId());
        return updatedReservation;
    }

    @Override
    public List<Reservation> getReservationsByVehicleId(UUID vehicleId) {
        return reservationRepository.findByVehicleId(vehicleId).stream()
                .filter(res -> res.getStatus() != ReservationStatus.CANCELED)
                .toList();
    }

    // Helper method for security
    private void validateOwnership(Reservation reservation) {
        var auth = SecurityContextHolder.getContext().getAuthentication();

        if (isAdmin(auth)) {
            return;
        }

        var user = userService.getUserByEmail(auth.getName());

        if (!reservation.getUserId().equals(user.getId())) {
            log.warn("Access denied for user {} attempting to access reservation {}", auth.getName(), reservation.getId());
            throw new AccessDeniedException("You don't have permission to do this action");
        }
    }

    // Helper method for admin check
    private boolean isAdmin(Authentication auth) {
        return auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }
}