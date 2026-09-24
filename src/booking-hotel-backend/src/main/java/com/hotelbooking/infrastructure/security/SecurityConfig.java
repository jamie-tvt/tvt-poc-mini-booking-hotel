package com.hotelbooking.infrastructure.security;

import com.hotelbooking.infrastructure.config.AppProperties;
import java.util.Arrays;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * Phân quyền theo vai trò ở đây; phân quyền theo khách sạn (tenant) ở tầng service (HotelScope) vì cần dữ liệu.
 * Các endpoint phía khách vãng lai là public nhưng mọi thao tác trên booking đều đòi code + accessKey.
 */
@Configuration
@EnableMethodSecurity
public class SecurityConfig {
    private static final String API = "/api/v1";

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http, JwtAuthenticationFilter jwtFilter, SecurityErrorWriter errors) throws Exception {
        http.csrf(c -> c.disable())            // API stateless dùng Bearer token, không dùng cookie → không cần CSRF token
            .cors(c -> {})
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(e -> e.authenticationEntryPoint(errors.entryPoint()).accessDeniedHandler(errors.accessDenied()))
            .authorizeHttpRequests(a -> a
                    .requestMatchers("/docs/**", "/swagger-ui/**", "/v3/api-docs/**", "/actuator/health").permitAll()
                    .requestMatchers(API + "/auth/register", API + "/auth/login", API + "/auth/refresh", API + "/auth/logout").permitAll()
                    .requestMatchers(HttpMethod.GET, API + "/hotels/search", API + "/hotels/*", API + "/hotels/*/reviews",
                            API + "/cities", API + "/facility-categories", API + "/demo/clock").permitAll()
                    // Guest checkout: đặt, tra cứu, thanh toán, huỷ, đánh giá bằng code + accessKey
                    .requestMatchers(HttpMethod.POST, API + "/bookings", API + "/bookings/lookup", API + "/bookings/code/*/cancel",
                            API + "/bookings/code/*/payment", API + "/payments/mock/*/complete", API + "/reviews",
                            API + "/payments/webhook/mock", API + "/payments/stripe/webhook").permitAll()
                    .requestMatchers(HttpMethod.GET, API + "/bookings/code/*", API + "/payments/*").permitAll()
                    // Việc chỉ chủ khách sạn làm: chặn ở đây (403 trước cả validate body); @PreAuthorize ở controller là lớp thứ hai
                    .requestMatchers(HttpMethod.POST, API + "/portal/hotels", API + "/portal/hotels/*/room-types",
                            API + "/portal/room-types/*/rooms", API + "/portal/hotels/*/staff").hasRole("HOTEL_OWNER")
                    .requestMatchers(HttpMethod.PUT, API + "/portal/hotels/*", API + "/portal/room-types/*", API + "/portal/room-types/*/prices",
                            API + "/portal/rooms/*", API + "/portal/staff/*/active").hasRole("HOTEL_OWNER")
                    .requestMatchers(HttpMethod.DELETE, API + "/portal/room-types/*").hasRole("HOTEL_OWNER")
                    .requestMatchers(API + "/portal/hotels/*/staff", API + "/portal/payouts").hasRole("HOTEL_OWNER")
                    .requestMatchers(API + "/portal/**").hasAnyRole("HOTEL_OWNER", "HOTEL_STAFF")
                    .requestMatchers(API + "/admin/**").hasRole("ADMIN")
                    .requestMatchers(API + "/users/me/bookings").hasRole("CUSTOMER")
                    .anyRequest().authenticated())
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(AppProperties props) {
        CorsConfiguration cfg = new CorsConfiguration();
        cfg.setAllowedOrigins(Arrays.stream(props.corsOrigins().split(",")).map(String::trim).toList());
        cfg.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        cfg.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Request-Id"));
        cfg.setExposedHeaders(List.of("X-Request-Id"));
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cfg);
        return source;
    }

    @Bean
    PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }
}
