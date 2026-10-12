package com.weather_api;

import java.time.Instant;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import tools.jackson.databind.JsonNode;

@Service
public class OpenWeatherService {

    private final RestClient restClient;
    private final WeatherObservationRepository repository;

    @Value("${openweather.api.key}")
    private String apiKey;

    public OpenWeatherService(WeatherObservationRepository repository) {
        this.repository = repository;

        this.restClient = RestClient.builder()
                .baseUrl("https://api.openweathermap.org")
                .build();
    }

    public WeatherObservation fetchAndSave(
            String city,
            double latitude,
            double longitude) {

        JsonNode root;

        try {

            root = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/data/2.5/weather")
                            .queryParam("lat", latitude)
                            .queryParam("lon", longitude)
                            .queryParam("appid", apiKey)
                            .queryParam("units", "metric")
                            .build())
                    .retrieve()
                    .onStatus(
                            status -> status.isError(),
                            (request, response) -> {
                                throw new IllegalStateException(
                                        "OpenWeather returned HTTP "
                                                + response.getStatusCode()
                                );
                            }
                    )
                    .body(JsonNode.class);

        } catch (IllegalStateException e) {
            throw e;

        } catch (Exception e) {
            throw new IllegalStateException(
                    "Unable to contact OpenWeather: "
                            + e.getMessage(),
                    e
            );
        }

        // Validate weather data before creating a database record
        JsonNode weatherArray = root.path("weather");

        if (!weatherArray.isArray() || weatherArray.isEmpty()) {
            throw new IllegalStateException(
                    "OpenWeather response does not contain weather data"
            );
        }

        JsonNode weather = weatherArray.get(0);

        Instant observedAt = Instant.ofEpochSecond(root.path("dt").asLong());
        Optional<WeatherObservation> existing = repository.findByCityAndObservedAt(city, observedAt);
        if (existing.isPresent()) {
            return existing.get();
        }

        WeatherObservation observation = new WeatherObservation();

        // Use our canonical city name
        observation.setCity(city);

        observation.setCountry(
                root.path("sys").path("country").asText()
        );

        observation.setLatitude(
                root.path("coord").path("lat").asDouble()
        );

        observation.setLongitude(
                root.path("coord").path("lon").asDouble()
        );

        observation.setObservedAt(observedAt);

        JsonNode main = root.path("main");

        observation.setTemperature(
                main.path("temp").asDouble()
        );

        observation.setFeelsLike(
                main.path("feels_like").asDouble()
        );

        observation.setHumidity(
                main.path("humidity").asInt()
        );

        observation.setPressure(
                main.path("pressure").asInt()
        );

        JsonNode wind = root.path("wind");

        observation.setWindSpeed(
                wind.path("speed").asDouble()
        );

        if (wind.path("deg").isNumber()) {
            observation.setWindDirection(
                    wind.path("deg").asInt()
            );
        }

        observation.setCloudPercent(
                root.path("clouds").path("all").asInt()
        );
        JsonNode rain = root.path("rain");

        if (rain.path("1h").isNumber()) {
        observation.setRain1h(
                rain.path("1h").asDouble()
        );
        } else {
        observation.setRain1h(0.0);
        }

        observation.setWeatherMain(
                weather.path("main").asText()
        );

        observation.setWeatherDescription(
                weather.path("description").asText()
        );

        return repository.save(observation);
    }
}