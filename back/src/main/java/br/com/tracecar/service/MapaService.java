package br.com.tracecar.service;

import br.com.tracecar.domain.Area;
import br.com.tracecar.domain.StatusVeiculo;
import br.com.tracecar.domain.Veiculo;
import br.com.tracecar.repository.AreaRepository;
import br.com.tracecar.repository.VeiculoRepository;
import br.com.tracecar.web.dto.MapaDtos.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class MapaService {

    private final AreaRepository areaRepository;
    private final VeiculoRepository veiculoRepository;
    private final AreaService areaService;

    public MapaService(AreaRepository areaRepository, VeiculoRepository veiculoRepository, AreaService areaService) {
        this.areaService = areaService;
        this.areaRepository = areaRepository;
        this.veiculoRepository = veiculoRepository;
    }

    @Transactional(readOnly = true)
    public MapaResponse mapa(boolean incluirVeiculos) {
        Instant agora = Instant.now();
        List<Veiculo> emCirculacao = veiculoRepository.findAll((root, q, cb) ->
                cb.equal(root.get("status"), StatusVeiculo.EM_PRODUCAO));

        Map<Long, List<Veiculo>> porArea = emCirculacao.stream()
                .filter(v -> v.getAreaAtual() != null)
                .collect(Collectors.groupingBy(v -> v.getAreaAtual().getId()));

        List<MapaAreaResponse> areas = areaRepository.findByAtivaTrueOrderByOrdemFluxoAsc().stream()
                .map(a -> montarArea(a, porArea.getOrDefault(a.getId(), List.of()), agora, incluirVeiculos))
                .toList();
        return new MapaResponse(agora, emCirculacao.size(), areas);
    }

    @Transactional(readOnly = true)
    public MapaAreaResponse area(Long areaId) {
        Area area = areaService.obter(areaId);
        List<Veiculo> veiculos = veiculoRepository.findByAreaAtualIdOrderByUltimaMovimentacaoEmAsc(areaId);
        return montarArea(area, veiculos, Instant.now(), true);
    }

    private MapaAreaResponse montarArea(Area a, List<Veiculo> veiculos, Instant agora, boolean incluirVeiculos) {
        long ocupacao = veiculos.size();
        double percentual = Math.round(ocupacao * 1000.0 / a.getCapacidade()) / 10.0;
        SituacaoOcupacao situacao = percentual >= 90 ? SituacaoOcupacao.CRITICA
                : percentual >= 70 ? SituacaoOcupacao.ATENCAO : SituacaoOcupacao.NORMAL;

        List<VeiculoNaAreaResponse> lista = veiculos.stream()
                .filter(v -> v.getUltimaMovimentacaoEm() != null)
                .map(v -> new VeiculoNaAreaResponse(v.getChassi(), v.getModelo(), v.getVersao(), v.getCor(),
                        v.getUltimaMovimentacaoEm(), Duration.between(v.getUltimaMovimentacaoEm(), agora).toMinutes()))
                .sorted((x, y) -> Long.compare(y.minutosNaArea(), x.minutosNaArea()))
                .toList();
        Long media = lista.isEmpty() ? null
                : Math.round(lista.stream().mapToLong(VeiculoNaAreaResponse::minutosNaArea).average().orElse(0));

        return new MapaAreaResponse(a.getId(), a.getCodigo(), a.getNome(), a.getOrdemFluxo(), a.getPosX(), a.getPosY(),
                a.getCapacidade(), ocupacao, percentual, situacao, media, incluirVeiculos ? lista : null);
    }
}
