# 🔍 ANÁLISE: KPI "CHEGADAS PREVISTAS"

## 📊 Status Atual (05/01/2026)

**Valor mostrado no Dashboard:** 10 pessoas

## 🎯 O que o KPI está mostrando HOJE

### Implementação Atual (DashboardPage.tsx - Linha ~70):

```typescript
// 1. Buscar pessoas aprovadas (Check-ins pendentes)
const resAprovados = await fetch('/api/pessoas?status=aprovado');
const aprovados = resAprovados.ok ? await resAprovados.json() : [];
setCheckinsPendentes(Array.isArray(aprovados) ? aprovados : (aprovados.data || []));
```

### Lógica Aplicada:
- **Endpoint:** `GET /api/pessoas?status=aprovado`
- **Filtro:** Pessoas com `status_cadastro = 'aprovado'`
- **Contagem:** Total de pessoas nesse status

## ⚠️ PROBLEMA IDENTIFICADO

### O que significa "aprovado"?

Segundo a entidade `Pessoa` (pessoa.entity.ts):

```typescript
export enum StatusCadastro {
  APROVADO = 'aprovado',  // ← Status usado no KPI
  ATIVA = 'ativa',        // Hóspede com check-in ativo
  INATIVO = 'inativo',    // Hóspede com check-out realizado
}
```

### ❌ Interpretação Atual (INCORRETA):
- **KPI mostra:** Pessoas com status "aprovado"
- **Significado presumido:** "Pessoas aprovadas para entrar no sistema"
- **Problema:** NÃO indica necessariamente que terão check-in HOJE

### 🤔 Pessoas "Aprovadas" encontradas:
```
Nicolas Vieira   - criado em 18/12/2025
Xuxa Gomes       - criado em 18/12/2025
João Silva       - criado em 18/12/2025
Samuel Pereira   - criado em 18/12/2025
Thiago Ribeiro   - criado em 18/12/2025
... (10 pessoas no total)
```

**Observação:** Todas criadas em 18/12/2025 (há 18 dias!)

## 🎯 O que o KPI DEVERIA mostrar?

### Opção 1: Check-ins AGENDADOS para HOJE
**Definição:** Pessoas que têm agendamento de check-in para hoje

**Problema:** Sistema atual NÃO tem campo `data_checkin_prevista` ou similar

**Solução:** Adicionar campo na entidade ou usar outro critério

### Opção 2: Pessoas APROVADAS aguardando vaga
**Definição:** Pessoas aprovadas pelo sistema aguardando disponibilidade de cama

**Lógica:** `status_cadastro = 'aprovado'` E NÃO tem estadia ativa

**Vantagem:** Já é implementável com dados atuais

### Opção 3: Check-ins REALIZADOS hoje
**Definição:** Pessoas que fizeram check-in hoje

**Lógica:** Estadias com `DATE(data_checkin) = CURRENT_DATE`

**Diferença:** Mostra o que JÁ ACONTECEU, não o que está PREVISTO

## 🔧 ANÁLISE DA LÓGICA ATUAL

### Nome do KPI no Dashboard:
```
Título: "Chegadas Previstas"
Descrição: "Aprovados no sistema"
```

### ✅ Coerência Parcial:
- KPI se chama "Chegadas Previstas"
- Descrição diz "Aprovados no sistema"
- De fato mostra pessoas aprovadas

### ❌ Problema Semântico:
- "Chegadas **PREVISTAS**" sugere algo que vai acontecer **HOJE**
- Mas mostra pessoas aprovadas **há dias/semanas**
- Não há filtro de data ou indicação temporal

## 💡 RECOMENDAÇÕES

### Opção A: Manter lógica atual + Ajustar nomenclatura

**Novo nome:** "Aguardando Check-in"
**Descrição:** "Aprovados sem vaga"

**Lógica:**
```typescript
// Buscar pessoas aprovadas SEM estadia ativa
const pessoas = await pessoaRepo.find({
  where: { 
    status_cadastro: StatusCadastro.APROVADO,
    // Não tem estadia ativa (via query customizada)
  }
});
```

### Opção B: Implementar check-ins do dia (passado)

**Nome:** "Check-ins Hoje"
**Descrição:** "Realizados hoje"

**Lógica:**
```sql
SELECT COUNT(*)
FROM estadias
WHERE DATE(data_checkin) = CURRENT_DATE;
```

**Endpoint novo:**
```typescript
@Get('checkins-hoje')
async getCheckinsHoje() {
  const count = await this.dashboardService.getCheckinsHoje();
  return { count };
}
```

### Opção C: Implementar sistema de agendamento

**Nome:** "Chegadas Previstas"
**Descrição:** "Agendadas para hoje"

**Requisito:** Adicionar campo `data_chegada_prevista` na entidade Pessoa ou Solicitacao

**Lógica:**
```sql
SELECT COUNT(*)
FROM pessoas p
LEFT JOIN solicitacoes s ON s.pessoa_id = p.id
WHERE p.status_cadastro = 'aprovado'
  AND DATE(s.data_chegada_prevista) = CURRENT_DATE;
```

## 📋 COMPARAÇÃO: KPIs de Movimentação

### ✅ "Saídas Previstas" (FUNCIONANDO):
```
Lógica: Estadias com data_limite = HOJE
Significado: Hóspedes cuja última noite é HOJE
Temporalidade: Checkout automático à meia-noite
Status: ✅ CORRETO e FUNCIONAL
```

### ⚠️ "Chegadas Previstas" (ATUAL):
```
Lógica: Pessoas com status = 'aprovado'
Significado: Pessoas aprovadas aguardando vaga (?)
Temporalidade: SEM indicação de data
Status: ⚠️ FUNCIONAL mas SEMANTICAMENTE CONFUSO
```

## 🎯 DECISÃO RECOMENDADA

### Opção Mais Simples e Coerente: OPÇÃO B

**Motivo:**
1. Não requer mudanças no banco de dados
2. É simétrico ao KPI "Saídas Previstas"
3. Fornece informação útil: quantos entraram hoje
4. Fácil de implementar e testar

**Implementação:**

1. **Backend (dashboard.service.ts):**
```typescript
async getCheckinsHoje(): Promise<number> {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const hojeFmt = hoje.toISOString().split('T')[0];

  const count = await this.estadiaRepo
    .createQueryBuilder('estadia')
    .where('DATE(estadia.data_checkin) = :hoje', { hoje: hojeFmt })
    .getCount();

  return count;
}
```

2. **Controller (dashboard.controller.ts):**
```typescript
@Get('checkins-hoje')
async getCheckinsHoje() {
  const count = await this.dashboardService.getCheckinsHoje();
  return { count };
}
```

3. **Frontend (DashboardPage.tsx):**
```typescript
// Substituir linha ~70
const resCheckins = await fetch('/api/dashboard/checkins-hoje');
const checkinsData = resCheckins.ok ? await resCheckins.json() : { count: 0 };
setCheckinsPendentes(checkinsData.count || 0);
```

4. **Ajustar Labels:**
```typescript
// Linha ~295
<div style={{ fontSize: '13px', fontWeight: '600' }}>Check-ins Hoje</div>
<div style={{ fontSize: '11px', color: '#6B7280' }}>Realizados hoje</div>
```

## 📊 RESULTADO ESPERADO

Após implementação da Opção B:

```
KPI "Check-ins Hoje"
└── Mostra: 5 (pessoas que fizeram check-in hoje)

KPI "Saídas Previstas"  
└── Mostra: 0 (pessoas cuja última noite é hoje)
```

**Simetria Perfeita:**
- Ambos baseados em data = HOJE
- Ambos buscam do banco de dados
- Ambos fornecem informação temporal precisa

## 🔍 VALIDAÇÃO ATUAL

### Query para testar:
```sql
-- Quantas pessoas "aprovadas" existem?
SELECT COUNT(*) 
FROM pessoas 
WHERE status_cadastro = 'aprovado';
-- Resultado: 10

-- Quantos check-ins foram feitos hoje?
SELECT COUNT(*) 
FROM estadias 
WHERE DATE(data_checkin) = CURRENT_DATE;
-- Resultado: ? (precisa testar)

-- Quem são as pessoas aprovadas?
SELECT nome, status_cadastro, created_at 
FROM pessoas 
WHERE status_cadastro = 'aprovado'
ORDER BY created_at DESC;
```

## ✅ CONCLUSÃO

**Estado Atual:**
- KPI mostra 10 pessoas "aprovadas"
- NÃO indica chegadas para hoje
- Nome "Chegadas Previstas" é enganoso

**Ação Recomendada:**
- Implementar Opção B: "Check-ins Hoje"
- Criar endpoint `/api/dashboard/checkins-hoje`
- Ajustar frontend para usar novo endpoint
- Renomear KPI para "Check-ins Hoje"

**Benefício:**
- Informação temporal precisa
- Simetria com "Saídas Previstas"
- Implementação simples e robusta
