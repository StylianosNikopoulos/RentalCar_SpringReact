package com.example.rentalcars.features.reservation.domain.port.outbound;

import com.example.rentalcars.core.valueobject.DateRange;
import com.example.rentalcars.features.reservation.domain.model.Reservation;
import com.example.rentalcars.features.reservation.domain.enums.ReservationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ReservationRepository {
    Reservation save(Reservation reservation);
    Optional<Reservation> findById (UUID id);
    Page<Reservation> findByUserId(UUID userId, Pageable pageable);
    Page<Reservation> findAll(Pageable pageable);
    List<Reservation> findByVehicleId(UUID vehicleId);
    boolean existsOverlap(UUID vehicleId, DateRange period);
    List<Reservation> findAllByUserIdAndStatusIn(UUID userId, List<ReservationStatus> statuses);
    int cancelExpiredPendingReservations(LocalDateTime threshold);
    List<UUID> findVehicleIdsToStart(LocalDateTime now);
    int bulkStartReservations(LocalDateTime now);
    List<UUID> findVehicleIdsToComplete(LocalDateTime now);
    int bulkCompleteReservations(LocalDateTime now);
}
