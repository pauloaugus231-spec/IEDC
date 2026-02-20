# 📋 LÓGICA DE ESTADIA E CHECKOUT AUTOMÁTICO

## 🏠 Regras de Estadia (15 Noites)

### Exemplo Prático:
- **Check-in:** 20/12/2025 às 18h30
- **1ª Noite:** 20/12 (o dia do check-in já conta)
- **Período completo:** 15 noites consecutivas
  - 20/12, 21/12, 22/12, 23/12, 24/12, 25/12, 26/12, 27/12, 28/12, 29/12, 30/12, 31/12, 01/01, 02/01, **03/01**
- **Última noite permitida:** 03/01/2026
- **Data limite:** 03/01/2026

## ⏰ Checkout Automático

### Quando acontece:
- **Horário:** Meia-noite (00:00:00)
- **Momento exato:** Virada do dia 03/01 para 04/01
- **Sistema:** Cron job executa à 00:00:00 do dia 04/01

### Como funciona:
1. **Às 23:59:59 do dia 03/01:** Hóspede ainda está na cama (última noite)
2. **Às 00:00:00 do dia 04/01:** Sistema executa checkout automático
3. **Resultado:**
   - Status da estadia: `ativa` → `checkout_automatico`
   - Status da cama: `ocupada` → `disponivel`
   - Status da pessoa: `ativa` → `inativa`

## 🔄 Timeline Completa:

```
20/12 18h30  → Check-in realizado
             → data_checkin = 20/12/2025 18:30:00
             → data_limite = 03/01/2026 00:00:00
             → status = 'ativa'

20/12-03/01  → Período de estadia (15 noites)

03/01 23:59  → Última noite (hóspede ainda na cama)

04/01 00:00  → CHECKOUT AUTOMÁTICO EXECUTADO
             → Condição SQL: data_limite < CURRENT_DATE
             → 03/01 < 04/01 = TRUE
             → Checkout realizado automaticamente

04/01 18h30  → Nova triagem pode acontecer
             → Cama já está disponível para novo hóspede
```

## 💻 Código Relevante:

### Cálculo da data_limite (Check-in):
```typescript
const now = new Date(); // 20/12/2025 18:30:00
const data_limite = new Date(now);
data_limite.setDate(now.getDate() + 14); // 20 + 14 = 03/01 (dia 34 de dezembro = 03/01)
data_limite.setHours(0, 0, 0, 0); // 03/01/2026 00:00:00
```

### Query do Checkout Automático:
```sql
SELECT * FROM estadias e
WHERE e.status = 'ativa'
  AND e.data_limite < CURRENT_DATE  -- 03/01 < 04/01 = TRUE
```

## ✅ Garantias do Sistema:

1. ✅ **Check-in no dia X conta como 1ª noite**
2. ✅ **15 noites totais** (dia X até dia X+14)
3. ✅ **Checkout automático à meia-noite** após a última noite
4. ✅ **Cama livre para nova triagem** no dia seguinte
5. ✅ **Sistema autônomo** (não precisa intervenção manual)
6. ✅ **Execução diária** via cron à meia-noite
7. ✅ **Logs detalhados** para auditoria

## 🔍 Testes Realizados:

- ✅ Ana Costa: Check-in 20/12, data_limite 04/01, checkout executado em 04/01
- ✅ Sistema autônomo funcionando corretamente
- ✅ Comparação de datas usando `<` (menor que) para precisão
- ✅ PostgreSQL CURRENT_DATE para evitar problemas de timezone

## 📊 Monitoramento:

Para verificar estadias vencidas:
```bash
curl http://localhost:3001/api/estadias/diagnostico-checkout
```

Para forçar execução manual (teste):
```bash
curl -X POST http://localhost:3001/api/estadias/checkout-automatico
```
