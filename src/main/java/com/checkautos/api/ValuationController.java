package com.checkautos.api;

import com.checkautos.AppContext;
import com.checkautos.cars.ValuationManager;
import com.checkautos.models.Car;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/valuacion")
public class ValuationController {

    private final AppContext appContext;
    private final ValuationManager valuationManager;

    public ValuationController(AppContext appContext) {
        this.appContext = appContext;
        this.valuationManager = appContext.getValuationManager();
    }


    @PostMapping("/puntaje-tecnico")
    public ResponseEntity<?> calcularPuntajeTecnico(@RequestBody Map<String, Integer> body) {
        int buenos    = body.getOrDefault("buenos", 0);
        int regulares = body.getOrDefault("regulares", 0);
        int malos     = body.getOrDefault("malos", 0);

        int puntaje = valuationManager.calculateTechnicalScore(buenos, regulares, malos);
        String descripcion = valuationManager.getScoreDescription(puntaje);

        return ResponseEntity.ok(Map.of(
                "puntajeTecnico", puntaje,
                "descripcion", descripcion
        ));
    }


    @PostMapping("/puntaje-mecanico")
    public ResponseEntity<?> calcularPuntajeMecanico(@RequestBody Map<String, Integer> body) {
        int buenos    = body.getOrDefault("buenos", 0);
        int regulares = body.getOrDefault("regulares", 0);
        int malos     = body.getOrDefault("malos", 0);

        int puntaje = valuationManager.calculateMechanicalScore(buenos, regulares, malos);
        String descripcion = valuationManager.getScoreDescription(puntaje);

        return ResponseEntity.ok(Map.of(
                "puntajeMecanico", puntaje,
                "descripcion", descripcion
        ));
    }


    @PostMapping("/calcular")
    public ResponseEntity<?> calcularValuacion() {
        Car car = appContext.getCurrentCar();
        if (car == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "No hay un auto en edición. Llama primero a POST /api/autos/nuevo"));
        }

        int pt   = car.getPuntajeTecnico();
        int pm   = car.getPuntajeMecanico();
        int comb = valuationManager.calculateCombinedScore(pt, pm);
        int base = valuationManager.calculateBasePrice(car.getAño());
        int desc = valuationManager.getDiscountPercentage(comb);
        int final_ = valuationManager.calculateFinalPrice(base, desc);

        car.setPrecio(final_);

        return ResponseEntity.ok(Map.of(
                "puntajeTecnico",     pt,
                "puntajeMecanico",    pm,
                "puntajeCombinado",   comb,
                "descripcion",        valuationManager.getScoreDescription(comb),
                "precioBase",         base,
                "descuentoPorcentaje", desc,
                "precioFinal",        final_,
                "precioFormateado",   "$" + String.format("%,d", final_).replace(",", ".")
        ));
    }


    @GetMapping("/precio-base")
    public ResponseEntity<?> getPrecioBase(@RequestParam String año) {
        if (año == null || año.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Parámetro 'año' requerido"));
        }
        int base = valuationManager.calculateBasePrice(año);
        return ResponseEntity.ok(Map.of(
                "año", año,
                "precioBase", base,
                "precioFormateado", "$" + String.format("%,d", base).replace(",", ".")
        ));
    }
}