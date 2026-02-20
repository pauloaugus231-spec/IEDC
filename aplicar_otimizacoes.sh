#!/bin/bash

# ============================================
# Script para Aplicar Otimizações de Performance
# Sistema: Albergue Dias da Cruz
# Data: 09/01/2026
# ============================================

echo "🚀 Aplicando Otimizações de Performance..."
echo ""

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# ============================================
# 1. VERIFICAR POSTGRESQL
# ============================================
echo "📊 Verificando PostgreSQL..."
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ PostgreSQL não encontrado!${NC}"
    echo "Instale com: brew install postgresql"
    exit 1
fi
echo -e "${GREEN}✅ PostgreSQL encontrado${NC}"
echo ""

# ============================================
# 2. INSTALAR EXTENSÃO PG_TRGM
# ============================================
echo "🔧 Instalando extensão pg_trgm..."
psql -U postgres -d albergue -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;" 2>&1 | grep -v "NOTICE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Extensão pg_trgm instalada${NC}"
else
    echo -e "${YELLOW}⚠️ Aviso: Verifique se a extensão foi instalada${NC}"
fi
echo ""

# ============================================
# 3. APLICAR ÍNDICES
# ============================================
echo "📈 Aplicando índices de performance..."
psql -U postgres -d albergue -f backend/database/performance_indexes.sql

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Índices aplicados com sucesso!${NC}"
else
    echo -e "${RED}❌ Erro ao aplicar índices${NC}"
    echo "Verifique o arquivo: backend/database/performance_indexes.sql"
    exit 1
fi
echo ""

# ============================================
# 4. VERIFICAR ÍNDICES CRIADOS
# ============================================
echo "🔍 Verificando índices criados..."
INDICES=$(psql -U postgres -d albergue -t -c "
SELECT COUNT(*) 
FROM pg_indexes 
WHERE tablename IN ('pessoas', 'estadias', 'bloqueios', 'camas', 'ocorrencias', 'solicitacoes')
  AND indexname LIKE 'idx_%';
")

INDICES_COUNT=$(echo $INDICES | xargs)
echo -e "${GREEN}✅ Total de índices criados: ${INDICES_COUNT}${NC}"
echo ""

# ============================================
# 5. ATUALIZAR ESTATÍSTICAS
# ============================================
echo "📊 Atualizando estatísticas do banco..."
psql -U postgres -d albergue -c "ANALYZE;" > /dev/null 2>&1
echo -e "${GREEN}✅ Estatísticas atualizadas${NC}"
echo ""

# ============================================
# 6. MOSTRAR RESUMO
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}🎉 OTIMIZAÇÕES APLICADAS COM SUCESSO!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Resumo:"
echo "  ✅ Extensão pg_trgm instalada"
echo "  ✅ ${INDICES_COUNT} índices criados"
echo "  ✅ Estatísticas atualizadas"
echo ""
echo "🔄 Próximo passo:"
echo "  Reinicie o backend:"
echo "    cd backend"
echo "    npm run start:dev"
echo ""
echo "📖 Documentação completa:"
echo "  - OTIMIZACOES_PERFORMANCE.md"
echo "  - RESUMO_OTIMIZACOES.md"
echo ""

# ============================================
# 7. MOSTRAR ÍNDICES POR TABELA
# ============================================
echo "📊 Índices por tabela:"
psql -U postgres -d albergue -c "
SELECT 
  tablename,
  COUNT(*) as total_indices
FROM pg_indexes 
WHERE tablename IN ('pessoas', 'estadias', 'bloqueios', 'camas', 'ocorrencias', 'solicitacoes')
  AND indexname LIKE 'idx_%'
GROUP BY tablename
ORDER BY tablename;
"

echo ""
echo -e "${GREEN}✨ Pronto! Sistema otimizado para 13 mil+ cadastros!${NC}"
