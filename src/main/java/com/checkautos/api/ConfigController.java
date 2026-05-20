package com.checkautos.api;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Expone configuración pública (sin secretos) al frontend.
 * Permite que el JS conozca el Google Client ID sin hardcodearlo.
 */
@RestController
@RequestMapping("/api/config")
public class ConfigController {

    @Value("${google.client-id:}")
    private String googleClientId;

    @GetMapping("/public")
    public ResponseEntity<?> publicConfig() {
        return ResponseEntity.ok(Map.of(
                "googleClientId", googleClientId != null ? googleClientId : ""
        ));
    }
}
