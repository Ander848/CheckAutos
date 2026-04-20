package com.checkautos.api;

import com.checkautos.models.Propietario;
import com.checkautos.repository.PropietarioRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/propietarios")
public class PropietarioController {

    private final PropietarioRepository propietarioRepository;

    public PropietarioController(PropietarioRepository propietarioRepository) {
        this.propietarioRepository = propietarioRepository;
    }


    @GetMapping("/cedula/{cedula}")
    public ResponseEntity<?> buscarPorCedula(@PathVariable String cedula) {
        Optional<Propietario> found = propietarioRepository.findByCedula(cedula.trim());
        if (found.isEmpty()) {
            return ResponseEntity.status(404)
                    .body(Map.of("encontrado", false, "mensaje", "Propietario no registrado"));
        }
        Propietario p = found.get();
        return ResponseEntity.ok(Map.of(
                "encontrado", true,
                "id",         p.getId(),
                "nombre",     p.getNombre(),
                "cedula",     p.getCedula(),
                "telefono",   p.getTelefono() != null ? p.getTelefono() : "",
                "email",      p.getEmail()    != null ? p.getEmail()    : ""
        ));
    }


    @PostMapping
    public ResponseEntity<?> crearOActualizar(@RequestBody Map<String, String> body) {
        String nombre   = body.get("nombre");
        String cedula   = body.get("cedula");
        String telefono = body.getOrDefault("telefono", "");
        String email    = body.getOrDefault("email", "");

        if (nombre == null || nombre.isBlank() || cedula == null || cedula.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "nombre y cedula son obligatorios"));
        }


        Optional<Propietario> existente = propietarioRepository.findByCedula(cedula.trim());
        Propietario p;

        if (existente.isPresent()) {

            p = existente.get();
            p.setNombre(nombre.trim());
            p.setTelefono(telefono.trim());
            p.setEmail(email.trim());
        } else {

            p = new Propietario(nombre.trim(), cedula.trim(), telefono.trim(), email.trim());
        }

        propietarioRepository.save(p);

        return ResponseEntity.ok(Map.of(
                "mensaje",  existente.isPresent() ? "Propietario actualizado" : "Propietario creado",
                "id",       p.getId(),
                "nombre",   p.getNombre(),
                "cedula",   p.getCedula()
        ));
    }


    @GetMapping("/buscar")
    public ResponseEntity<?> buscarPorNombre(@RequestParam String q) {
        if (q == null || q.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Parámetro q requerido"));
        }
        return ResponseEntity.ok(propietarioRepository.findByNombreContainingIgnoreCase(q.trim()));
    }
}