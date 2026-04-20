package com.checkautos.repository;

import com.checkautos.models.Car;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CarRepository extends MongoRepository<Car, String> {


    List<Car> findByArchivadoFalseOrderByIdDesc();


    List<Car> findByArchivadoTrueOrderByIdDesc();


    Optional<Car> findByPlacaAndArchivadoFalse(String placa);


    List<Car> findByEstadoAndArchivadoFalse(String estado);


    List<Car> findByArchivadoFalseAndMarcaContainingIgnoreCaseOrArchivadoFalseAndModeloContainingIgnoreCaseOrArchivadoFalseAndPlacaContainingIgnoreCase(
        String marca, String modelo, String placa);


    List<Car> findByPropietarioIdAndArchivadoFalse(String propietarioId);


    long countByEstadoAndArchivadoFalse(String estado);


    long countByArchivadoFalse();
}