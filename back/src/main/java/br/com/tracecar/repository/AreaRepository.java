package br.com.tracecar.repository;

import br.com.tracecar.domain.Area;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AreaRepository extends JpaRepository<Area, Long> {

    Optional<Area> findByCodigoIgnoreCase(String codigo);

    boolean existsByCodigoIgnoreCase(String codigo);

    List<Area> findAllByOrderByOrdemFluxoAsc();

    List<Area> findByAtivaTrueOrderByOrdemFluxoAsc();
}
