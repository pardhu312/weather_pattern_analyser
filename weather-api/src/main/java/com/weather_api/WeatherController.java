package com.weather_api;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

@Tag(
        name = "Weather",
        description = "Weather observation and collection endpoints"
)
@RestController
@RequestMapping("/api")
public class WeatherController {

    private final WeatherObservationService service;
    private final OpenWeatherService openWeatherService;

    public WeatherController(
            WeatherObservationService service,
            OpenWeatherService openWeatherService) {

        this.service = service;
        this.openWeatherService = openWeatherService;
    }

    @Operation(
            summary = "Check API health",
            description = "Returns the current status of the Weather API."
    )
    @ApiResponse(
            responseCode = "200",
            description = "API is running successfully"
    )
    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of(
                "status", "Weather API is running"
        );
    }

    @Operation(
            summary = "Get stored weather observations",
            description = "Returns all weather observations stored in PostgreSQL."
    )
    @ApiResponse(
            responseCode = "200",
            description = "Weather observations retrieved successfully"
    )
    @GetMapping("/weather")
    public List<WeatherObservation> getAllWeather() {
        return service.getAll();
    }

    @Operation(
            summary = "Create a weather observation",
            description = "Manually stores a weather observation in PostgreSQL."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Weather observation stored successfully"
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "Invalid weather data"
            )
    })
        @PostMapping("/weather")
        public WeatherObservation createWeather(
                @Valid @RequestBody WeatherObservationRequest request) {

            WeatherObservation observation = new WeatherObservation();

            observation.setCity(request.getCity().trim());
            observation.setCountry(request.getCountry().trim());
            observation.setLatitude(request.getLatitude());
            observation.setLongitude(request.getLongitude());
            observation.setObservedAt(request.getObservedAt() != null ? request.getObservedAt() : Instant.now());
            observation.setTemperature(request.getTemperature());
            observation.setFeelsLike(request.getFeelsLike());
            observation.setHumidity(request.getHumidity());
            observation.setPressure(request.getPressure());
            observation.setWindSpeed(request.getWindSpeed());
            observation.setWindDirection(request.getWindDirection());
            observation.setCloudPercent(request.getCloudPercent());
            observation.setRain1h(request.getRain1h());
            observation.setWeatherMain(request.getWeatherMain());
            observation.setWeatherDescription(request.getWeatherDescription());

            return service.save(observation);
        }
    @Operation(
            summary = "Fetch and store current weather",
            description = "Fetches current weather from OpenWeather using the supplied city and coordinates, then stores the observation in PostgreSQL."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Weather successfully fetched and stored"
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "Invalid city, latitude, or longitude"
            ),
            @ApiResponse(
                    responseCode = "502",
                    description = "OpenWeather service failure"
            )
    })
    @PostMapping("/weather/fetch")
    public WeatherObservation fetchWeather(
            @RequestParam String city,
            @RequestParam double lat,
            @RequestParam double lon) {

        if (city == null || city.isBlank()) {
            throw new IllegalArgumentException("City is required");
        }

        if (lat < -90 || lat > 90) {
            throw new IllegalArgumentException(
                    "Latitude must be between -90 and 90"
            );
        }

        if (lon < -180 || lon > 180) {
            throw new IllegalArgumentException(
                    "Longitude must be between -180 and 180"
            );
        }

        return openWeatherService.fetchAndSave(
                city.trim(),
                lat,
                lon
        );
    }
}