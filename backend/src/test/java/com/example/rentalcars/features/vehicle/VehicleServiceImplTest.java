package com.example.rentalcars.features.vehicle;

import com.example.rentalcars.core.exception.BusinessException;
import com.example.rentalcars.features.vehicle.domain.enums.FuelType;
import com.example.rentalcars.features.vehicle.domain.enums.VehicleStatus;
import com.example.rentalcars.features.vehicle.domain.exception.VehicleNotFoundException;
import com.example.rentalcars.features.vehicle.domain.model.LicensePlate;
import com.example.rentalcars.features.vehicle.domain.model.Vehicle;
import com.example.rentalcars.features.vehicle.domain.model.VehicleImage;
import com.example.rentalcars.features.vehicle.domain.port.outbound.VehicleRepository;
import com.example.rentalcars.features.vehicle.infrastructure.adapter.inbound.rest.dto.VehicleRequest;
import com.example.rentalcars.features.vehicle.service.VehicleServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class VehicleServiceImplTest {

    @Mock
    private VehicleRepository vehicleRepository;

    private VehicleServiceImpl vehicleService;

    @BeforeEach
    void setUp() {
        vehicleService = new VehicleServiceImpl(vehicleRepository);
    }

    // CREATE VEHICLE
    @Test
    void createVehicle_shouldCreateActiveVehicleWithImages() {
        VehicleRequest request = vehicleRequest();
        Vehicle savedVehicle = Vehicle.builder()
                .id(UUID.randomUUID())
                .brand(request.getBrand())
                .model(request.getModel())
                .licensePlate(new LicensePlate(request.getLicensePlate()))
                .status(VehicleStatus.ACTIVE)
                .build();

        when(vehicleRepository.existsByLicensePlate("ABC-1234")).thenReturn(false);
        when(vehicleRepository.save(any(Vehicle.class))).thenReturn(savedVehicle);

        Vehicle result = vehicleService.createVehicle(request);

        assertSame(savedVehicle, result);
        verify(vehicleRepository).save(argThat(vehicle ->
                vehicle.getBrand().equals("Toyota")
                        && vehicle.getModel().equals("Corolla")
                        && vehicle.getStatus() == VehicleStatus.ACTIVE
                        && vehicle.getLicensePlate().value().equals("ABC-1234")
                        && vehicle.getImages().size() == 2
                        && vehicle.getImages().stream().filter(VehicleImage::isMain).count() == 1));
    }

    @Test
    void createVehicle_shouldRejectDuplicateLicensePlate() {
        VehicleRequest request = vehicleRequest();
        when(vehicleRepository.existsByLicensePlate("ABC-1234")).thenReturn(true);

        BusinessException exception = assertThrows(BusinessException.class,
                () -> vehicleService.createVehicle(request));

        assertEquals("DUPLICATE_LICENSE_PLATE", exception.getErrorCode());
        verify(vehicleRepository, never()).save(any());
    }

    // GET VEHICLE BY ID & PESSIMISTIC LOCKING
    @Test
    void getVehicleById_shouldReturnVehicle() {
        UUID id = UUID.randomUUID();
        Vehicle vehicle = Vehicle.builder().id(id).build();
        when(vehicleRepository.findById(id)).thenReturn(Optional.of(vehicle));

        assertSame(vehicle, vehicleService.getVehicleById(id));
    }

    @Test
    void getVehicleById_shouldThrowWhenVehicleDoesNotExist() {
        UUID id = UUID.randomUUID();
        when(vehicleRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(VehicleNotFoundException.class, () -> vehicleService.getVehicleById(id));
    }

    @Test
    void getVehicleByIdWithLock_shouldReturnLockedVehicle() {
        UUID id = UUID.randomUUID();
        Vehicle vehicle = Vehicle.builder().id(id).build();
        when(vehicleRepository.findByIdWithLock(id)).thenReturn(Optional.of(vehicle));

        assertSame(vehicle, vehicleService.getVehicleByIdWithLock(id));
        verify(vehicleRepository).findByIdWithLock(id);
    }

    @Test
    void getVehicleByIdWithLock_shouldThrowWhenVehicleDoesNotExist() {
        UUID id = UUID.randomUUID();
        when(vehicleRepository.findByIdWithLock(id)).thenReturn(Optional.empty());

        assertThrows(VehicleNotFoundException.class, () -> vehicleService.getVehicleByIdWithLock(id));
    }

    // UPDATE VEHICLE
    @Test
    void updateVehicle_shouldUpdateVehicleAndImages() {
        UUID id = UUID.randomUUID();

        Vehicle vehicle = Vehicle.builder()
                .id(id)
                .brand("Toyota")
                .model("Corolla")
                .licensePlate(new LicensePlate("ABC-1234"))
                .images(List.of())
                .build();
        VehicleRequest request = vehicleRequest();

        request.setBrand("Honda");
        request.setModel("Civic");
        request.setLicensePlate("XYZ-7890");
        when(vehicleRepository.findById(id)).thenReturn(Optional.of(vehicle));
        when(vehicleRepository.existsByLicensePlate("XYZ-7890")).thenReturn(false);
        when(vehicleRepository.save(vehicle)).thenReturn(vehicle);

        Vehicle result = vehicleService.updateVehicle(id, request);

        assertSame(vehicle, result);
        assertEquals("Honda", vehicle.getBrand());
        assertEquals("Civic", vehicle.getModel());
        assertEquals("XYZ-7890", vehicle.getLicensePlate().value());
        verify(vehicleRepository).save(vehicle);
    }

    // STATUS MANAGEMENT & BULK OPERATIONS
    @Test
    void markVehicleOutOfService_shouldChangeStatusAndSave() {
        UUID id = UUID.randomUUID();
        Vehicle vehicle = Vehicle.builder().id(id).status(VehicleStatus.ACTIVE).build();
        when(vehicleRepository.findById(id)).thenReturn(Optional.of(vehicle));

        vehicleService.markVehicleOutOfService(id);

        assertEquals(VehicleStatus.OUT_OF_SERVICE, vehicle.getStatus());
        verify(vehicleRepository).save(vehicle);
    }

    @Test
    void updateVehicleStatus_shouldUpdateStatusAndSave() {
        UUID id = UUID.randomUUID();
        Vehicle vehicle = Vehicle.builder().id(id).status(VehicleStatus.ACTIVE).build();
        when(vehicleRepository.findById(id)).thenReturn(Optional.of(vehicle));

        vehicleService.updateVehicleStatus(id, VehicleStatus.RENTED);

        assertEquals(VehicleStatus.RENTED, vehicle.getStatus());
        verify(vehicleRepository).save(vehicle);
    }

    @Test
    void restoreVehicle_shouldSetVehicleActiveAndReturnSavedVehicle() {
        UUID id = UUID.randomUUID();
        Vehicle vehicle = Vehicle.builder().id(id).status(VehicleStatus.OUT_OF_SERVICE).build();
        when(vehicleRepository.findById(id)).thenReturn(Optional.of(vehicle));
        when(vehicleRepository.save(vehicle)).thenReturn(vehicle);

        Vehicle result = vehicleService.restoreVehicle(id);

        assertSame(vehicle, result);
        assertEquals(VehicleStatus.ACTIVE, vehicle.getStatus());
        verify(vehicleRepository).save(vehicle);
    }

    @Test
    void updateVehiclesStatusBulk_shouldReturnZeroWithoutRepositoryCallForEmptyIds() {
        int result = vehicleService.updateVehiclesStatusBulk(List.of(), VehicleStatus.ACTIVE);

        assertEquals(0, result);
        verify(vehicleRepository, never()).updateStatusForIds(anyList(), any());
    }

    @Test
    void updateVehiclesStatusBulk_shouldReturnUpdatedCount() {
        List<UUID> ids = List.of(UUID.randomUUID(), UUID.randomUUID());
        when(vehicleRepository.updateStatusForIds(ids, VehicleStatus.OUT_OF_SERVICE)).thenReturn(2);

        int result = vehicleService.updateVehiclesStatusBulk(ids, VehicleStatus.OUT_OF_SERVICE);

        assertEquals(2, result);
        verify(vehicleRepository).updateStatusForIds(ids, VehicleStatus.OUT_OF_SERVICE);
    }

    // SEARCH & FILTER QUERIES
    @Test
    void getAllAvailableVehicles_shouldCleanSearchParametersBeforeQuery() {
        PageRequest pageable = PageRequest.of(0, 10);
        Page<Vehicle> expected = new PageImpl<>(List.of());
        when(vehicleRepository.findAllAvailableVehicles("%toyota%", "toyota", FuelType.PETROL,
                BigDecimal.valueOf(20), BigDecimal.valueOf(100), pageable)).thenReturn(expected);

        Page<Vehicle> result = vehicleService.getAllAvailableVehicles(
                "  Toyota ", "  Toyota ", FuelType.PETROL,
                BigDecimal.valueOf(20), BigDecimal.valueOf(100), pageable);

        assertSame(expected, result);
        verify(vehicleRepository).findAllAvailableVehicles("%toyota%", "toyota", FuelType.PETROL,
                BigDecimal.valueOf(20), BigDecimal.valueOf(100), pageable);
    }

    @Test
    void getAllVehiclesAdmin_shouldCleanSearchParametersBeforeQuery() {
        PageRequest pageable = PageRequest.of(0, 10);
        Page<Vehicle> expected = new PageImpl<>(List.of());
        when(vehicleRepository.findAllAdminVehicles("%toyota%", "toyota", FuelType.PETROL,
                VehicleStatus.ACTIVE, BigDecimal.valueOf(20), BigDecimal.valueOf(100), pageable))
                .thenReturn(expected);

        Page<Vehicle> result = vehicleService.getAllVehiclesAdmin(
                "  Toyota ", "  Toyota ", FuelType.PETROL, VehicleStatus.ACTIVE,
                BigDecimal.valueOf(20), BigDecimal.valueOf(100), pageable);

        assertSame(expected, result);
        verify(vehicleRepository).findAllAdminVehicles("%toyota%", "toyota", FuelType.PETROL,
                VehicleStatus.ACTIVE, BigDecimal.valueOf(20), BigDecimal.valueOf(100), pageable);
    }

    @Test
    void getAvailableVehicles_shouldDelegateValidDateRangeToRepository() {
        LocalDateTime start = LocalDateTime.of(2026, 5, 10, 10, 0);
        LocalDateTime end = LocalDateTime.of(2026, 5, 12, 10, 0);
        PageRequest pageable = PageRequest.of(0, 10);
        Page<Vehicle> expected = new PageImpl<>(List.of());
        when(vehicleRepository.findAvailableVehicles(start, end, "%toyota%", "toyota", FuelType.PETROL,
                BigDecimal.valueOf(20), BigDecimal.valueOf(100), pageable)).thenReturn(expected);

        Page<Vehicle> result = vehicleService.getAvailableVehicles(
                start, end, "  Toyota ", "  Toyota ", FuelType.PETROL,
                BigDecimal.valueOf(20), BigDecimal.valueOf(100), pageable);

        assertSame(expected, result);
        verify(vehicleRepository).findAvailableVehicles(start, end, "%toyota%", "toyota", FuelType.PETROL,
                BigDecimal.valueOf(20), BigDecimal.valueOf(100), pageable);
    }

    @Test
    void getAvailableVehicles_shouldRejectInvalidDateRange() {
        LocalDateTime start = LocalDateTime.of(2026, 5, 10, 10, 0);
        LocalDateTime end = LocalDateTime.of(2026, 5, 9, 10, 0);

        assertThrows(BusinessException.class, () -> vehicleService.getAvailableVehicles(
                start, end, null, null, null, null, null, PageRequest.of(0, 10)));
        verify(vehicleRepository, never()).findAvailableVehicles(any(), any(), any(), any(), any(), any(), any(), any());
    }

    // HELPER FIXTURE METHOD
    private VehicleRequest vehicleRequest() {
        VehicleRequest request = new VehicleRequest();
        request.setBrand("Toyota");
        request.setModel("Corolla");
        request.setYear(2024);
        request.setFuelType(FuelType.PETROL);
        request.setLicensePlate("ABC-1234");
        request.setDailyPrice(BigDecimal.valueOf(50));
        request.setImageUrls(List.of("front.jpg", "side.jpg"));
        request.setMainImageUrl("front.jpg");
        return request;
    }
}