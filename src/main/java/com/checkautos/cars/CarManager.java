package com.checkautos.cars;

import com.checkautos.models.Car;
import com.checkautos.models.Propietario;
import com.checkautos.repository.CarRepository;
import com.checkautos.repository.PropietarioRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class CarManager {

    private final CarRepository        carRepository;
    private final PropietarioRepository propietarioRepository;
    private Car currentCar;

    public CarManager(CarRepository carRepository, PropietarioRepository propietarioRepository) {
        this.carRepository         = carRepository;
        this.propietarioRepository = propietarioRepository;
        this.currentCar            = new Car();
    }

    public void startNewCarRegistration() { this.currentCar = new Car(); }
    public Car  getCurrentCar()           { return currentCar; }
    public void clearCurrentCar()         { startNewCarRegistration(); }


    public boolean saveAndRegisterCar() {
        if (!validateCarData(currentCar)) return false;


        if (currentCar.getCedula() != null && !currentCar.getCedula().isBlank()) {
            String cedula = currentCar.getCedula().trim();
            Optional<Propietario> existente = propietarioRepository.findByCedula(cedula);

            Propietario p;
            if (existente.isPresent()) {

                p = existente.get();
                if (currentCar.getPropietario() != null) p.setNombre(currentCar.getPropietario());
            } else {

                p = new Propietario(
                    currentCar.getPropietario(),
                    cedula,
                    null,
                    null
                );
            }
            propietarioRepository.save(p);
            currentCar.setPropietarioId(p.getId());
        }

        carRepository.save(currentCar);
        startNewCarRegistration();
        return true;
    }

    private boolean validateCarData(Car car) {
        return car.getMarca()  != null && !car.getMarca().isBlank() &&
               car.getModelo() != null && !car.getModelo().isBlank() &&
               car.getPlaca()  != null && !car.getPlaca().isBlank();
    }


    public List<Car> getAllCars() {
        return carRepository.findByArchivadoFalseOrderByIdDesc();
    }

    public Car getCarById(String id) {
        return carRepository.findById(id).orElse(null);
    }

    public List<Car> searchCars(String term) {
        return carRepository
            .findByArchivadoFalseAndMarcaContainingIgnoreCaseOrArchivadoFalseAndModeloContainingIgnoreCaseOrArchivadoFalseAndPlacaContainingIgnoreCase(
                term, term, term);
    }


    public boolean changeCarStatus(String carId, String newStatus) {
        Optional<Car> found = carRepository.findById(carId);
        if (found.isEmpty()) return false;
        Car car = found.get();
        car.setEstado(newStatus);
        carRepository.save(car);
        return true;
    }


    public boolean archivarAuto(String carId) {
        Optional<Car> found = carRepository.findById(carId);
        if (found.isEmpty()) return false;
        Car car = found.get();
        car.setArchivado(true);
        carRepository.save(car);
        return true;
    }


    public boolean restaurarAuto(String carId) {
        Optional<Car> found = carRepository.findById(carId);
        if (found.isEmpty()) return false;
        Car car = found.get();
        car.setArchivado(false);
        carRepository.save(car);
        return true;
    }


    public List<Car> getAutosArchivados() {
        return carRepository.findByArchivadoTrueOrderByIdDesc();
    }


    public List<Car> getAutosPorPropietario(String propietarioId) {
        return carRepository.findByPropietarioIdAndArchivadoFalse(propietarioId);
    }

    public int getTotalCars()      { return (int) carRepository.countByArchivadoFalse(); }
    public int getAvailableCars()  { return (int) carRepository.countByEstadoAndArchivadoFalse("Disponible"); }
    public int getSoldCars()       { return (int) carRepository.countByEstadoAndArchivadoFalse("Vendido"); }
    public int getCarsInReview()   { return (int) carRepository.countByEstadoAndArchivadoFalse("En revisión"); }

    public List<Car> getRecentCars(int limit) {
        List<Car> all = carRepository.findByArchivadoFalseOrderByIdDesc();
        return all.subList(0, Math.min(limit, all.size()));
    }
}