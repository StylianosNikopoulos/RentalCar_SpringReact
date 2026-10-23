package com.example.rentalcars.scheduling;

import com.example.rentalcars.features.reservation.domain.port.inbound.ReservationService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ReservationCleanupTask {
    private final ReservationService reservationService;

    @Scheduled(fixedRate = 300000)
    public void cancelExpiredReservations() {
        reservationService.cancelExpiredPendingReservationsAndPayments();
    }

    @Scheduled(fixedRate = 300000)
    public void autoStartReservations() {
        reservationService.startScheduledReservations();
    }

    @Scheduled(fixedRate = 300000)
    public void autoEndReservations() {
        reservationService.completeFinishedReservations();
    }
}