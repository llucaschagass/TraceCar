package br.com.tracecar.repository;

import br.com.tracecar.domain.Movimentacao;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface MovimentacaoRepository extends JpaRepository<Movimentacao, Long>, JpaSpecificationExecutor<Movimentacao> {

    @EntityGraph(attributePaths = {"area", "pontoLeitura"})
    List<Movimentacao> findByVeiculoIdOrderByEntradaEmAsc(Long veiculoId);

    @EntityGraph(attributePaths = {"area"})
    Optional<Movimentacao> findFirstByVeiculoIdAndSaidaEmIsNull(Long veiculoId);

    @Override
    @EntityGraph(attributePaths = {"veiculo", "area", "pontoLeitura"})
    Page<Movimentacao> findAll(Specification<Movimentacao> spec, Pageable pageable);
}
