#!/bin/bash

# Script de Correção Rápida
# Execute: chmod +x corrigir.sh && ./corrigir.sh

echo "=================================="
echo "🔧 CORREÇÃO RÁPIDA - Healthcare"
echo "=================================="
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${RED}⚠️  ATENÇÃO: Antes de continuar, você DEVE regenerar suas credenciais!${NC}"
echo ""
echo "1. Supabase Anon Key: https://app.supabase.com/project/jahjwuydesfytlmjwucx/settings/api"
echo "2. MercadoPago Keys: https://www.mercadopago.com.br/developers/panel/app"
echo ""
read -p "Você já regenerou as credenciais? (s/n): " confirmacao

if [ "$confirmacao" != "s" ]; then
    echo -e "${RED}❌ Por favor, regenere as credenciais primeiro!${NC}"
    echo "Leia o arquivo GUIA_CORRECAO_URGENTE.md para instruções detalhadas."
    exit 1
fi

echo ""
echo "Ótimo! Vamos configurar o .env..."
echo ""

# Pedir novas credenciais
read -p "Cole a NOVA Supabase Anon Key: " ANON_KEY
read -p "Cole a NOVA MercadoPago Public Key: " MP_KEY

# Criar arquivo .env
cat > .env << EOF
# ============================================================
# CONFIGURAÇÃO DO AMBIENTE
# ============================================================

# Supabase
VITE_SUPABASE_URL='https://jahjwuydesfytlmjwucx.supabase.co'
VITE_SUPABASE_ANON_KEY='${ANON_KEY}'
VITE_SUPABASE_PUBLISHABLE_KEY='jahjwuydesfytlmjwucx'

# MercadoPago
VITE_MERCADOPAGO_PUBLIC_KEY='${MP_KEY}'

# ============================================================
# As variáveis abaixo ficam no Supabase Edge Function Secrets
# NÃO coloque aqui!
# 
# MP_ACCESS_TOKEN
# MP_WEBHOOK_SECRET
# INIT_SECRET
# CRON_SECRET
# ============================================================
EOF

echo ""
echo -e "${GREEN}✅ Arquivo .env criado com sucesso!${NC}"
echo ""

# Limpar cache
echo "Limpando cache do Vite..."
rm -rf node_modules/.vite

echo ""
echo -e "${GREEN}✅ Correção concluída!${NC}"
echo ""
echo "Próximos passos:"
echo "1. Execute: npm run dev"
echo "2. Abra: http://localhost:5173"
echo "3. Leia SECURITY.md para configurar produção"
echo ""
echo -e "${YELLOW}⚠️  Lembre-se: NUNCA faça commit do arquivo .env no git!${NC}"
echo ""
