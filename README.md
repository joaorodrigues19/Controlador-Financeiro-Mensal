# Controle Financeiro

Controle financeiro pessoal: renda do mês, lançamentos (fixos, variáveis, parcelados e eventuais), fatura do cartão, dízimo automático e visão do ano.

- `backend/`: Java 21, Spring Boot 4, Spring Security (JWT), JPA e PostgreSQL
- `frontend/`: Angular 22

## Rodando o back-end

1. Crie o banco no PostgreSQL:

   ```sql
   CREATE DATABASE financeiro;
   ```

2. Em `backend/config/local.properties` (fora do Git), informe a senha do banco e um segredo para o JWT:

   ```properties
   spring.datasource.password=sua-senha
   app.jwt.secret=um-segredo-com-pelo-menos-32-caracteres
   ```

3. Suba a API na porta 8080:

   ```bash
   cd backend
   ./mvnw spring-boot:run
   ```

## API

| Método | Rota | O que faz |
|---|---|---|
| POST | `/api/auth/cadastro` | Cria a conta e devolve o token |
| POST | `/api/auth/login` | Entra com e-mail e senha |
| GET | `/api/perfil` | Nome, e-mail e categorias |
| PUT | `/api/perfil/categorias` | Salva a lista de categorias |
| GET | `/api/meses` | Todos os meses com seus lançamentos |
| PUT | `/api/meses/{AAAA-MM}/renda` | Bruto, líquido e extra (gera o dízimo de 10% do bruto) |
| POST | `/api/meses/{AAAA-MM}/itens` | Novo lançamento (parcelado se espalha pelos meses seguintes) |
| PUT | `/api/meses/{AAAA-MM}/itens/{id}` | Edita um lançamento |
| POST | `/api/meses/{AAAA-MM}/itens/{id}/pagamento` | Alterna pago/pendente |
| POST | `/api/meses/{AAAA-MM}/faturas/{cartao}/pagamento` | Alterna a fatura inteira do cartão |
| DELETE | `/api/meses/{AAAA-MM}/itens/{id}?futuras=true` | Exclui, opcionalmente com as próximas parcelas |
| POST | `/api/meses/{AAAA-MM}/copiar-anterior` | Traz as contas recorrentes do mês anterior |
