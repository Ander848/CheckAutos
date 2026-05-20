package com.checkautos.api;

import com.checkautos.AppContext;
import com.checkautos.models.User;
import com.checkautos.security.JwtTokenService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import org.springframework.beans.factory.annotation.Value;

import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AppContext      appContext;
    private final JwtTokenService jwtTokenService;

    @Value("${google.client-id}")
    private String googleClientId;

    public AuthController(AppContext appContext, JwtTokenService jwtTokenService) {
        this.appContext      = appContext;
        this.jwtTokenService = jwtTokenService;
    }

    @PostMapping("/google")
    public ResponseEntity<?> googleLogin(@RequestBody Map<String, String> body) {
        String credential = body.get("credential");
        if (credential == null || credential.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Token de Google requerido"));
        }
        if (googleClientId == null || googleClientId.isBlank()) {
            return ResponseEntity.status(500).body(Map.of("error", "Google OAuth no configurado en el servidor"));
        }

        GoogleIdToken idToken;
        try {
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                    new NetHttpTransport(), GsonFactory.getDefaultInstance())
                    .setAudience(Collections.singletonList(googleClientId))
                    .build();
            idToken = verifier.verify(credential);
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "Token de Google inválido"));
        }

        if (idToken == null) {
            return ResponseEntity.status(401).body(Map.of("error", "No se pudo verificar el token de Google"));
        }

        GoogleIdToken.Payload payload = idToken.getPayload();
        String googleId = payload.getSubject();
        String email    = payload.getEmail().toLowerCase();
        String nombre   = (String) payload.get("name");
        if (nombre == null || nombre.isBlank()) nombre = email.split("@")[0];

        // Buscar usuario por email o crearlo
        User user = appContext.getAuthManager().getAllAccounts().stream()
                .filter(u -> email.equals(u.getEmail()))
                .findFirst().orElse(null);

        if (user == null) {
            // Crear cuenta nueva sin password (solo Google)
            user = new User(nombre, email, null, "USUARIO");
            user.setGoogleId(googleId);
            user.setProvider("google");
            appContext.getAuthManager().guardarUsuario(user);
            // Recargar para obtener el ID de Mongo
            user = appContext.getAuthManager().getAllAccounts().stream()
                    .filter(u -> email.equals(u.getEmail()))
                    .findFirst().orElse(user);
        } else {
            // Actualizar googleId si es la primera vez que usa Google
            if (user.getGoogleId() == null) {
                user.setGoogleId(googleId);
                if ("local".equals(user.getProvider()) || user.getProvider() == null) {
                    // mantener proveedor local si ya tenía contraseña
                }
                appContext.getAuthManager().guardarUsuario(user);
            }
        }

        String token = jwtTokenService.generateToken(email, user.getRol());
        Date expira  = jwtTokenService.getExpirationDate(token);

        return ResponseEntity.ok(Map.of(
                "token",   token,
                "tipo",    "Bearer",
                "expira",  expira.toString(),
                "usuario", Map.of(
                        "nombre",    user.getNombre(),
                        "email",     user.getEmail(),
                        "username",  user.getEmail(),
                        "iniciales", user.getInitials(),
                        "rol",       user.getRol()
                )
        ));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        String email    = body.get("email");
        String password = body.get("password");
        if (email == null) email = body.get("username");

        if (email == null || email.isBlank() || password == null || password.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Email y contraseña son requeridos"));
        }

        boolean ok = appContext.login(email.trim().toLowerCase(), password.trim());
        if (!ok) {
            return ResponseEntity.status(401)
                    .body(Map.of("error", "Email o contraseña incorrectos"));
        }

        User   user   = appContext.getCurrentUser();
        String token  = jwtTokenService.generateToken(email.trim().toLowerCase(), user.getRol());
        Date   expira = jwtTokenService.getExpirationDate(token);

        return ResponseEntity.ok(Map.of(
                "token",   token,
                "tipo",    "Bearer",
                "expira",  expira.toString(),
                "usuario", Map.of(
                        "nombre",    user.getNombre(),
                        "email",     user.getEmail(),
                        "username",  user.getEmail(),
                        "iniciales", user.getInitials(),
                        "rol",       user.getRol()
                )
        ));
    }

    @PostMapping("/registro")
    public ResponseEntity<?> registro(@RequestBody Map<String, String> body) {
        String nombre   = body.get("nombre");
        String email    = body.get("email");
        String password = body.get("password");
        if (email == null) email = body.get("username");

        if (nombre == null || nombre.isBlank() ||
            email == null || email.isBlank() ||
            password == null || password.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "nombre, email y password son requeridos"));
        }
        if (password.length() < 4) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "La contraseña debe tener al menos 4 caracteres"));
        }
        if (!email.contains("@") || !email.contains(".")) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "El email no tiene un formato válido"));
        }
        if (appContext.getAuthManager().usernameExists(email.trim().toLowerCase())) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Ya existe una cuenta con ese email"));
        }

        boolean ok = appContext.createAccount(nombre.trim(), email.trim().toLowerCase(), password.trim());
        if (!ok) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "No se pudo crear la cuenta"));
        }

        return ResponseEntity.status(201)
                .body(Map.of("mensaje", "Cuenta creada. Inicia sesión con tu email."));
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(Authentication authentication) {
        String email = authentication.getName();
        User user = appContext.getAuthManager().getAllAccounts().stream()
                .filter(u -> email.equals(u.getEmail()))
                .findFirst().orElse(null);

        if (user == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Usuario no encontrado"));
        }

        return ResponseEntity.ok(Map.of(
                "nombre",    user.getNombre(),
                "email",     user.getEmail(),
                "username",  user.getEmail(),
                "iniciales", user.getInitials(),
                "rol",       user.getRol()
        ));
    }

    @GetMapping("/usuarios")
    public ResponseEntity<?> listarUsuarios(Authentication authentication) {
        String email = authentication.getName();
        User solicitante = appContext.getAuthManager().getAllAccounts().stream()
                .filter(u -> email.equals(u.getEmail()))
                .findFirst().orElse(null);

        if (solicitante == null || !solicitante.isAdmin()) {
            return ResponseEntity.status(403)
                    .body(Map.of("error", "Solo los administradores pueden ver la lista de usuarios"));
        }

        List<Map<String, String>> usuarios = appContext.getAuthManager().getAllAccounts()
                .stream()
                .map(u -> Map.of(
                        "id",       u.getId() != null ? u.getId() : "",
                        "nombre",   u.getNombre(),
                        "email",    u.getEmail(),
                        "rol",      u.getRol(),
                        "initials", u.getInitials()
                ))
                .collect(Collectors.toList());

        return ResponseEntity.ok(usuarios);
    }

    @PatchMapping("/usuarios/{id}/rol")
    public ResponseEntity<?> cambiarRol(@PathVariable String id,
                                         @RequestBody Map<String, String> body,
                                         Authentication authentication) {
        String emailAdmin = authentication.getName();
        User admin = appContext.getAuthManager().getAllAccounts().stream()
                .filter(u -> emailAdmin.equals(u.getEmail()))
                .findFirst().orElse(null);

        if (admin == null || !admin.isAdmin()) {
            return ResponseEntity.status(403)
                    .body(Map.of("error", "Solo los administradores pueden cambiar roles"));
        }

        String nuevoRol = body.get("rol");
        if (!"ADMIN".equals(nuevoRol) && !"USUARIO".equals(nuevoRol)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Rol inválido. Usa ADMIN o USUARIO"));
        }

        User target = appContext.getAuthManager().getAllAccounts().stream()
                .filter(u -> id.equals(u.getId()))
                .findFirst().orElse(null);

        if (target == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Usuario no encontrado"));
        }

        target.setRol(nuevoRol);
        appContext.getAuthManager().guardarUsuario(target);

        return ResponseEntity.ok(Map.of(
                "mensaje", "Rol actualizado a " + nuevoRol,
                "email",   target.getEmail(),
                "rol",     target.getRol()
        ));
    }
}
