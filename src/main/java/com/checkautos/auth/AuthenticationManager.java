package com.checkautos.auth;

import com.checkautos.models.User;
import com.checkautos.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class AuthenticationManager {

    private final UserRepository userRepository;
    private User currentUser;

    public AuthenticationManager(UserRepository userRepository) {
        this.userRepository = userRepository;
        this.currentUser    = null;
        initializeDefaultAccounts();
    }


    private void initializeDefaultAccounts() {
        crearSiNoExiste("Ander",   "ander@checkautos.com",   "1234");
        crearSiNoExiste("William", "william@checkautos.com", "1234");
        crearSiNoExiste("Daniela", "daniela@checkautos.com", "1234");
    }

    private void crearSiNoExiste(String nombre, String email, String password) {
        if (!userRepository.existsByEmail(email)) {
            userRepository.save(new User(nombre, email, password));
        }
    }


    public boolean login(String email, String password) {
        if (email == null || email.isBlank() || password == null || password.isBlank()) return false;
        Optional<User> found = userRepository.findByEmail(email.trim().toLowerCase());
        if (found.isPresent() && found.get().getPassword().equals(password.trim())) {
            this.currentUser = found.get();
            return true;
        }
        return false;
    }


    public boolean createAccount(String nombre, String email, String password) {
        if (nombre == null || nombre.isBlank() ||
            email == null || email.isBlank() ||
            password == null || password.isBlank()) return false;
        if (password.length() < 4) return false;
        if (!email.contains("@") || !email.contains(".")) return false;
        if (userRepository.existsByEmail(email.trim().toLowerCase())) return false;
        userRepository.save(new User(nombre.trim(), email.trim().toLowerCase(), password.trim()));
        return true;
    }

    public void   logout()              { this.currentUser = null; }
    public User   getCurrentUser()      { return currentUser; }
    public boolean isAuthenticated()    { return currentUser != null; }
    public List<User> getAllAccounts()  { return userRepository.findAll(); }

    public boolean validatePassword(String password) {
        return password != null && password.length() >= 4;
    }

    public boolean usernameExists(String email) {
        return userRepository.existsByEmail(email);
    }
}