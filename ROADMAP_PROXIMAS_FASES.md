# 🎯 ROADMAP: Próximas Implementações - Espaço de Cuidados

**Data:** 13/01/2026  
**Status Atual:** Fases 1-3 COMPLETAS ✅

---

## 📊 Progresso Geral

```
✅ Fase 1: Database Structure         [========] 100%
✅ Fase 2: Backend API                [========] 100%
✅ Fase 3: Frontend Interface         [========] 100%
⏳ Fase 4: WebSocket Real-time        [        ]   0%
⏳ Fase 5: Telegram Integration       [        ]   0%
⏳ Fase 6: Relatórios                 [        ]   0%
⏳ Fase 7: Prontuário Automático      [        ]   0%
⏳ Fase 8: Melhorias & Refinamentos   [        ]   0%
```

---

## 🚀 FASE 4: WebSocket Real-time (Opcional - Alta prioridade)

**Objetivo:** Sincronização em tempo real entre múltiplos usuários

**Tempo Estimado:** 1-2 horas

### **Backend:**

1. **Gateway WebSocket** (`espaco-cuidados.gateway.ts`)
   ```typescript
   @WebSocketGateway({ namespace: 'espaco-cuidados' })
   export class EspacoCuidadosGateway {
     @SubscribeMessage('join-session')
     handleJoinSession(client: Socket, sessaoId: string) {}
     
     @SubscribeMessage('refresh-dashboard')
     emitDashboardUpdate(sessaoId: string) {}
   }
   ```

2. **Eventos a Emitir:**
   - `session-started` - Nova sessão iniciada
   - `person-added` - Pessoa adicionada na fila
   - `status-changed` - Status de pessoa mudou
   - `session-ended` - Sessão encerrada
   - `dashboard-update` - Dashboard precisa atualizar

### **Frontend:**

1. **Hook useWebSocket** (já existe, adaptar)
   ```typescript
   const socket = useWebSocket('espaco-cuidados');
   
   socket.on('dashboard-update', () => {
     loadDashboard();
   });
   ```

2. **Remover auto-refresh de 30s**
   - Usar apenas WebSocket events

**Benefícios:**
- ✅ Sync instantâneo entre operadores
- ✅ Sem necessidade de refresh manual
- ✅ Melhor experiência multi-usuário

---

## 📱 FASE 5: Telegram Integration (Alta prioridade)

**Objetivo:** Notificações e comandos via Telegram

**Tempo Estimado:** 2-3 horas

### **1. Configuração Inicial**

```bash
npm install node-telegram-bot-api
```

**Criar bot:**
1. Falar com @BotFather no Telegram
2. /newbot
3. Escolher nome e username
4. Copiar token

**Variáveis de ambiente (.env):**
```env
TELEGRAM_BOT_TOKEN=seu_token_aqui
TELEGRAM_GROUP_EQUIPE=ID_do_grupo_1
TELEGRAM_GROUP_COORDENACAO=ID_do_grupo_2
TELEGRAM_GROUP_GERAL=ID_do_grupo_3
```

### **2. Service Telegram** (`telegram.service.ts`)

```typescript
export class TelegramService {
  private bot: TelegramBot;
  
  async notificarSessaoIniciada(sessao: Sessao) {
    const message = `
🟢 *SESSÃO INICIADA*

📅 Data: ${sessao.data_sessao}
⏰ Horário: ${sessao.hora_inicio}
👥 Equipe: ${sessao.equipe.join(', ')}

A sessão do Espaço de Cuidados está ativa!
    `;
    
    await this.enviarParaTodosGrupos(message);
  }
  
  async alertarPassouVez3x(pessoa: Pessoa, tipo: string) {
    const message = `
⚠️ *ALERTA: PASSOU VEZ 3x*

👤 Pessoa: ${pessoa.nome}
🔄 Fila: ${tipo === 'banho' ? '🚿 Banho' : '👥 Atendimento'}
❗ Passou ${pessoa.vezes_passou_vez}x a vez

Verificar situação com a pessoa.
    `;
    
    await this.enviarParaGrupoEquipe(message);
  }
  
  async comandoFila(chatId: number) {
    const fila = await this.espacoCuidadosService.getFilaAtual();
    // Formatar e enviar
  }
}
```

### **3. Notificações Automáticas**

**Eventos para notificar:**
- ✅ Sessão iniciada (3 grupos)
- ✅ Pessoa passou vez 3x (grupo equipe)
- ✅ Sessão encerrada com estatísticas (3 grupos)
- ✅ Nova pessoa na fila (grupo equipe)
- ✅ Fila de banho vazia (grupo equipe)

### **4. Comandos do Bot**

```
/fila - Ver fila completa
/banho - Ver fila de banho
/atendimento - Ver fila de atendimento
/estatisticas - Ver estatísticas da sessão
/ajuda - Lista de comandos
```

### **5. Integração com Controller**

```typescript
// Após adicionar pessoa
await this.telegramService.notificarNovaPessoa(entrada);

// Após passar vez 3x
if (entrada.vezes_passou_vez >= 3) {
  await this.telegramService.alertarPassouVez3x(pessoa, tipo);
}
```

---

## 📄 FASE 6: Relatórios (Média prioridade)

**Objetivo:** Geração de relatórios em PDF, Excel e CSV

**Tempo Estimado:** 3-4 horas

### **1. Dependências**

```bash
npm install pdfmake
npm install xlsx
npm install json2csv
```

### **2. Service de Relatórios** (`relatorios-espaco.service.ts`)

#### **PDF - Relatório da Sessão**
```typescript
async gerarPDFSessao(sessaoId: string): Promise<Buffer> {
  const dados = await this.getEstatisticas(sessaoId);
  
  const docDefinition = {
    content: [
      { text: 'Relatório - Espaço de Cuidados', style: 'header' },
      { text: `Data: ${dados.sessao.data_sessao}` },
      { text: `Equipe: ${dados.sessao.equipe.join(', ')}` },
      // Tabelas com pessoas atendidas
      // Estatísticas
      // Gráficos (opcional)
    ]
  };
  
  return pdfMake.createPdf(docDefinition).getBuffer();
}
```

#### **Excel - Dados Brutos**
```typescript
async gerarExcelSessao(sessaoId: string): Promise<Buffer> {
  const pessoas = await this.getFilaCompleta(sessaoId);
  
  const worksheet = XLSX.utils.json_to_sheet(pessoas.map(p => ({
    'Ordem': p.ordem_chegada,
    'Nome': p.pessoa.nome,
    'Banho': p.quer_banho ? 'Sim' : 'Não',
    'Atendimento': p.quer_atendimento ? 'Sim' : 'Não',
    'Status': p.status,
    'Tempo Espera (min)': p.tempoEsperaMinutos,
  })));
  
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Atendimentos');
  
  return XLSX.write(workbook, { type: 'buffer' });
}
```

#### **CSV - Exportação Simples**
```typescript
async gerarCSVSessao(sessaoId: string): Promise<string> {
  const pessoas = await this.getFilaCompleta(sessaoId);
  
  const parser = new Parser({
    fields: ['ordem_chegada', 'pessoa.nome', 'status', 'quer_banho', 'quer_atendimento']
  });
  
  return parser.parse(pessoas);
}
```

### **3. Endpoints**

```typescript
@Get('relatorios/:sessaoId/pdf')
async downloadPDF(@Param('sessaoId') sessaoId: string, @Res() res: Response) {
  const pdf = await this.relatoriosService.gerarPDFSessao(sessaoId);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=relatorio.pdf');
  res.send(pdf);
}

@Get('relatorios/:sessaoId/excel')
async downloadExcel(@Param('sessaoId') sessaoId: string, @Res() res: Response) {
  // Similar
}

@Get('relatorios/:sessaoId/csv')
async downloadCSV(@Param('sessaoId') sessaoId: string, @Res() res: Response) {
  // Similar
}
```

### **4. Frontend - Botões de Download**

```tsx
<button onClick={() => downloadRelatorio('pdf')}>
  📄 Baixar PDF
</button>
<button onClick={() => downloadRelatorio('excel')}>
  📊 Baixar Excel
</button>
<button onClick={() => downloadRelatorio('csv')}>
  📋 Baixar CSV
</button>
```

---

## 📋 FASE 7: Prontuário Automático (Média prioridade)

**Objetivo:** Criar prontuário automaticamente ao finalizar atendimento

**Tempo Estimado:** 2 horas

### **1. Template de Prontuário**

```typescript
interface ProntuarioEspacoCuidados {
  pessoa_id: string;
  data_atendimento: Date;
  tipo: 'espaco_cuidados';
  equipe: string[];
  servicos_realizados: {
    banho: boolean;
    atendimento_social: boolean;
  };
  tempos: {
    chegada: Date;
    inicio_banho?: Date;
    fim_banho?: Date;
    inicio_atendimento?: Date;
    fim_atendimento?: Date;
  };
  observacoes: string;
  novo_cadastro: boolean;
}
```

### **2. Integração com Módulo de Prontuários**

```typescript
async finalizarAtendimento(filaId: string) {
  const entrada = await this.filaRepository.findOne({ where: { id: filaId } });
  
  // Atualizar status
  entrada.status = StatusFilaCuidados.CONCLUIDO;
  entrada.hora_fim_atendimento = new Date();
  await this.filaRepository.save(entrada);
  
  // Criar prontuário automático
  await this.prontuariosService.criarProntuarioEspacoCuidados({
    pessoa_id: entrada.pessoa_id,
    sessao: entrada.sessao,
    servicos: {
      banho: entrada.quer_banho,
      atendimento: entrada.quer_atendimento,
    },
    tempos: {
      chegada: entrada.hora_chegada,
      inicio_banho: entrada.hora_inicio_banho,
      fim_banho: entrada.hora_fim_banho,
      inicio_atendimento: entrada.hora_inicio_atendimento,
      fim_atendimento: entrada.hora_fim_atendimento,
    },
    observacoes: entrada.observacoes,
  });
  
  return entrada;
}
```

---

## 🎨 FASE 8: Melhorias & Refinamentos (Baixa prioridade)

**Tempo Estimado:** 4-6 horas

### **1. UX Melhorado**

- ✅ Drag & Drop para reordenar fila
- ✅ Filtros (novos cadastros, passou vez, status)
- ✅ Busca rápida na fila
- ✅ Modo escuro
- ✅ Atalhos de teclado

### **2. Histórico de Sessões**

- ✅ Lista de sessões anteriores
- ✅ Visualizar estatísticas passadas
- ✅ Comparação entre sessões
- ✅ Gráficos de tendências

### **3. Dashboard Analítico**

- ✅ Gráfico de atendimentos por dia
- ✅ Média de pessoas por sessão
- ✅ Tempo médio de atendimento (histórico)
- ✅ Taxa de desistência
- ✅ Pessoas recorrentes

### **4. Configurações**

- ✅ Dias e horários de funcionamento
- ✅ Tamanho máximo da fila
- ✅ Tempo máximo de banho/atendimento
- ✅ Alertas personalizados

---

## 📅 Cronograma Sugerido

| Fase | Tempo | Prioridade | Quando |
|------|-------|------------|--------|
| Fase 4: WebSocket | 1-2h | Alta | Imediato |
| Fase 5: Telegram | 2-3h | Alta | Após Fase 4 |
| Fase 6: Relatórios | 3-4h | Média | Semana 2 |
| Fase 7: Prontuário | 2h | Média | Semana 2 |
| Fase 8: Melhorias | 4-6h | Baixa | Contínuo |

**Total:** 12-17 horas adicionais

---

## 🎯 Próximo Comando

**Para começar a Fase 4 (WebSocket), diga:**
```
"Vamos implementar a Fase 4: WebSocket"
```

**Para começar a Fase 5 (Telegram), diga:**
```
"Vamos implementar a Fase 5: Telegram Integration"
```

**Para testar o sistema atual, diga:**
```
"Vamos testar o sistema completo"
```

---

**Status:** Roadmap completo definido! 🗺️
