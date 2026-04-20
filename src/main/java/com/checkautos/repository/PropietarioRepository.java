package com.checkautos.repository;

import com.checkautos.models.Propietario;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PropietarioRepository extends MongoRepository<Propietario, String> {


    Optional<Propietario> findByCedula(String cedula);


    boolean existsByCedula(String cedula);


    java.util.List<Propietario> findByNombreContainingIgnoreCase(String nombre);
}