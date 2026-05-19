package com.checkautos.models;

import com.fasterxml.jackson.annotation.JsonIgnore;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;

@Document(collection = "usuarios")
public class User {

    @Id
    private String id;

    private String nombre;

    @Indexed(unique = true)
    private String email;

    @JsonIgnore
    private String password;

    private String initials;
    private String rol;

    public User() {}

    public User(String nombre, String email, String password) {
        this.nombre   = nombre;
        this.email    = email;
        this.password = password;
        this.initials = nombre != null && nombre.length() >= 2
                        ? nombre.substring(0, 2).toUpperCase() : "?";
        this.rol = "USUARIO";
    }

    public User(String nombre, String email, String password, String rol) {
        this(nombre, email, password);
        this.rol = rol;
    }

    public String getId()                    { return id; }
    public void   setId(String id)           { this.id = id; }

    public String getNombre()                { return nombre; }
    public void   setNombre(String nombre)   {
        this.nombre   = nombre;
        this.initials = nombre != null && nombre.length() >= 2
                        ? nombre.substring(0, 2).toUpperCase() : "?";
    }

    public String getEmail()                 { return email; }
    public void   setEmail(String email)     { this.email = email; }

    public String getUsername()              { return email; }
    public void   setUsername(String u)      { this.email = u; }

    public String getPassword()              { return password; }
    public void   setPassword(String p)      { this.password = p; }

    public String getInitials()              { return initials; }
    public void   setInitials(String i)      { this.initials = i; }

    public String getRol()                   { return rol != null ? rol : "USUARIO"; }
    public void   setRol(String rol)         { this.rol = rol; }

    public boolean isAdmin()                 { return "ADMIN".equals(this.rol); }

    @Override
    public String toString() {
        return "User{email='" + email + "', rol='" + rol + "'}";
    }
}
