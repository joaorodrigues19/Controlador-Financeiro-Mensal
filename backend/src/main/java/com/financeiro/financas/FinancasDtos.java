package com.financeiro.financas;

import java.math.BigDecimal;
import java.util.List;

import com.financeiro.financas.Lancamento.Status;
import com.financeiro.financas.Lancamento.Tipo;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

public final class FinancasDtos {

    private FinancasDtos() {
    }

    public record LancamentoDto(String id, String item, String cat, Tipo tipo, BigDecimal valor, int dia,
                                Status status, String cartao, String parc, String grupo, boolean auto) {
        static LancamentoDto de(Lancamento l) {
            return new LancamentoDto(String.valueOf(l.getId()), l.getItem(), l.getCat(), l.getTipo(), l.getValor(),
                l.getDia(), l.getStatus(), l.getCartao(), l.getParc(), l.getGrupo(), l.isAuto());
        }
    }

    public record MesDto(String chave, BigDecimal bruto, BigDecimal liquido, BigDecimal extra, String extraObs,
                         List<LancamentoDto> itens) {
        static MesDto de(Mes m) {
            return new MesDto(m.getChave(), m.getBruto(), m.getLiquido(), m.getExtra(), m.getExtraObs(),
                m.getItens().stream().map(LancamentoDto::de).toList());
        }
    }

    public record RendaRequest(@PositiveOrZero BigDecimal bruto, @PositiveOrZero BigDecimal liquido,
                               @PositiveOrZero BigDecimal extra, String extraObs) {}

    /** Novo lançamento; quando o tipo é Parcelado, {@code valor} é o total e é dividido em {@code parcelas} meses. */
    public record NovoLancamento(@NotBlank String item, @NotNull @DecimalMin("0.01") BigDecimal valor,
                                 @NotBlank String cat, @NotNull Tipo tipo, @Min(1) @Max(31) int dia,
                                 @NotNull Status status, String cartao, Integer parcelas) {}

    public record AtualizaLancamento(@NotBlank String item, BigDecimal valor, @NotBlank String cat,
                                     @NotNull Tipo tipo, @Min(1) @Max(31) int dia, @NotNull Status status,
                                     String cartao) {}

    public record Contagem(int quantidade) {}
}
