package com.example.rentalcars.features.vehicle.infrastructure.adapter.outbound.persistence;

import com.example.rentalcars.features.vehicle.domain.model.Vehicle;
import com.example.rentalcars.features.vehicle.domain.model.VehicleImage;
import org.mapstruct.AfterMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import java.util.stream.Collectors;
import java.time.LocalDateTime;

@Mapper(componentModel = "spring", imports = {LocalDateTime.class})
public interface VehiclePersistenceMapper {

    @Mapping(target = "licensePlate", source = "licensePlate.value")
    @Mapping(target = "images", ignore = true)
    VehicleJpaEntity toEntity(Vehicle domain);

    @Mapping(target = "id", expression = "java(domain.getId())")
    @Mapping(target = "vehicle", ignore = true)
    VehicleImageJpaEntity toImageEntity(VehicleImage domain);

    @AfterMapping
    default void finalizeEntity(Vehicle domain, @MappingTarget VehicleJpaEntity entity) {
        if (domain.getImages() != null) {
            var jpaImages = domain.getImages().stream()
                    .map(domainImage -> {
                        VehicleImageJpaEntity imageEntity = toImageEntity(domainImage);
                        imageEntity.setVehicle(entity);
                        return imageEntity;
                    })
                    .collect(Collectors.toList());

            entity.setImages(jpaImages);
        }
    }

    @Mapping(target = "licensePlate", expression = "java(new com.example.rentalcars.features.vehicle.domain.model.LicensePlate(entity.getLicensePlate()))")
    Vehicle toDomain(VehicleJpaEntity entity);

    @Mapping(target = "id", expression = "java(entity.getId())")
    VehicleImage toImageDomain(VehicleImageJpaEntity entity);
}
