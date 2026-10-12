package com.weather_api;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI weatherApiOpenAPI() {

        return new OpenAPI()
                .info(
                        new Info()
                                .title("Weather Pattern Analyzer API")
                                .version("1.0.0")
                                .description(
                                        "REST API for collecting, storing, "
                                        + "and analyzing multi-city weather observations."
                                )
                                .contact(
                                        new Contact()
                                                .name("Weather Pattern Analyzer")
                                )
                );
    }
}