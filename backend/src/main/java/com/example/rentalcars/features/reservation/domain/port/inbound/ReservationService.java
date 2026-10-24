package com.example.rentalcars.features.reservation.domain.port.inbound;

import com.example.rentalcars.features.reservation.domain.model.Reservation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface ReservationService {
    Page<Reservation> getMyReservations(Pageable pageable);
    Page<Reservation> getAllReservations(Pageable pageable);
    Reservation getReservationById(UUID id);
    Reservation createReservation(Reservation reservation);
    Reservation markAsCompleted(UUID reservationId);
    List<Reservation> getReservationsByVehicleId(UUID vehicleId);
    void cancelReservation(UUID reservationId, String userEmail);
    Reservation cancelReservationInternal(UUID reservationId);
    Reservation confirmReservation(UUID reservationId);
    void cancelAllActiveReservationsByUserId(UUID userId);
    void cancelExpiredPendingReservationsAndPayments();
    void startScheduledReservations();
    void completeFinishedReservations();
}
