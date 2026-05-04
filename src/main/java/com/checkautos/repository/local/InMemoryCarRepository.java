package com.checkautos.repository.local;

import com.checkautos.models.Car;
import com.checkautos.repository.CarRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.*;
import org.springframework.data.repository.query.FluentQuery;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Repository
@Profile("local")
public class InMemoryCarRepository implements CarRepository {

    private final Map<String, Car> store = new LinkedHashMap<>();

    @Override
    public List<Car> findByArchivadoFalseOrderByIdDesc() {
        return store.values().stream()
                .filter(c -> !c.isArchivado())
                .sorted(Comparator.comparing(Car::getId).reversed())
                .collect(Collectors.toList());
    }

    @Override
    public List<Car> findByArchivadoTrueOrderByIdDesc() {
        return store.values().stream()
                .filter(Car::isArchivado)
                .sorted(Comparator.comparing(Car::getId).reversed())
                .collect(Collectors.toList());
    }

    @Override
    public Optional<Car> findByPlacaAndArchivadoFalse(String placa) {
        return store.values().stream()
                .filter(c -> !c.isArchivado() && placa.equals(c.getPlaca()))
                .findFirst();
    }

    @Override
    public List<Car> findByEstadoAndArchivadoFalse(String estado) {
        return store.values().stream()
                .filter(c -> !c.isArchivado() && estado.equals(c.getEstado()))
                .collect(Collectors.toList());
    }

    @Override
    public List<Car> findByArchivadoFalseAndMarcaContainingIgnoreCaseOrArchivadoFalseAndModeloContainingIgnoreCaseOrArchivadoFalseAndPlacaContainingIgnoreCase(
            String marca, String modelo, String placa) {
        String m = marca.toLowerCase(), mo = modelo.toLowerCase(), p = placa.toLowerCase();
        return store.values().stream()
                .filter(c -> !c.isArchivado() && (
                        (c.getMarca()  != null && c.getMarca().toLowerCase().contains(m))  ||
                        (c.getModelo() != null && c.getModelo().toLowerCase().contains(mo)) ||
                        (c.getPlaca()  != null && c.getPlaca().toLowerCase().contains(p))))
                .collect(Collectors.toList());
    }

    @Override
    public List<Car> findByPropietarioIdAndArchivadoFalse(String propietarioId) {
        return store.values().stream()
                .filter(c -> !c.isArchivado() && propietarioId.equals(c.getPropietarioId()))
                .collect(Collectors.toList());
    }

    @Override
    public long countByEstadoAndArchivadoFalse(String estado) {
        return store.values().stream()
                .filter(c -> !c.isArchivado() && estado.equals(c.getEstado()))
                .count();
    }

    @Override
    public long countByArchivadoFalse() {
        return store.values().stream().filter(c -> !c.isArchivado()).count();
    }

    @Override public <S extends Car> S save(S c) {
        if (c.getId() == null) c.setId(UUID.randomUUID().toString());
        store.put(c.getId(), c);
        return c;
    }
    @Override public List<Car> findAll() { return new ArrayList<>(store.values()); }
    @Override public Optional<Car> findById(String id) { return Optional.ofNullable(store.get(id)); }
    @Override public boolean existsById(String id) { return store.containsKey(id); }
    @Override public long count() { return store.size(); }
    @Override public void deleteById(String id) { store.remove(id); }
    @Override public void delete(Car c) { store.remove(c.getId()); }
    @Override public void deleteAll() { store.clear(); }
    @Override public <S extends Car> List<S> saveAll(Iterable<S> i) { i.forEach(this::save); return (List<S>) findAll(); }
    @Override public List<Car> findAllById(Iterable<String> ids) { List<Car> r = new ArrayList<>(); ids.forEach(id -> findById(id).ifPresent(r::add)); return r; }
    @Override public void deleteAll(Iterable<? extends Car> i) { i.forEach(this::delete); }
    @Override public void deleteAllById(Iterable<? extends String> ids) { ids.forEach(this::deleteById); }
    @Override public List<Car> findAll(Sort s) { return findAll(); }
    @Override public Page<Car> findAll(Pageable p) { return Page.empty(); }
    @Override public <S extends Car> Optional<S> findOne(Example<S> e) { return Optional.empty(); }
    @Override public <S extends Car> List<S> findAll(Example<S> e) { return Collections.emptyList(); }
    @Override public <S extends Car> List<S> findAll(Example<S> e, Sort s) { return Collections.emptyList(); }
    @Override public <S extends Car> Page<S> findAll(Example<S> e, Pageable p) { return Page.empty(); }
    @Override public <S extends Car> long count(Example<S> e) { return 0; }
    @Override public <S extends Car> boolean exists(Example<S> e) { return false; }
    @Override public <S extends Car, R> R findBy(Example<S> e, Function<FluentQuery.FetchableFluentQuery<S>, R> f) { return null; }
    @Override public <S extends Car> S insert(S s) { return save(s); }
    @Override public <S extends Car> List<S> insert(Iterable<S> i) { return (List<S>) saveAll(i); }
}
