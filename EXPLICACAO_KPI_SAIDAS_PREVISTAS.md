# 📊 EXPLICAÇÃO: KPI "SAÍDAS PREVISTAS"

## 🎯 Pergunta Frequente

**"O KPI Saídas Previstas mostra as pessoas que estão com 1 dia (último), ou os que já realizaram checkout?"**

## ✅ Resposta

O KPI mostra **pessoas que estão NO ÚLTIMO DIA de estadia HOJE** (ainda NÃO fizeram checkout).

## 🔍 Detalhamento Técnico

### Query SQL do KPI:
```sql
SELECT COUNT(*)
FROM estadias
WHERE status = 'ativa'                    -- ✅ Ainda hospedadas
  AND DATE(data_limite) = CURRENT_DATE;   -- ✅ Última noite é HOJE
```

### Condições para aparecer no KPI:
1. ✅ Status = `ativa` (pessoa ainda está hospedada)
2. ✅ `data_limite = HOJE` (última noite permitida é hoje)
3. ❌ Status = `finalizada` (já fez checkout) → NÃO CONTA

## 📅 Exemplo Prático

**Cenário: Hoje é 07/01/2026 às 18:00**

### Hóspede 1: João Silva
```
Check-in: 23/12/2025
Período: 15 noites
data_limite: 07/01/2026  ← Última noite é HOJE
Status: ativa            ← Ainda está hospedado

Timeline:
├─ 23/12: Noite 1
├─ 24/12: Noite 2
│  ...
├─ 06/01: Noite 14
└─ 07/01: Noite 15 (HOJE - última noite) ← 18:00 (ainda no abrigo)

KPI: ✅ CONTA (aparece como 1)
Checkout: Acontecerá à meia-noite (00:00 do dia 08/01)
```

### Hóspede 2: Maria Santos
```
Check-in: 24/12/2025
data_limite: 08/01/2026  ← Última noite é AMANHÃ
Status: ativa

KPI: ❌ NÃO CONTA (sairá amanhã)
```

### Hóspede 3: Pedro Costa
```
Check-in: 22/12/2025
data_limite: 06/01/2026  ← Última noite foi ONTEM
Status: finalizada       ← Checkout já realizado à meia-noite

KPI: ❌ NÃO CONTA (já saiu)
```

## 🕐 Timeline Completa de um Hóspede

```
┌─────────────────────────────────────────────────────────────┐
│ Dia 23/12 - 09:00: Check-in                                 │
│   → status = 'ativa'                                        │
│   → data_limite = 06/01/2026                                │
├─────────────────────────────────────────────────────────────┤
│ Dia 24/12 a 05/01: Hospedado                                │
│   → Noites 2 a 14                                           │
│   → KPI Saídas Previstas = 0 (última noite ainda não)      │
├─────────────────────────────────────────────────────────────┤
│ Dia 06/01 - 00:00 a 23:59: ÚLTIMA NOITE                     │
│   → Noite 15                                                │
│   → status = 'ativa' (ainda hospedado)                      │
│   → data_limite = 06/01 = HOJE                              │
│   → KPI Saídas Previstas = 1 ✅ (APARECE NO KPI)            │
├─────────────────────────────────────────────────────────────┤
│ Dia 07/01 - 00:00: CHECKOUT AUTOMÁTICO                      │
│   → Cron executa                                            │
│   → status = 'ativa' → 'finalizada'                         │
│   → Cama liberada                                           │
│   → KPI Saídas Previstas = 0 ❌ (NÃO APARECE MAIS)          │
├─────────────────────────────────────────────────────────────┤
│ Dia 07/01 - 09:00: Cama disponível para nova triagem       │
└─────────────────────────────────────────────────────────────┘
```

## 📊 Tabela Comparativa

| Situação | Status | data_limite vs Hoje | Aparece no KPI? | Quando sai? |
|----------|--------|---------------------|-----------------|-------------|
| No último dia | `ativa` | = HOJE | ✅ SIM | Meia-noite de hoje |
| Falta 1+ dias | `ativa` | > HOJE | ❌ NÃO | Futuramente |
| Já fez checkout | `finalizada` | ≤ ONTEM | ❌ NÃO | Já saiu |
| Vencida (bug) | `ativa` | < HOJE | ❌ NÃO* | Deveria ter saído |

*Se aparecer, é indicativo de falha no checkout automático

## 🔄 Diferença: KPI vs Checkout Automático

### 1. KPI "Saídas Previstas" (Dashboard)

**Objetivo:** Mostrar quantas pessoas **SAIRÃO hoje à meia-noite**

**Query:**
```sql
WHERE status = 'ativa'
  AND DATE(data_limite) = CURRENT_DATE  -- Igual (=)
```

**Momento:** Durante o dia (ex: 18:00)
**Resultado:** Pessoas que **ainda estão** mas **sairão hoje**

---

### 2. Checkout Automático (Cron)

**Objetivo:** Processar pessoas cuja **última noite já passou**

**Query:**
```sql
WHERE status = 'ativa'
  AND data_limite <= CURRENT_DATE  -- Menor ou Igual (<=)
```

**Momento:** Meia-noite (00:00)
**Resultado:** Pessoas que **devem sair agora**

---

## 💡 Interpretação para o Operador

### Se o KPI mostra: **3**

Significa:
- ✅ 3 hóspedes estão na **última noite HOJE**
- ✅ Às 00:00 de amanhã, checkout automático processará essas 3 pessoas
- ✅ Amanhã de manhã, **3 vagas** estarão livres
- ✅ Sistema está funcionando normalmente

### Se o KPI mostra: **0**

Significa:
- ✅ Nenhum hóspede está na última noite hoje
- ✅ Nenhum checkout automático acontecerá à meia-noite
- ✅ Mesmas vagas disponíveis amanhã

## 🚨 Situações Anormais

### ⚠️ KPI mostra número mas checkout não acontece

**Problema:** Cron não está executando  
**Solução:** Verificar logs do backend, reiniciar se necessário

### ⚠️ Diagnóstico mostra estadias vencidas (diasVencidos > 0)

**Problema:** Checkout automático falhou em dias anteriores  
**Solução:** Executar manualmente: `POST /api/estadias/checkout-automatico`

## 🧪 Como Testar

### 1. Ver KPI atual:
```bash
curl http://localhost:3001/api/dashboard/saidas-previstas-hoje
# Resultado: {"count": 3}
```

### 2. Ver detalhes das pessoas:
```bash
curl http://localhost:3001/api/estadias/diagnostico-checkout | jq '.estadiasVencidas'
```

### 3. Executar checkout manual (teste):
```bash
curl -X POST http://localhost:3001/api/estadias/checkout-automatico
```

## 📝 Código-fonte do KPI

### Backend (dashboard.service.ts):
```typescript
async getSaidasPrevistasHoje(): Promise<number> {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const hojeFmt = hoje.toISOString().split('T')[0];

  const count = await this.estadiaRepo
    .createQueryBuilder('estadia')
    .where('estadia.status = :status', { status: StatusEstadia.ATIVA })
    .andWhere('DATE(estadia.data_limite) = :hoje', { hoje: hojeFmt })
    .getCount();

  return count;
}
```

### Frontend (DashboardPage.tsx):
```typescript
const resSaidas = await fetch('/api/dashboard/saidas-previstas-hoje');
const saidasData = resSaidas.ok ? await resSaidas.json() : { count: 0 };
setCheckoutsHoje(saidasData.count || 0);
```

## 📚 Documentos Relacionados

- `KPI_SAIDAS_PREVISTAS.md` - Documentação técnica completa do KPI
- `LOGICA_ESTADIA.md` - Explicação da lógica de 15 noites
- `CORRECAO_CHECKOUT_AUTOMATICO.md` - Correção do bug de checkout

## ✅ Resumo Final

**O KPI "Saídas Previstas" mostra:**
- ✅ Pessoas **NO ÚLTIMO DIA** de estadia (ainda hospedadas)
- ✅ Que **FARÃO checkout à meia-noite** automaticamente
- ❌ NÃO mostra quem já fez checkout
- ❌ NÃO mostra quem tem dias restantes

**É um indicador de planejamento:** "Quantas vagas estarão livres amanhã de manhã?"

---

**Data:** 07/01/2026  
**Status:** ✅ Sistema funcionando corretamente
