package com.checkautos.auth;

import com.checkautos.models.User;
import com.checkautos.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class AuthenticationManager {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private User currentUser;

    public AuthenticationManager(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository  = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.currentUser     = null;
        initializeDefaultAccounts();
    }

    private void initializeDefaultAccounts() {
        crearSiNoExiste("Ander",   "ander@checkautos.com",   "ander848",   "ADMIN");
        crearSiNoExiste("William", "william@checkautos.com", "william848", "ADMIN");
        crearSiNoExiste("Daniela", "daniela@checkautos.com", "daniela848", "ADMIN");
    }

    private void crearSiNoExiste(String nombre, String email, String password, String rol) {
        if (!userRepository.existsByEmail(email)) {
            User u = new User(nombre, email, passwordEncoder.encode(password), rol);
            userRepository.save(u);
        }
    }

    public boolean login(String email, String password) {
        if (email == null || email.isBlank() || password == null || password.isBlank()) return false;
        Optional<User> found = userRepository.findByEmail(email.trim().toLowerCase());
        if (found.isPresent() && passwordEncoder.matches(password.trim(), found.get().getPassword())) {
            this.currentUser = found.get();
            return true;
        }
        return false;
    }

    public boolean createAccount(String nombre, String email, String password) {
        return createAccount(nombre, email, password, "USUARIO");
    }

    public boolean createAccount(String nombre, String email, String password, String rol) {
        if (nombre == null || nombre.isBlank() ||
            email == null || email.isBlank() ||
            password == null || password.isBlank()) return false;
        if (password.length() < 4) return false;
        if (!email.contains("@") || !email.contains(".")) return false;
        if (userRepository.existsByEmail(email.trim().toLowerCase())) return false;

        User u = new User(nombre.trim(), email.trim().toLowerCase(),
                          passwordEncoder.encode(password.trim()), rol);
        userRepository.save(u);
        return true;
    }

    public void   logout()             { this.currentUser = null; }
    public User   getCurrentUser()     { return currentUser; }
    public boolean isAuthenticated()   { return currentUser != null; }
    public List<User> getAllAccounts() { return userRepository.findAll(); }

    public boolean validatePassword(String password) {
        return password != null && password.length() >= 4;
    }

    public boolean usernameExists(String email) {
        return userRepository.existsByEmail(email);
    }

    public User guardarUsuario(User user) {
        return userRepository.save(user);
    }
}
