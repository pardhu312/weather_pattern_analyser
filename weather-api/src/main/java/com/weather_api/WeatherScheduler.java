package com.weather_api;

import java.util.List;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class WeatherScheduler {

    private final OpenWeatherService openWeatherService;

    public WeatherScheduler(OpenWeatherService openWeatherService) {
        this.openWeatherService = openWeatherService;
    }

    private record CityLocation(
            String city,
            double latitude,
            double longitude) {
    }

    private final List<CityLocation> cities = List.of(
            new CityLocation("Chennai", 13.0827, 80.2707),
            new CityLocation("Bengaluru", 12.9716, 77.5946),
            new CityLocation("Mumbai", 19.0760, 72.8777),
            new CityLocation("Delhi", 28.6139, 77.2090),
            new CityLocation("Hyderabad", 17.3850, 78.4867)
    );

    @Scheduled(
            fixedRate = 10 * 60 * 1000,
            initialDelay = 5000
    )
    public void collectWeather() {

        System.out.println("Starting weather collection...");

        for (CityLocation location : cities) {

            try {
                System.out.println(
                        "Fetching weather for " + location.city()
                );

                openWeatherService.fetchAndSave(
                        location.city(),
                        location.latitude(),
                        location.longitude()
                );

                System.out.println(
                        "Saved weather for " + location.city()
                );

            } catch (Exception e) {

                System.err.println(
                        "Failed to collect weather for "
                                + location.city()
                                + ": "
                                + e.getMessage()
                );
            }
        }

        System.out.println("Weather collection completed.");
    }
}