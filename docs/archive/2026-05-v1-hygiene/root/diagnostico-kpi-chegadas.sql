-- 🔍 DIAGNÓSTICO: KPI "CHEGADAS PREVISTAS"
-- Data de execução: 05/01/2026

-- ===================================
-- 1. VERIFICAR DATA ATUAL DO BANCO
-- ===================================
SELECT 
    CURRENT_DATE as data_hoje,
    CURRENT_TIMESTAMP as timestamp_agora;

-- ===================================
-- 2. PESSOAS COM STATUS "APROVADO"
-- ===================================
-- O que o KPI está mostrando HOJE
SELECT 
    COUNT(*) as total_aprovados,
    'Pessoas com status aprovado (usado pelo KPI atual)' as descricao
FROM pessoas 
WHERE status_cadastro = 'aprovado';

-- Detalhes das pessoas aprovadas
SELECT 
    nome,
    status_cadastro,
    DATE(created_at) as data_cadastro,
    CURRENT_DATE - DATE(created_at) as dias_desde_cadastro
FROM pessoas 
WHERE status_cadastro = 'aprovado'
ORDER BY created_at DESC;

-- ===================================
-- 3. CHECK-INS REALIZADOS HOJE
-- ===================================
-- O que o KPI DEVERIA mostrar (Opção B)
SELECT 
    COUNT(*) as checkins_hoje,
    'Check-ins realizados hoje (proposta de novo KPI)' as descricao
FROM estadias 
WHERE DATE(data_checkin) = CURRENT_DATE;

-- Detalhes dos check-ins de hoje
SELECT 
    p.nome,
    e.data_checkin,
    e.data_limite,
    e.status,
    c.casa,
    c.numero as leito
FROM estadias e
JOIN pessoas p ON e.pessoa_id = p.id
JOIN camas c ON e.cama_id = c.id
WHERE DATE(e.data_checkin) = CURRENT_DATE
ORDER BY e.data_checkin DESC;

-- ===================================
-- 4. CHECK-INS DOS ÚLTIMOS 7 DIAS
-- ===================================
-- Contexto histórico
SELECT 
    DATE(data_checkin) as data,
    COUNT(*) as total_checkins
FROM estadias
WHERE DATE(data_checkin) >= CURRENT_DATE - 7
GROUP BY DATE(data_checkin)
ORDER BY data DESC;

-- ===================================
-- 5. PESSOAS APROVADAS SEM ESTADIA
-- ===================================
-- Pessoas aprovadas aguardando vaga (possível interpretação do KPI)
SELECT 
    COUNT(DISTINCT p.id) as aprovados_sem_estadia,
    'Pessoas aprovadas SEM estadia ativa' as descricao
FROM pessoas p
LEFT JOIN estadias e ON e.pessoa_id = p.id AND e.status = 'ativa'
WHERE p.status_cadastro = 'aprovado'
  AND e.id IS NULL;

-- Detalhes
SELECT 
    p.nome,
    p.status_cadastro,
    DATE(p.created_at) as cadastrado_em,
    CURRENT_DATE - DATE(p.created_at) as dias_aguardando
FROM pessoas p
LEFT JOIN estadias e ON e.pessoa_id = p.id AND e.status = 'ativa'
WHERE p.status_cadastro = 'aprovado'
  AND e.id IS NULL
ORDER BY p.created_at DESC;

-- ===================================
-- 6. PESSOAS APROVADAS COM ESTADIA ATIVA
-- ===================================
-- Pessoas aprovadas que JÁ fizeram check-in
SELECT 
    COUNT(DISTINCT p.id) as aprovados_com_estadia,
    'Pessoas aprovadas COM estadia ativa (já fizeram check-in)' as descricao
FROM pessoas p
INNER JOIN estadias e ON e.pessoa_id = p.id AND e.status = 'ativa'
WHERE p.status_cadastro = 'aprovado';

-- Detalhes
SELECT 
    p.nome,
    p.status_cadastro,
    e.data_checkin,
    e.data_limite,
    c.casa,
    c.numero as leito
FROM pessoas p
INNER JOIN estadias e ON e.pessoa_id = p.id AND e.status = 'ativa'
INNER JOIN camas c ON e.cama_id = c.id
WHERE p.status_cadastro = 'aprovado'
ORDER BY e.data_checkin DESC;

-- ===================================
-- 7. COMPARAÇÃO: ENTRADAS vs SAÍDAS
-- ===================================
-- Simetria dos KPIs
SELECT 
    'Check-ins Hoje' as kpi,
    COUNT(*) as quantidade
FROM estadias 
WHERE DATE(data_checkin) = CURRENT_DATE

UNION ALL

SELECT 
    'Saídas Previstas Hoje' as kpi,
    COUNT(*) as quantidade
FROM estadias 
WHERE status = 'ativa'
  AND DATE(data_limite) = CURRENT_DATE;

-- ===================================
-- 8. STATUS DAS PESSOAS NO SISTEMA
-- ===================================
-- Visão geral da distribuição de status
SELECT 
    status_cadastro,
    COUNT(*) as total,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentual
FROM pessoas
GROUP BY status_cadastro
ORDER BY total DESC;

-- ===================================
-- 9. FLUXO DE CHECK-INS (ÚLTIMA SEMANA)
-- ===================================
-- Quantos check-ins por dia
SELECT 
    TO_CHAR(data_checkin, 'DD/MM') as dia,
    TO_CHAR(data_checkin, 'Dy') as dia_semana,
    COUNT(*) as checkins,
    STRING_AGG(p.nome, ', ') as pessoas
FROM estadias e
JOIN pessoas p ON e.pessoa_id = p.id
WHERE DATE(data_checkin) >= CURRENT_DATE - 7
GROUP BY DATE(data_checkin), TO_CHAR(data_checkin, 'DD/MM'), TO_CHAR(data_checkin, 'Dy')
ORDER BY DATE(data_checkin) DESC;

-- ===================================
-- 10. RESUMO FINAL
-- ===================================
WITH stats AS (
    SELECT 
        (SELECT COUNT(*) FROM pessoas WHERE status_cadastro = 'aprovado') as total_aprovados,
        (SELECT COUNT(*) FROM estadias WHERE DATE(data_checkin) = CURRENT_DATE) as checkins_hoje,
        (SELECT COUNT(*) FROM estadias WHERE status = 'ativa' AND DATE(data_limite) = CURRENT_DATE) as saidas_hoje,
        (SELECT COUNT(DISTINCT p.id) FROM pessoas p LEFT JOIN estadias e ON e.pessoa_id = p.id AND e.status = 'ativa' WHERE p.status_cadastro = 'aprovado' AND e.id IS NULL) as aprovados_sem_vaga
)
SELECT 
    '📊 KPI "Chegadas Previstas" (ATUAL)' as item,
    total_aprovados as valor,
    'Pessoas com status aprovado' as significado
FROM stats

UNION ALL

SELECT 
    '✅ Proposta: "Check-ins Hoje"' as item,
    checkins_hoje as valor,
    'Check-ins realizados hoje' as significado
FROM stats

UNION ALL

SELECT 
    '🏠 Proposta Alternativa' as item,
    aprovados_sem_vaga as valor,
    'Aprovados aguardando vaga' as significado
FROM stats

UNION ALL

SELECT 
    '📊 KPI "Saídas Previstas" (ATUAL)' as item,
    saidas_hoje as valor,
    'Última noite hoje' as significado
FROM stats;
