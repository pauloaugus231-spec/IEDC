# 🚀 Guia de Inicialização - Espaço de Cuidados

**Data:** 13/01/2026

## 📋 Como Iniciar o Sistema

### **1. Backend (Terminal 1)**

```bash
# Navegar para o diretório do backend
cd "/Users/user/Dias da Cruz/backend"

# Iniciar o servidor NestJS em modo desenvolvimento
npm run start:dev
```

**Aguarde ver:**
```
[Nest] Starting Nest application...
[Nest] Nest application successfully started
🚀 Backend rodando em: http://localhost:3001
📚 Documentação em: http://localhost:3001/api/docs
```

---

### **2. Frontend (Terminal 2)**

```bash
# Navegar para o diretório do frontend (em outro terminal)
cd "/Users/user/Dias da Cruz/frontend"

# Iniciar o servidor Vite
npm run dev
```

**Aguarde ver:**
```
VITE v5.x.x ready in XXX ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

---

### **3. Acessar o Sistema**

#### **Interface do Espaço de Cuidados:**
```
http://localhost:5173/espaco-cuidados
```

#### **API Backend:**
```
http://localhost:3001/api/espaco-cuidados/dashboard
```

#### **Documentação Swagger:**
```
http://localhost:3001/api/docs
```

---

## ✅ Verificar se Está Funcionando

### **Testar Backend (em outro terminal):**
```bash
curl http://localhost:3001/api/espaco-cuidados/sessao/ativa
```

**Resposta esperada:**
```json
{
  "success": false,
  "message": "Não há sessão ativa no momento",
  "data": null
}
```

---

## 🔧 Troubleshooting

### **Erro: "port 3001 already in use"**
```bash
# Matar processo usando a porta 3001
lsof -ti:3001 | xargs kill -9

# Tentar novamente
cd "/Users/user/Dias da Cruz/backend"
npm run start:dev
```

### **Erro: "port 5173 already in use"**
```bash
# Matar processo usando a porta 5173
lsof -ti:5173 | xargs kill -9

# Tentar novamente
cd "/Users/user/Dias da Cruz/frontend"
npm run dev
```

### **Backend não conecta no banco:**
```bash
# Verificar se PostgreSQL está rodando
psql -U postgres -d albergue -c "SELECT 1"

# Se não estiver, iniciar PostgreSQL
brew services start postgresql@14
# ou
pg_ctl -D /usr/local/var/postgres start
```

---

## 📊 Status Atual do Sistema

### ✅ **Fase 1: Database** - COMPLETO
- 2 tabelas criadas (sessoes_espaco_cuidados, fila_espaco_cuidados)
- 10 índices de performance
- 2 triggers para updated_at

### ✅ **Fase 2: Backend API** - COMPLETO
- 20 endpoints REST funcionais
- Lógica de negócio implementada (565 linhas)
- Validações e tratamento de erros

### ✅ **Fase 3: Frontend** - COMPLETO
- Página principal com dashboard
- 5 componentes interativos
- Auto-refresh a cada 30 segundos
- Integração completa com API

---

## 🎯 Próximos Passos

Após iniciar o sistema, você pode:

### **1. Testar o Fluxo Completo:**

1. **Acessar:** http://localhost:5173/espaco-cuidados
2. **Clicar em:** "Iniciar Nova Sessão"
3. **Preencher:**
   - Data: 13/01/2026
   - Equipe: Seu Nome, Outro Colaborador
4. **Clicar em:** "Adicionar Pessoa"
5. **Buscar** uma pessoa existente no sistema
6. **Testar** os fluxos de banho e atendimento

---

### **2. Implementar Fases Restantes:**

#### **Fase 4: WebSocket (Opcional)**
- Sincronização em tempo real entre múltiplos usuários
- Notificações push

#### **Fase 5: Telegram Integration**
```
Funcionalidades:
- Notificar 3 grupos quando sessão inicia
- Alertas de pessoa passou vez 3x
- Comandos de consulta (/fila, /estatisticas)
```

#### **Fase 6: Relatórios**
```
Formatos:
- PDF da sessão (lista de pessoas, tempos, estatísticas)
- Excel para análise de dados
- CSV para importação
```

#### **Fase 7: Prontuário Automático**
```
Integração:
- Ao finalizar atendimento → criar prontuário
- Template pré-definido
- Campos automáticos (data, hora, pessoa, equipe)
```

#### **Fase 8: Melhorias de UX**
```
Features:
- Drag & drop para reordenar fila
- Filtros (novos cadastros, passou vez)
- Histórico de sessões anteriores
- Estatísticas comparativas
```

---

## 📱 Atalhos Úteis

### **Logs do Backend:**
```bash
# Ver logs em tempo real
cd "/Users/user/Dias da Cruz/backend"
npm run start:dev 2>&1 | grep -i "espaco\|error\|warning"
```

### **Console do Frontend:**
```
Abrir DevTools no navegador: F12 ou Cmd+Option+I
Ver Network tab para requisições
```

### **Banco de Dados:**
```bash
# Conectar no PostgreSQL
psql -U postgres -d albergue

# Ver sessões ativas
SELECT * FROM sessoes_espaco_cuidados WHERE status = 'ativa';

# Ver fila completa
SELECT 
  f.ordem_chegada,
  p.nome,
  f.status,
  f.quer_banho,
  f.quer_atendimento
FROM fila_espaco_cuidados f
JOIN pessoas p ON f.pessoa_id = p.id
WHERE f.sessao_id = 'SESSAO_ID_AQUI'
ORDER BY f.ordem_chegada;
```

---

## 📚 Documentação Disponível

- ✅ **FASE_1_DATABASE.md** - Estrutura do banco
- ✅ **FASE_2_BACKEND_API_COMPLETA.md** - API endpoints
- ✅ **FASE_3_FRONTEND_COMPLETO.md** - Interface

---

## 🆘 Suporte

Se encontrar problemas:

1. **Verificar logs** do backend e frontend
2. **Checar** se todas as dependências estão instaladas:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```
3. **Limpar cache:**
   ```bash
   # Backend
   cd backend
   rm -rf node_modules package-lock.json
   npm install
   
   # Frontend
   cd frontend
   rm -rf node_modules package-lock.json
   npm install
   ```

---

**Status:** Sistema completo e pronto para uso! 🎉

**Última atualização:** 13/01/2026
