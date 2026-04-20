package com.checkautos.config;

import com.checkautos.security.JwtAuthFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http

            .csrf(csrf -> csrf.disable())


            .formLogin(form -> form.disable())


            .httpBasic(basic -> basic.disable())


            .sessionManagement(sm -> sm
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))


            .authorizeHttpRequests(auth -> auth

                .requestMatchers("/api/auth/login", "/api/auth/registro").permitAll()

                .requestMatchers(
                    "/",
                    "/index.html",
                    "/css/**",
                    "/js/**",
                    "/favicon.ico",
                    "/*.html",
                    "/*.js",
                    "/*.css"
                ).permitAll()

                .anyRequest().authenticated()
            )


            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}