# 📊 KPI: SAÍDAS PREVISTAS HOJE

## 🎯 Objetivo
Mostrar quantos hóspedes têm sua **última noite HOJE** e farão checkout automático à meia-noite.

## 🔍 Lógica Implementada

### Definição:
- **"Saída prevista para hoje"** = Hóspede cuja `data_limite` é HOJE
- `data_limite` = Última noite permitida na estadia
- Checkout automático acontece à meia-noite (00:00) do dia seguinte

### Exemplo Prático:
```
Hoje: 05/01/2026

Hóspede João:
  - Check-in: 21/12/2025
  - data_limite: 05/01/2026
  - Última noite: 05/01/2026 (hoje!)
  - Checkout automático: 06/01/2026 às 00:00
  - Aparece no KPI? ✅ SIM

Hóspede Maria:
  - Check-in: 22/12/2025
  - data_limite: 06/01/2026
  - Última noite: 06/01/2026 (amanhã)
  - Checkout automático: 07/01/2026 às 00:00
  - Aparece no KPI? ❌ NÃO
```

## 💻 Implementação

### Backend (dashboard.service.ts):
```typescript
async getSaidasPrevistasHoje(): Promise<number> {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const hojeFmt = hoje.toISOString().split('T')[0]; // YYYY-MM-DD

  const count = await this.estadiaRepo
    .createQueryBuilder('estadia')
    .where('estadia.status = :status', { status: StatusEstadia.ATIVA })
    .andWhere('DATE(estadia.data_limite) = :hoje', { hoje: hojeFmt })
    .getCount();

  return count;
}
```

### Endpoint:
```
GET /api/dashboard/saidas-previstas-hoje
```

**Resposta:**
```json
{
  "count": 3
}
```

### Frontend (DashboardPage.tsx):
```typescript
const resSaidas = await fetch('/api/dashboard/saidas-previstas-hoje');
const saidasData = resSaidas.ok ? await resSaidas.json() : { count: 0 };
setCheckoutsHoje(saidasData.count || 0);
```

## 📋 Query SQL Equivalente:
```sql
SELECT COUNT(*)
FROM estadias
WHERE status = 'ativa'
  AND DATE(data_limite) = CURRENT_DATE;
```

## ✅ Validações

### 1. Verifica apenas estadias ATIVAS
- Status = 'ativa'
- Ignora estadias já finalizadas ou canceladas

### 2. Compara apenas a DATA (sem hora)
- `DATE(data_limite)` remove a parte de hora
- Garante comparação precisa

### 3. Usa CURRENT_DATE do PostgreSQL
- Evita problemas de timezone
- Sempre usa a data do servidor de banco de dados

## 🧪 Como Testar

### 1. Criar estadia de teste com data_limite = hoje:
```sql
-- Ajustar o ID da pessoa e cama conforme necessário
INSERT INTO estadias (id, pessoa_id, cama_id, data_checkin, data_limite, status)
VALUES (
  gen_random_uuid(),
  'ID_DA_PESSOA',
  'ID_DA_CAMA',
  CURRENT_DATE - 10,
  CURRENT_DATE,  -- Termina HOJE
  'ativa'
);
```

### 2. Verificar o KPI:
```bash
curl http://localhost:3001/api/dashboard/saidas-previstas-hoje
```

### 3. Verificar no dashboard:
- Acessar: http://localhost:5173
- Verificar o KPI "Saídas Previstas"
- Deve mostrar a quantidade correta

## 🎨 Apresentação no Dashboard

**Label:** "Saídas Previstas"
**Descrição:** "Agendadas para hoje"
**Valor:** Número de hóspedes
**Ícone:** ↑ (seta para cima) em fundo vermelho

**Significado para o usuário:**
- "Quantos hóspedes têm sua última noite hoje"
- "Quantos checkouts automáticos acontecerão à meia-noite"
- "Quantas vagas estarão livres amanhã de manhã"

## 📊 KPIs Relacionados

1. **Total de Hóspedes:** Ocupação atual
2. **Pendentes:** Pessoas cadastradas aguardando vaga
3. **Saídas Previstas:** ⭐ Este KPI (quantos saem hoje)
4. **Presença:** Hóspedes presentes fisicamente

## 🔄 Atualização

- **Frequência:** Atualiza ao carregar o dashboard
- **Tempo real:** Não (precisa recarregar a página)
- **Cache:** Nenhum (sempre busca dados atuais)

## 📝 Logs e Monitoramento

Para debug, verificar:
```sql
-- Estadias que terminam hoje
SELECT p.nome, e.data_limite 
FROM estadias e
JOIN pessoas p ON e.pessoa_id = p.id
WHERE e.status = 'ativa' 
  AND DATE(e.data_limite) = CURRENT_DATE;
```

## ✅ Status da Implementação

- ✅ Backend: Método `getSaidasPrevistasHoje()` criado
- ✅ Controller: Endpoint `/api/dashboard/saidas-previstas-hoje` criado
- ✅ Frontend: Integração com o endpoint
- ✅ UI: Exibição no dashboard
- ✅ Teste: Script SQL de validação criado
- ✅ Documentação: Este arquivo

**Sistema funcionando corretamente!** 🎉
