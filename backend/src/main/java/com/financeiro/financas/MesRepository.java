package com.financeiro.financas;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MesRepository extends JpaRepository<Mes, Long> {

    @EntityGraph(attributePaths = "itens")
    List<Mes> findByUsuarioIdOrderByChave(Long usuarioId);

    @EntityGraph(attributePaths = "itens")
    Optional<Mes> findByUsuarioIdAndChave(Long usuarioId, String chave);
}
