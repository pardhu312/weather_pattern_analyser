package com.weather_api;

import java.time.Instant;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface WeatherObservationRepository
        extends JpaRepository<WeatherObservation, Long> {

    Optional<WeatherObservation> findByCityAndObservedAt(
            String city,
            Instant observedAt
    );
}