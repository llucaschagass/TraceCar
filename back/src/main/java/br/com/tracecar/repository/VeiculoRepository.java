package br.com.tracecar.repository;

import br.com.tracecar.domain.Veiculo;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface VeiculoRepository extends JpaRepository<Veiculo, Long>, JpaSpecificationExecutor<Veiculo> {

    @EntityGraph(attributePaths = "areaAtual")
    Optional<Veiculo> findByChassiIgnoreCase(String chassi);

    @EntityGraph(attributePaths = "areaAtual")
    Optional<Veiculo> findByTagRfidIgnoreCase(String tagRfid);

    /** Trava a linha do veiculo para serializar leituras simultaneas do mesmo chassi. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select v from Veiculo v where v.id = :id")
    Optional<Veiculo> findByIdForUpdate(@Param("id") Long id);

    boolean existsByChassiIgnoreCase(String chassi);

    boolean existsByTagRfidIgnoreCase(String tagRfid);

    /** Busca parcial (ex.: ultimos 6-8 caracteres do chassi), priorizando quem termina com o termo. */
    @EntityGraph(attributePaths = "areaAtual")
    @Query("""
            select v from Veiculo v
            where upper(v.chassi) like concat('%', upper(:termo), '%')
            order by case when upper(v.chassi) like concat('%', upper(:termo)) then 0 else 1 end,
                     v.ultimaMovimentacaoEm desc nulls last
            """)
    List<Veiculo> buscarPorTrechoDoChassi(@Param("termo") String termo, Pageable pageable);

    @EntityGraph(attributePaths = "areaAtual")
    List<Veiculo> findByAreaAtualIdOrderByUltimaMovimentacaoEmAsc(Long areaId);

    @Override
    @EntityGraph(attributePaths = "areaAtual")
    Page<Veiculo> findAll(Specification<Veiculo> spec, Pageable pageable);
}
