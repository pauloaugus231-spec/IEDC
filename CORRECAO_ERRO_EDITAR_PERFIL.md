# Correção de Erros 500 e 400 ao Editar Perfil

## Problema Identificado

Ao editar o perfil de uma pessoa e salvar, apareciam os seguintes erros:
- **500 Internal Server Error** 
- **400 Bad Request**

## Causa Raiz

O **ValidationPipe** global do NestJS estava configurado com `forbidNonWhitelisted: true`, o que causava erro 400 quando o frontend enviava campos extras como:
- `estadias` (array de relacionamento)
- `created_at` (campo read-only)
- `updated_at` (campo read-only)
- `bloqueios` (array de relacionamento)

## Solução Aplicada

### 1. Configuração do ValidationPipe (`backend/src/main.ts`)

**ANTES:**
```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true, // ❌ Causava erro 400
  }),
);
```

**DEPOIS:**
```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true, // Remove campos não definidos no DTO
    transform: true, // Transforma payloads em instâncias de DTO
    forbidNonWhitelisted: false, // ✅ Ignora campos extras sem retornar erro
  }),
);
```

### 2. Proteção Adicional no Service (`backend/src/modules/pessoas/pessoas.service.ts`)

Adicionada proteção extra para garantir que campos sensíveis não sejam atualizados:

```typescript
async update(id: string, updatePessoaDto: UpdatePessoaDto): Promise<Pessoa> {
  const pessoa = await this.findOne(id);
  
  // Remover campos que não devem ser atualizados diretamente
  const { estadias, bloqueios, created_at, updated_at, id: _, ...dadosPermitidos } = updatePessoaDto as any;
  
  Object.assign(pessoa, dadosPermitidos);
  
  return this.pessoaRepository.save(pessoa);
}
```

## Como Testar

1. **Reinicie o backend** para aplicar as mudanças:
   ```bash
   cd backend
   npm run start:dev
   ```

2. **Teste no frontend**:
   - Abra o perfil de uma pessoa
   - Clique em "Editar Perfil"
   - Altere qualquer campo
   - Clique em "Salvar"
   - ✅ Deve salvar sem erros

3. **Teste via API**:
   ```bash
   curl -X PATCH http://localhost:3001/api/pessoas/{ID} \
     -H "Content-Type: application/json" \
     -d '{"nome": "Novo Nome", "telefone": "(11) 98765-4321"}'
   ```

## Arquivos Modificados

- ✅ `backend/src/main.ts` - Configuração do ValidationPipe
- ✅ `backend/src/modules/pessoas/pessoas.service.ts` - Proteção extra no update

## Status

✅ **RESOLVIDO** - Após reiniciar o backend, a edição de perfil deve funcionar perfeitamente.

## Observações

- O `whitelist: true` mantém a segurança removendo campos não permitidos
- O `forbidNonWhitelisted: false` evita erros quando o frontend envia dados completos (incluindo relações)
- A proteção no service garante que campos sensíveis nunca sejam atualizados acidentalmente
