package com.checkautos.models;

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

    private String password;
    private String initials;

    public User() {}

    public User(String nombre, String email, String password) {
        this.nombre   = nombre;
        this.email    = email;
        this.password = password;
        this.initials = nombre != null && nombre.length() >= 2
                        ? nombre.substring(0, 2).toUpperCase() : "?";
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

    @Override
    public String toString() {
        return "User{email='" + email + "', nombre='" + nombre + "'}";
    }
}