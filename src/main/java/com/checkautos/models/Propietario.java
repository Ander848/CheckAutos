package com.checkautos.models;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;

@Document(collection = "propietarios")
public class Propietario {

    @Id
    private String id;

    private String nombre;

    @Indexed(unique = true)
    private String cedula;

    private String telefono;
    private String email;

    public Propietario() {}

    public Propietario(String nombre, String cedula, String telefono, String email) {
        this.nombre   = nombre;
        this.cedula   = cedula;
        this.telefono = telefono;
        this.email    = email;
    }

    public String getId()                        { return id; }
    public void   setId(String id)               { this.id = id; }
    public String getNombre()                    { return nombre; }
    public void   setNombre(String nombre)       { this.nombre = nombre; }
    public String getCedula()                    { return cedula; }
    public void   setCedula(String cedula)       { this.cedula = cedula; }
    public String getTelefono()                  { return telefono; }
    public void   setTelefono(String telefono)   { this.telefono = telefono; }
    public String getEmail()                     { return email; }
    public void   setEmail(String email)         { this.email = email; }

    @Override
    public String toString() {
        return "Propietario{cedula='" + cedula + "', nombre='" + nombre + "'}";
    }
}