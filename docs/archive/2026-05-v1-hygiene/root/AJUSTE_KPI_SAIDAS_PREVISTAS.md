# 🔧 AJUSTE: KPI "SAÍDAS PREVISTAS" - LÓGICA CORRIGIDA

## 🚨 Problema Relatado

**Data:** 07/01/2026  
**Relato:** "Temos pessoas no último dia, mais de 3 se não me engano, e o KPI Saídas Previstas mostra zero"

### Situação Encontrada:
- **6 pessoas** com `data_limite = 08/01/2026` (amanhã)
- **KPI mostrava:** 0 ❌
- **Expectativa do operador:** Mostrar essas 6 pessoas ✅

## 🔍 Análise do Problema

### Lógica ANTERIOR (incorreta para o uso operacional):

**Query:**
```sql
WHERE status = 'ativa'
  AND DATE(data_limite) = CURRENT_DATE  -- Hoje (07/01)
```

**Interpretação:**
- Mostra pessoas cuja **última noite é HOJE**
- Checkout acontece **à meia-noite de hoje** (00:00 de amanhã)

**Problema:**
- Operador olha durante o dia (ex: 18:00)
- Vê pessoas que **estão no último dia hoje**
- Mas essas pessoas têm `data_limite = AMANHÃ` (08/01)
- KPI mostra 0 porque busca `data_limite = HOJE` (07/01)

### 📊 Dados Reais (07/01/2026):

| Nome | data_limite | Última noite | Checkout | Aparecia no KPI? |
|------|-------------|--------------|----------|------------------|
| Leonardo Barros | 08/01 | HOJE (07/01) | 08/01 00:00 | ❌ NÃO |
| Enzo Cardoso | 08/01 | HOJE (07/01) | 08/01 00:00 | ❌ NÃO |
| Bruno Barbosa | 08/01 | HOJE (07/01) | 08/01 00:00 | ❌ NÃO |
| ... (mais 3) | 08/01 | HOJE (07/01) | 08/01 00:00 | ❌ NÃO |

**Resultado:** KPI = 0 (não mostrava ninguém) ❌

## ✅ Solução Aplicada

### Lógica NOVA (correta para uso operacional):

**Query:**
```sql
WHERE status = 'ativa'
  AND DATE(data_limite) = CURRENT_DATE + 1  -- Amanhã (08/01)
```

**Interpretação:**
- Mostra pessoas cuja **última noite é HOJE**
- Que **sairão amanhã de manhã**
- Útil para **planejamento**: "Quantas vagas terei amanhã?"

**Resultado:**
- Hoje (07/01): KPI = **6** ✅
- São as pessoas com `data_limite = 08/01`
- Estão na última noite HOJE
- Checkout à meia-noite para amanhã

## 📝 Mudanças Implementadas

### 1. Backend (dashboard.service.ts):

**ANTES:**
```typescript
async getSaidasPrevistasHoje(): Promise<number> {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const hojeFmt = hoje.toISOString().split('T')[0];

  const count = await this.estadiaRepo
    .createQueryBuilder('estadia')
    .where('estadia.status = :status', { status: StatusEstadia.ATIVA })
    .andWhere('DATE(estadia.data_limite) = :hoje', { hoje: hojeFmt })  // ❌ HOJE
    .getCount();

  return count;
}
```

**DEPOIS:**
```typescript
async getSaidasPrevistasHoje(): Promise<number> {
  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 1); // Amanhã
  amanha.setHours(0, 0, 0, 0);
  const amanhaFmt = amanha.toISOString().split('T')[0];

  const count = await this.estadiaRepo
    .createQueryBuilder('estadia')
    .where('estadia.status = :status', { status: StatusEstadia.ATIVA })
    .andWhere('DATE(estadia.data_limite) = :amanha', { amanha: amanhaFmt })  // ✅ AMANHÃ
    .getCount();

  return count;
}
```

### 2. Frontend (DashboardPage.tsx):

**Textos atualizados:**

**ANTES:**
```tsx
<div>Última noite hoje</div>
<div>Checkout automático à meia-noite</div>
<div>ℹ️ Vagas liberadas amanhã de manhã</div>
```

**DEPOIS:**
```tsx
<div>Saem amanhã de manhã</div>
<div>Checkout à meia-noite</div>
<div>ℹ️ Vagas livres amanhã de manhã</div>
```

## 🧪 Testes Realizados

### Teste 1: Verificar KPI

**Comando:**
```bash
curl http://localhost:3001/api/dashboard/saidas-previstas-hoje
```

**Resultado ANTES:**
```json
{"count": 0}  // ❌ Não mostrava ninguém
```

**Resultado DEPOIS:**
```json
{"count": 6}  // ✅ Mostra as 6 pessoas corretamente
```

### Teste 2: Validar dados

**Comando:**
```bash
curl http://localhost:3001/api/pessoas/ativos | jq '[.[] | select(.estadias[0].data_limite == "2026-01-08")] | length'
```

**Resultado:**
```
6  // ✅ Confirma que há 6 pessoas com data_limite = 08/01
```

### Teste 3: Listar nomes

**Pessoas que aparecem no KPI hoje (07/01):**
1. Leonardo Barros
2. Enzo Cardoso
3. Bruno Barbosa Teste 2
4. Fábio Teixeira
5. Juliana Almeida
6. Ana Paula

Todas com `data_limite = 08/01/2026` ✅

## 📊 Nova Interpretação do KPI

### Como funciona agora:

```
Hoje: 07/01/2026 às 18:00

Hóspedes mostrados no KPI (6):
├─ Leonardo Barros
│  ├─ Check-in: 24/12/2025
│  ├─ data_limite: 08/01/2026
│  ├─ Última noite: HOJE (07/01) ← Está no abrigo agora
│  └─ Checkout: AMANHÃ 00:00 (08/01)
│
├─ Enzo Cardoso
│  ├─ ... (mesma lógica)
│
... (mais 4 pessoas)

Interpretação para o operador:
✅ 6 pessoas sairão amanhã de manhã
✅ 6 vagas estarão livres amanhã
✅ Planejar triagem para amanhã com 6 vagas disponíveis
```

## 🎯 Benefícios da Mudança

### 1. **Alinhamento com expectativa do operador:**
   - Operador vê pessoas no "último dia"
   - KPI agora mostra essas pessoas
   - Sem confusão sobre timezone ou lógica

### 2. **Utilidade operacional:**
   - **Antes:** "Quem sai à meia-noite de hoje?" → Pouco útil
   - **Depois:** "Quem sai amanhã? Quantas vagas terei?" → Muito útil

### 3. **Planejamento facilitado:**
   - Ver KPI durante o dia
   - Saber quantas vagas livres amanhã
   - Planejar triagem com antecedência

### 4. **Consistência visual:**
   - Frontend mostra "Saem amanhã de manhã"
   - Backend busca `data_limite = amanhã`
   - Tudo alinhado!

## 🔄 Comparação: Antes vs Depois

### Cenário: Hoje é 07/01, 6 pessoas têm data_limite = 08/01

| Aspecto | ANTES | DEPOIS |
|---------|-------|--------|
| **KPI mostra** | 0 ❌ | 6 ✅ |
| **Query** | `data_limite = HOJE` | `data_limite = AMANHÃ` |
| **Texto Frontend** | "Última noite hoje" | "Saem amanhã de manhã" |
| **Utilidade** | Baixa | Alta |
| **Clareza** | Confusa | Clara |
| **Planejamento** | Difícil | Fácil |

## 📅 Timeline Explicativa

```
Hóspede: Leonardo Barros
Check-in: 24/12/2025
Período: 15 noites
data_limite: 08/01/2026

┌───────────────────────────────────────────────────────────┐
│ Dia 24/12 - 06/01: Hospedado (noites 1 a 14)            │
├───────────────────────────────────────────────────────────┤
│ Dia 07/01 (HOJE):                                        │
│   • Noite 15 (última noite)                              │
│   • Status: ativa                                        │
│   • KPI NOVO: ✅ CONTA (data_limite = 08/01 = amanhã)   │
│   • KPI ANTIGO: ❌ NÃO CONTAVA (buscava 07/01 = hoje)   │
├───────────────────────────────────────────────────────────┤
│ Dia 08/01 - 00:00: CHECKOUT AUTOMÁTICO                  │
│   • Status: ativa → finalizada                           │
│   • Cama liberada                                        │
├───────────────────────────────────────────────────────────┤
│ Dia 08/01 - 09:00: Cama disponível                      │
│   • Triagem pode alocar nova pessoa                      │
└───────────────────────────────────────────────────────────┘
```

## 🎨 Textos do Dashboard

### Card "Saídas Previstas" (novo):

```
┌─────────────────────────────────────────┐
│  🚪  SAÍDAS PREVISTAS              6   │
│      Saem amanhã de manhã      Hóspedes│
│      Checkout à meia-noite             │
│                                         │
│  ───────────────────────────────────── │
│                                         │
│  ℹ️ Vagas livres amanhã de manhã       │
└─────────────────────────────────────────┘
```

## ✅ Validação Final

### Checklist:

- [x] KPI mostra 6 pessoas (correto)
- [x] Pessoas têm data_limite = 08/01 (amanhã)
- [x] Backend usa query com `+ 1 dia`
- [x] Frontend mostra textos atualizados
- [x] Lógica clara e útil para operador
- [x] Documentação atualizada

## 📞 Como Usar

### Para o operador:

**Durante o dia (ex: 18:00):**
- Olhe o KPI "Saídas Previstas"
- Veja o número (ex: 6)
- Interprete: "Amanhã de manhã terei 6 vagas livres"
- Planeje triagem considerando essas 6 vagas

**No dia seguinte:**
- 6 vagas estarão livres
- Checkout aconteceu automaticamente à meia-noite
- Pode realizar nova triagem

## 🔗 Arquivos Modificados

1. **`backend/src/modules/dashboard/dashboard.service.ts`**
   - Método: `getSaidasPrevistasHoje()`
   - Mudança: `data_limite = HOJE` → `data_limite = AMANHÃ`

2. **`frontend/src/pages/DashboardPage.tsx`**
   - Textos do card "Saídas Previstas"
   - "Última noite hoje" → "Saem amanhã de manhã"

## 📚 Documentos Relacionados

- `EXPLICACAO_KPI_SAIDAS_PREVISTAS.md` - Explicação original (atualizar)
- `KPI_SAIDAS_PREVISTAS.md` - Documentação técnica (atualizar)
- `CORRECAO_CHECKOUT_AUTOMATICO.md` - Correção do checkout

## 🎯 Conclusão

**Problema:** KPI mostrava 0 quando operador via 6 pessoas no último dia  
**Causa:** Query buscava `data_limite = HOJE` mas pessoas tinham `data_limite = AMANHÃ`  
**Solução:** Mudança para `data_limite = AMANHÃ` (mais útil operacionalmente)  
**Resultado:** KPI agora mostra 6 pessoas ✅

**Sistema funcionando conforme esperado pelo operador!** 🎉

---

**Data da Correção:** 07/01/2026  
**Status:** ✅ RESOLVIDO E TESTADO  
**KPI Atual:** 6 pessoas (correto)
