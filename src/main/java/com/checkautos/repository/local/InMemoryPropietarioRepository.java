package com.checkautos.repository.local;

import com.checkautos.models.Propietario;
import com.checkautos.repository.PropietarioRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.*;
import org.springframework.data.repository.query.FluentQuery;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Repository
@Profile("local")
public class InMemoryPropietarioRepository implements PropietarioRepository {

    private final Map<String, Propietario> store = new LinkedHashMap<>();

    @Override
    public Optional<Propietario> findByCedula(String cedula) {
        return store.values().stream()
                .filter(p -> cedula.equals(p.getCedula()))
                .findFirst();
    }

    @Override
    public boolean existsByCedula(String cedula) {
        return store.values().stream().anyMatch(p -> cedula.equals(p.getCedula()));
    }

    @Override
    public List<Propietario> findByNombreContainingIgnoreCase(String nombre) {
        String n = nombre.toLowerCase();
        return store.values().stream()
                .filter(p -> p.getNombre() != null && p.getNombre().toLowerCase().contains(n))
                .collect(Collectors.toList());
    }

    @Override public <S extends Propietario> S save(S p) {
        if (p.getId() == null) p.setId(UUID.randomUUID().toString());
        store.put(p.getId(), p);
        return p;
    }
    @Override public List<Propietario> findAll() { return new ArrayList<>(store.values()); }
    @Override public Optional<Propietario> findById(String id) { return Optional.ofNullable(store.get(id)); }
    @Override public boolean existsById(String id) { return store.containsKey(id); }
    @Override public long count() { return store.size(); }
    @Override public void deleteById(String id) { store.remove(id); }
    @Override public void delete(Propietario p) { store.remove(p.getId()); }
    @Override public void deleteAll() { store.clear(); }
    @Override public <S extends Propietario> List<S> saveAll(Iterable<S> i) { i.forEach(this::save); return (List<S>) findAll(); }
    @Override public List<Propietario> findAllById(Iterable<String> ids) { List<Propietario> r = new ArrayList<>(); ids.forEach(id -> findById(id).ifPresent(r::add)); return r; }
    @Override public void deleteAll(Iterable<? extends Propietario> i) { i.forEach(this::delete); }
    @Override public void deleteAllById(Iterable<? extends String> ids) { ids.forEach(this::deleteById); }
    @Override public List<Propietario> findAll(Sort s) { return findAll(); }
    @Override public Page<Propietario> findAll(Pageable p) { return Page.empty(); }
    @Override public <S extends Propietario> Optional<S> findOne(Example<S> e) { return Optional.empty(); }
    @Override public <S extends Propietario> List<S> findAll(Example<S> e) { return Collections.emptyList(); }
    @Override public <S extends Propietario> List<S> findAll(Example<S> e, Sort s) { return Collections.emptyList(); }
    @Override public <S extends Propietario> Page<S> findAll(Example<S> e, Pageable p) { return Page.empty(); }
    @Override public <S extends Propietario> long count(Example<S> e) { return 0; }
    @Override public <S extends Propietario> boolean exists(Example<S> e) { return false; }
    @Override public <S extends Propietario, R> R findBy(Example<S> e, Function<FluentQuery.FetchableFluentQuery<S>, R> f) { return null; }
    @Override public <S extends Propietario> S insert(S s) { return save(s); }
    @Override public <S extends Propietario> List<S> insert(Iterable<S> i) { return (List<S>) saveAll(i); }
}
