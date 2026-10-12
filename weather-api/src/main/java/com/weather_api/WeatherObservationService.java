package com.weather_api;

import java.util.List;

import org.springframework.stereotype.Service;

@Service
public class WeatherObservationService {

    private final WeatherObservationRepository repository;

    public WeatherObservationService(WeatherObservationRepository repository) {
        this.repository = repository;
    }

    public WeatherObservation save(WeatherObservation observation) {
        return repository.save(observation);
    }

    public List<WeatherObservation> getAll() {
        return repository.findAll();
    }
}