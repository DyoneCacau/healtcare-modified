#!/bin/bash

# ============================================================================
# Script para aplicar correções no Supabase via SQL Editor
# ============================================================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Iniciando aplicação das correções no Supabase...${NC}\n"

# Verificar se arquivo .env existe
if [ ! -f .env ]; then
    echo -e "${RED}❌ Arquivo .env não encontrado${NC}"
    exit 1
fi

# Carregar variáveis do .env
source .env

# Verificar variáveis necessárias
if [ -z "$VITE_SUPABASE_URL" ] || [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
    echo -e "${RED}❌ Variáveis VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não definidas${NC}"
    exit 1
fi

MIGRATION_FILE="supabase/migrations/20260212_correcoes_sistema.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}❌ Arquivo de migration não encontrado: $MIGRATION_FILE${NC}"
    exit 1
fi

echo -e "${YELLOW}📄 Arquivo de migration encontrado${NC}"
echo -e "${YELLOW}📊 Preparando execução...${NC}\n"

# Ler o conteúdo SQL
SQL_CONTENT=$(cat "$MIGRATION_FILE")

echo -e "${BLUE}⚙️  INSTRUÇÕES PARA APLICAR A MIGRATION:${NC}\n"

echo -e "${GREEN}OPÇÃO 1 - Via Supabase Dashboard (RECOMENDADO):${NC}"
echo -e "1. Acesse: https://app.supabase.com/project/jahjwuydesfytlmjwucx/sql/new"
echo -e "2. Copie todo o conteúdo do arquivo:"
echo -e "   ${YELLOW}$MIGRATION_FILE${NC}"
echo -e "3. Cole no SQL Editor"
echo -e "4. Clique em 'RUN' ou pressione Ctrl+Enter"
echo -e "5. Verifique se apareceu 'Success' sem erros\n"

echo -e "${GREEN}OPÇÃO 2 - Copiar SQL para clipboard:${NC}"
echo -e "Execute o comando abaixo para copiar o SQL:\n"
echo -e "${YELLOW}cat $MIGRATION_FILE | pbcopy${NC}  # Mac"
echo -e "${YELLOW}cat $MIGRATION_FILE | xclip -selection clipboard${NC}  # Linux"
echo -e "${YELLOW}cat $MIGRATION_FILE | clip${NC}  # Windows\n"

echo -e "${GREEN}OPÇÃO 3 - Via CLI do Supabase:${NC}"
echo -e "Se você tem o Supabase CLI instalado:\n"
echo -e "${YELLOW}supabase db push${NC}\n"

echo -e "${BLUE}📋 VERIFICAÇÃO PÓS-MIGRATION:${NC}\n"
echo -e "Após executar, verifique se as seguintes mensagens aparecem:"
echo -e "  ✅ 'Colunas adicionadas em subscriptions'"
echo -e "  ✅ 'Tabela payment_history criada com sucesso'"
echo -e "  ✅ 'Tabela contact_requests criada'"
echo -e "  ✅ 'Função get_superadmin_stats criada com sucesso'"
echo -e "  ✅ 'MIGRAÇÃO CONCLUÍDA COM SUCESSO'\n"

echo -e "${YELLOW}⚠️  IMPORTANTE:${NC}"
echo -e "  Após aplicar a migration, substitua os arquivos conforme GUIA_RAPIDO.md\n"

# Criar arquivo temporário com instruções
cat > APLICAR_MIGRATION.txt << EOF
====================================================================
INSTRUÇÕES PARA APLICAR A MIGRATION NO SUPABASE
====================================================================

1. Acesse o Supabase Dashboard:
   https://app.supabase.com/project/jahjwuydesfytlmjwucx/sql/new

2. Copie TODO o conteúdo do arquivo:
   $MIGRATION_FILE

3. Cole no SQL Editor do Supabase

4. Clique em "RUN" (ou pressione Ctrl+Enter)

5. Aguarde a execução (pode levar alguns segundos)

6. Verifique se apareceu a mensagem:
   "MIGRAÇÃO CONCLUÍDA COM SUCESSO!"

7. Se houver erros, leia as mensagens e corrija conforme necessário

====================================================================
PÓS-MIGRATION
====================================================================

Após aplicar a migration com sucesso:

1. Substitua os arquivos:
   mv src/pages/Login.tsx src/pages/Login_OLD.tsx
   mv src/pages/Login_updated.tsx src/pages/Login.tsx
   
   mv src/pages/SuperAdmin.tsx src/pages/SuperAdmin_OLD.tsx
   mv src/pages/SuperAdmin_updated.tsx src/pages/SuperAdmin.tsx

2. Teste as funcionalidades conforme GUIA_RAPIDO.md

====================================================================
EOF

echo -e "${GREEN}✅ Arquivo de instruções criado: APLICAR_MIGRATION.txt${NC}\n"
echo -e "${BLUE}Use este arquivo como referência durante a aplicação${NC}\n"
