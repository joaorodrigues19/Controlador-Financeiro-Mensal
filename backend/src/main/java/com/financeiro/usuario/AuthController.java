package com.financeiro.usuario;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@RestController
@RequestMapping("/api")
public class AuthController {

    public record CadastroRequest(@NotBlank String nome, @NotBlank @Email String email, @NotBlank @Size(min = 6) String senha) {}
    public record LoginRequest(@NotBlank String email, @NotBlank String senha) {}
    public record PerfilResponse(String nome, String email, List<String> categorias) {}
    public record TokenResponse(String token, PerfilResponse perfil) {}

    private final UsuarioRepository usuarios;
    private final PasswordEncoder encoder;
    private final JwtEncoder jwtEncoder;
    private final UsuarioAtual usuarioAtual;
    private final long expiracaoHoras;

    public AuthController(UsuarioRepository usuarios, PasswordEncoder encoder, JwtEncoder jwtEncoder,
                          UsuarioAtual usuarioAtual, @Value("${app.jwt.expiracao-horas}") long expiracaoHoras) {
        this.usuarios = usuarios;
        this.encoder = encoder;
        this.jwtEncoder = jwtEncoder;
        this.usuarioAtual = usuarioAtual;
        this.expiracaoHoras = expiracaoHoras;
    }

    @PostMapping("/auth/cadastro")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public TokenResponse cadastro(@Valid @RequestBody CadastroRequest req) {
        String email = req.email().trim().toLowerCase();
        if (usuarios.existsByEmailIgnoreCase(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Já existe uma conta com esse e-mail");
        }
        Usuario u = usuarios.save(new Usuario(req.nome().trim(), email, encoder.encode(req.senha())));
        return token(u);
    }

    @PostMapping("/auth/login")
    public TokenResponse login(@Valid @RequestBody LoginRequest req) {
        Usuario u = usuarios.findByEmailIgnoreCase(req.email().trim())
            .filter(x -> encoder.matches(req.senha(), x.getSenhaHash()))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "E-mail ou senha incorretos"));
        return token(u);
    }

    @GetMapping("/perfil")
    public PerfilResponse perfil() {
        return perfil(usuarioAtual.get());
    }

    @PutMapping("/perfil/categorias")
    @Transactional
    public PerfilResponse categorias(@RequestBody List<String> categorias) {
        Usuario u = usuarioAtual.get();
        u.getCategorias().clear();
        categorias.stream().map(String::trim).filter(c -> !c.isEmpty()).distinct().forEach(u.getCategorias()::add);
        return perfil(u);
    }

    private PerfilResponse perfil(Usuario u) {
        return new PerfilResponse(u.getNome(), u.getEmail(), List.copyOf(u.getCategorias()));
    }

    private TokenResponse token(Usuario u) {
        Instant agora = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
            .subject(String.valueOf(u.getId()))
            .issuedAt(agora)
            .expiresAt(agora.plus(expiracaoHoras, ChronoUnit.HOURS))
            .claim("nome", u.getNome())
            .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        String token = jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
        return new TokenResponse(token, perfil(u));
    }
}
