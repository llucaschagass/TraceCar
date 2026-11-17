package br.com.tracecar.repository;

import br.com.tracecar.domain.PontoLeitura;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PontoLeituraRepository extends JpaRepository<PontoLeitura, Long> {

    @EntityGraph(attributePaths = "area")
    Optional<PontoLeitura> findByCodigoIgnoreCase(String codigo);

    @EntityGraph(attributePaths = "area")
    Optional<PontoLeitura> findWithAreaById(Long id);

    boolean existsByCodigoIgnoreCase(String codigo);

    @EntityGraph(attributePaths = "area")
    List<PontoLeitura> findAllByOrderByCodigoAsc();

    @EntityGraph(attributePaths = "area")
    List<PontoLeitura> findByAreaIdOrderByCodigoAsc(Long areaId);

    Optional<PontoLeitura> findFirstByAreaIdAndTipoAndAtivoTrue(Long areaId, br.com.tracecar.domain.TipoPontoLeitura tipo);
}
