#!/bin/bash

# =============================================================================
# SCRIPT DE VERIFICAÇÃO - HEALTHCARE SYSTEM
# =============================================================================
# Este script verifica se todas as configurações estão corretas
# Execute: bash verify-config.sh
# =============================================================================

echo "=================================================="
echo "🔍 VERIFICADOR DE CONFIGURAÇÃO - HEALTHCARE SYSTEM"
echo "=================================================="
echo ""

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contadores
ERRORS=0
WARNINGS=0
SUCCESS=0

# Função para verificar
check() {
    local name="$1"
    local condition="$2"
    local error_msg="$3"
    
    if [ "$condition" = "true" ]; then
        echo -e "${GREEN}✅ $name${NC}"
        ((SUCCESS++))
    else
        echo -e "${RED}❌ $name${NC}"
        if [ -n "$error_msg" ]; then
            echo -e "   ${YELLOW}→ $error_msg${NC}"
        fi
        ((ERRORS++))
    fi
}

# Função para avisos
warn() {
    local name="$1"
    local msg="$2"
    echo -e "${YELLOW}⚠️  $name${NC}"
    if [ -n "$msg" ]; then
        echo -e "   → $msg"
    fi
    ((WARNINGS++))
}

echo "📋 1. VERIFICANDO ARQUIVOS DE CONFIGURAÇÃO"
echo "-------------------------------------------"

# Verificar .env
if [ -f ".env" ]; then
    check "Arquivo .env existe" "true"
else
    check "Arquivo .env existe" "false" "Execute: cp .env.example .env"
fi

# Verificar node_modules
if [ -d "node_modules" ]; then
    check "Dependências instaladas (node_modules)" "true"
else
    check "Dependências instaladas" "false" "Execute: npm install"
fi

echo ""
echo "🔐 2. VERIFICANDO VARIÁVEIS DO FRONTEND (.env)"
echo "-------------------------------------------"

if [ -f ".env" ]; then
    # Carregar variáveis
    source .env 2>/dev/null || true
    
    # Verificar Supabase URL
    if [ -n "$VITE_SUPABASE_URL" ] && [ "$VITE_SUPABASE_URL" != "https://seu-projeto.supabase.co" ]; then
        check "VITE_SUPABASE_URL configurado" "true"
    else
        check "VITE_SUPABASE_URL configurado" "false" "Configure sua URL do Supabase"
    fi
    
    # Verificar Supabase Anon Key
    if [ -n "$VITE_SUPABASE_ANON_KEY" ] && [ "$VITE_SUPABASE_ANON_KEY" != "sua_chave_anonima_aqui" ]; then
        check "VITE_SUPABASE_ANON_KEY configurado" "true"
    else
        check "VITE_SUPABASE_ANON_KEY configurado" "false" "Configure sua chave anônima"
    fi
    
    # Verificar Supabase Publishable Key
    if [ -n "$VITE_SUPABASE_PUBLISHABLE_KEY" ] && [ "$VITE_SUPABASE_PUBLISHABLE_KEY" != "sua_chave_anonima_aqui" ]; then
        check "VITE_SUPABASE_PUBLISHABLE_KEY configurado" "true"
    else
        check "VITE_SUPABASE_PUBLISHABLE_KEY configurado" "false" "Configure sua chave publicável"
    fi
    
    # Verificar SuperAdmin Email
    if [ -n "$VITE_SUPERADMIN_EMAILS" ]; then
        check "VITE_SUPERADMIN_EMAILS configurado" "true"
    else
        check "VITE_SUPERADMIN_EMAILS configurado" "false" "Configure o email do superadmin"
    fi
    
    # Verificar Mercado Pago (opcional)
    if [ -n "$VITE_MERCADOPAGO_PUBLIC_KEY" ]; then
        if [[ "$VITE_MERCADOPAGO_PUBLIC_KEY" == TEST-* ]]; then
            warn "Mercado Pago em modo TESTE" "Use apenas para desenvolvimento"
        else
            check "VITE_MERCADOPAGO_PUBLIC_KEY configurado (PRODUÇÃO)" "true"
        fi
    else
        warn "VITE_MERCADOPAGO_PUBLIC_KEY não configurado" "Opcional: necessário apenas para pagamentos"
    fi
else
    warn "Arquivo .env não encontrado" "Pulando verificação de variáveis"
fi

echo ""
echo "⚙️  3. VERIFICANDO EDGE FUNCTIONS (Supabase)"
echo "-------------------------------------------"

if [ -f "supabase/.env.local" ]; then
    check "Arquivo supabase/.env.local existe" "true"
    
    # Carregar variáveis das edge functions
    source supabase/.env.local 2>/dev/null || true
    
    # Verificar Service Role Key
    if [ -n "$SUPABASE_SERVICE_ROLE_KEY" ] && [ "$SUPABASE_SERVICE_ROLE_KEY" != "COLE_AQUI_SUA_SERVICE_ROLE_KEY" ]; then
        check "SUPABASE_SERVICE_ROLE_KEY configurado" "true"
    else
        check "SUPABASE_SERVICE_ROLE_KEY configurado" "false" "Obtenha no Dashboard do Supabase → Settings → API"
    fi
    
    # Verificar MP Access Token
    if [ -n "$MP_ACCESS_TOKEN" ]; then
        if [[ "$MP_ACCESS_TOKEN" == TEST-* ]]; then
            warn "MP_ACCESS_TOKEN em modo TESTE" "Use apenas para desenvolvimento"
        else
            check "MP_ACCESS_TOKEN configurado (PRODUÇÃO)" "true"
        fi
    else
        warn "MP_ACCESS_TOKEN não configurado" "Necessário para processar pagamentos"
    fi
else
    warn "Arquivo supabase/.env.local não encontrado" "Crie baseado no exemplo fornecido"
fi

echo ""
echo "📦 4. VERIFICANDO ESTRUTURA DO PROJETO"
echo "-------------------------------------------"

# Verificar pastas importantes
[ -d "src" ] && check "Pasta src/" "true" || check "Pasta src/" "false"
[ -d "supabase" ] && check "Pasta supabase/" "true" || check "Pasta supabase/" "false"
[ -d "supabase/migrations" ] && check "Migrations do Supabase" "true" || warn "Pasta supabase/migrations não encontrada"
[ -d "supabase/functions" ] && check "Edge Functions do Supabase" "true" || warn "Pasta supabase/functions não encontrada"

# Verificar arquivos importantes
[ -f "package.json" ] && check "package.json" "true" || check "package.json" "false"
[ -f "vite.config.ts" ] && check "vite.config.ts" "true" || check "vite.config.ts" "false"

echo ""
echo "=================================================="
echo "📊 RESUMO DA VERIFICAÇÃO"
echo "=================================================="
echo -e "${GREEN}Sucesso: $SUCCESS${NC}"
echo -e "${YELLOW}Avisos:  $WARNINGS${NC}"
echo -e "${RED}Erros:   $ERRORS${NC}"
echo ""

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}🎉 TUDO CONFIGURADO CORRETAMENTE!${NC}"
    echo ""
    echo "Próximos passos:"
    echo "1. Execute: npm install (se ainda não fez)"
    echo "2. Execute: npm run dev"
    echo "3. Acesse: http://localhost:5173"
    echo ""
else
    echo -e "${RED}⚠️  ATENÇÃO: Existem erros na configuração${NC}"
    echo ""
    echo "Corrija os erros acima antes de continuar."
    echo "Consulte o arquivo CONFIGURACAO_MERCADOPAGO.md para mais detalhes."
    echo ""
fi

if [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}ℹ️  Avisos encontrados (opcional)${NC}"
    echo "Os avisos não impedem o funcionamento, mas podem afetar funcionalidades específicas."
    echo ""
fi

exit $ERRORS
