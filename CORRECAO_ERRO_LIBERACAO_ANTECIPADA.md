# 🔧 Correção: Erro 500 ao Liberar Pessoa Antecipadamente

**Data:** 09/01/2026  
**Erro:** `column Bloqueio.liberado_por does not exist`  
**Status:** ⚠️ REQUER AÇÃO MANUAL

---

## 📋 Descrição do Problema

### Erro Identificado
```
QueryFailedError: column Bloqueio.liberado_por does not exist
```

Ao tentar liberar uma pessoa antecipadamente, o sistema retornava erro 500 porque:
- A **entidade TypeORM** tem o campo `liberado_por` definido
- A **tabela no banco de dados** NÃO tem essa coluna

### Impacto
- ❌ Impossível liberar pessoas antecipadamente
- ❌ Erro 500 no endpoint `/api/pessoas/:id/liberar-antecipadamente`
- ❌ Bloqueio de funcionalidade crítica

---

## ✅ Solução

### Migration SQL Criada
Arquivo: `backend/database/add_liberado_por_column.sql`

```sql
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bloqueios' 
        AND column_name = 'liberado_por'
    ) THEN
        ALTER TABLE bloqueios 
        ADD COLUMN liberado_por VARCHAR(100);
        
        RAISE NOTICE 'Coluna liberado_por adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna liberado_por já existe';
    END IF;
END $$;
```

---

## 🚀 Como Aplicar a Correção

### Opção 1: Via Docker Desktop (RECOMENDADO)

1. **Abra o Docker Desktop**
2. **Encontre o container do banco:** `dias-da-cruz-db-1` ou similar
3. **Clique em "Exec" ou "CLI"** para abrir terminal
4. **Execute:**
   ```bash
   psql -U postgres -d postgres
   ```

5. **Cole e execute o SQL:**
   ```sql
   ALTER TABLE bloqueios ADD COLUMN liberado_por VARCHAR(100);
   ```

6. **Verifique:**
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'bloqueios' 
   AND column_name = 'liberado_por';
   ```

7. **Saia:**
   ```sql
   \q
   ```

### Opção 2: Via Terminal (se Docker CLI estiver configurado)

```bash
# Conectar ao container
docker exec -it dias-da-cruz-db-1 psql -U postgres -d postgres

# Executar o ALTER TABLE
ALTER TABLE bloqueios ADD COLUMN liberado_por VARCHAR(100);

# Verificar
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'bloqueios' AND column_name = 'liberado_por';

# Sair
\q
```

### Opção 3: Via Ferramenta GUI (pgAdmin, DBeaver, etc.)

1. Conecte-se ao banco PostgreSQL
2. Execute o SQL:
   ```sql
   ALTER TABLE bloqueios ADD COLUMN liberado_por VARCHAR(100);
   ```

---

## 🧪 Como Testar Após Aplicar

### Teste 1: Verificar Coluna
```sql
SELECT column_name, data_type, character_maximum_length, is_nullable
FROM information_schema.columns
WHERE table_name = 'bloqueios'
AND column_name = 'liberado_por';
```

**Resultado Esperado:**
```
column_name  | data_type         | character_maximum_length | is_nullable
-------------|-------------------|--------------------------|-------------
liberado_por | character varying | 100                      | YES
```

### Teste 2: Liberar Pessoa Antecipadamente (Frontend)

1. Acesse uma pessoa com bloqueio ativo
2. Clique em "Liberar Antecipadamente"
3. Confirme a liberação

**Resultado Esperado:**
- ✅ Status 200
- ✅ Bloqueio marcado como `ativo: false`
- ✅ Campo `liberado_por` preenchido
- ✅ Pessoa liberada com sucesso

### Teste 3: Verificar via API (curl)

```bash
# Listar bloqueios de uma pessoa
curl http://localhost:3001/api/pessoas/{id}/bloqueios

# Liberar antecipadamente
curl -X POST http://localhost:3001/api/pessoas/{id}/liberar-antecipadamente \
  -H "Content-Type: application/json" \
  -d '{"funcionario": "Admin"}'
```

---

## 📊 Estrutura da Tabela Bloqueios (Após Correção)

```sql
CREATE TABLE bloqueios (
    id UUID PRIMARY KEY,
    pessoa_id UUID NOT NULL,
    tipo VARCHAR NOT NULL,
    motivo TEXT NOT NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE,
    dias_bloqueio INTEGER,
    criado_por VARCHAR(100) NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    observacoes TEXT,
    liberacao_antecipada BOOLEAN DEFAULT FALSE,
    data_liberacao_antecipada TIMESTAMP,
    liberado_por VARCHAR(100),  -- ✅ NOVA COLUNA
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔍 Código Envolvido

### Entity (bloqueio.entity.ts)
```typescript
@Column({ length: 100, nullable: true })
liberado_por?: string;  // ✅ Já estava definido
```

### Service (pessoas.service.ts)
```typescript
async liberarAntecipadamente(pessoa_id: string, funcionario?: string) {
  // ...
  for (const bloqueio of bloqueiosAtivos) {
    bloqueio.ativo = false;
    bloqueio.liberacao_antecipada = true;
    bloqueio.data_liberacao_antecipada = new Date();
    bloqueio.liberado_por = funcionario || 'sistema';  // ✅ Usa a coluna
    await this.bloqueioRepository.save(bloqueio);
  }
  // ...
}
```

---

## ⚠️ Importante

### Por que o erro ocorreu?
- A entidade foi atualizada com o campo `liberado_por`
- O banco de dados não foi migrado automaticamente
- TypeORM não gera migrations automáticas (modo `synchronize: false`)

### Como evitar no futuro?
1. **Sempre criar migrations** ao adicionar colunas
2. **Testar em desenvolvimento** antes de produção
3. **Verificar sincronização** entre entidade e banco

---

## ✅ Checklist de Validação

Após aplicar a correção, verifique:

- [ ] Coluna `liberado_por` existe na tabela `bloqueios`
- [ ] Tipo de dado: `VARCHAR(100)`
- [ ] Nullable: `YES`
- [ ] Backend não apresenta mais erro 500
- [ ] Liberação antecipada funciona no frontend
- [ ] Campo `liberado_por` é preenchido corretamente

---

## 📞 Logs de Verificação

### Antes da Correção
```
[Nest] 45077  - 09/01/2026, 20:03:05   ERROR [ExceptionsHandler] 
column Bloqueio.liberado_por does not exist
QueryFailedError: column Bloqueio.liberado_por does not exist
```

### Depois da Correção (Esperado)
```
[Nest] 45077  - 09/01/2026, 20:10:15   LOG [PessoasService] 
Pessoa a0f4877a-f39c-480d-8d33-9913e92cf2ab liberada antecipadamente
Bloqueios desativados: 1
```

---

## 🎉 Resultado Final

Após aplicar a migration:
- ✅ Coluna `liberado_por` adicionada ao banco
- ✅ Erro 500 resolvido
- ✅ Liberação antecipada funcionando
- ✅ Histórico de quem liberou preservado
- ✅ Sistema operacional

**Execute a migration SQL e teste a funcionalidade!** 🚀
