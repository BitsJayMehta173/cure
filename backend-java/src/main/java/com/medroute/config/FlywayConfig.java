package com.medroute.config;

import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Migrations V2+ are idempotent (IF NOT EXISTS guards) so they also succeed on databases whose
 * columns were created earlier by Hibernate (e.g. the first Render deploy). Guarding them changed
 * their checksums, so repair() first re-aligns the recorded checksums, then migrate() runs.
 */
@Configuration
public class FlywayConfig {

    @Bean
    public FlywayMigrationStrategy repairThenMigrate() {
        return flyway -> {
            flyway.repair();
            flyway.migrate();
        };
    }
}
