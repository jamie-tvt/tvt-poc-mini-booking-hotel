package com.hotelbooking.infrastructure.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record AppProperties(Jwt jwt, String frontendUrl, String corsOrigins, boolean demoTools, boolean seedDemo,
                            Payment payment, Jobs jobs) {
    public record Jwt(String secret, long accessTtlMinutes, long refreshTtlDays) {}
    public record Payment(String provider, String mockSecret, String stripeSecretKey, String stripeWebhookSecret) {
        public boolean isStripe() { return "stripe".equalsIgnoreCase(provider); }
    }
    public record Jobs(long expiryIntervalMs) {}
}
