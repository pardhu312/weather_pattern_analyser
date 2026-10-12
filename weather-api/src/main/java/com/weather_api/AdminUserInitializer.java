package com.weather_api;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class AdminUserInitializer {

    @Value("${ADMIN_USERNAME:${admin.username:admin}}")
    private String adminUsername;

    @Value("${ADMIN_EMAIL:${admin.email:admin@weather.local}}")
    private String adminEmail;

    @Value("${ADMIN_PASSWORD:${admin.password:Admin123!}}")
    private String adminPassword;

    @Bean
    public CommandLineRunner initializeAdminUser(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder
    ) {
        return args -> {

            if (userRepository.existsByUsername(adminUsername)) {
                System.out.println(
                        "Admin user already exists: " + adminUsername
                );
                return;
            }

            User admin = new User();

            admin.setUsername(adminUsername);
            admin.setEmail(adminEmail);
            admin.setPasswordHash(
                    passwordEncoder.encode(adminPassword)
            );
            admin.setRole("ADMIN");

            userRepository.save(admin);

            System.out.println(
                    "Initial admin user created: " + adminUsername
            );
        };
    }
}