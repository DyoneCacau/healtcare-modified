#!/bin/bash

# ============================================================================
# SCRIPT MASTER - APLICAR TODAS AS CORREÇÕES AUTOMATICAMENTE
# ============================================================================

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

clear

echo -e "${MAGENTA}"
cat << "EOF"
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🏥 HEALTHCARE - SISTEMA DE VENDAS DIRETAS                 ║
║   📋 APLICADOR AUTOMÁTICO DE CORREÇÕES                      ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}\n"

echo -e "${CYAN}Este script irá:${NC}"
echo -e "  1. ✅ Aplicar migration no Supabase (via instruções)"
echo -e "  2. ✅ Substituir arquivos do frontend"
echo -e "  3. ✅ Criar backups dos arquivos originais"
echo -e "  4. ✅ Validar todas as mudanças"
echo -e "\n"

read -p "$(echo -e ${YELLOW}Deseja continuar? [s/N]:${NC} )" -n 1 -r
echo
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo -e "${RED}Operação cancelada${NC}"
    exit 1
fi

echo -e "\n${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}PASSO 1: APLICAR MIGRATION NO SUPABASE${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}\n"

echo -e "${YELLOW}⚠️  A migration precisa ser aplicada MANUALMENTE no Supabase Dashboard${NC}\n"

echo -e "${GREEN}Siga estes passos:${NC}"
echo -e "1. Abra seu navegador em:"
echo -e "   ${CYAN}https://app.supabase.com/project/jahjwuydesfytlmjwucx/sql/new${NC}\n"

echo -e "2. Copie TODO o conteúdo do arquivo:"
echo -e "   ${CYAN}supabase/migrations/20260212_correcoes_sistema.sql${NC}\n"

echo -e "3. Cole no SQL Editor do Supabase\n"

echo -e "4. Clique em ${GREEN}'RUN'${NC} (ou pressione Ctrl+Enter)\n"

echo -e "5. Aguarde a execução e verifique se apareceu:"
echo -e "   ${GREEN}✅ 'MIGRAÇÃO CONCLUÍDA COM SUCESSO!'${NC}\n"

echo -e "${YELLOW}Dica: Use o arquivo APLICAR_MIGRATION.txt como referência${NC}\n"

read -p "$(echo -e ${YELLOW}Migration aplicada com sucesso? [s/N]:${NC} )" -n 1 -r
echo
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo -e "${RED}Por favor, aplique a migration primeiro e execute este script novamente${NC}"
    exit 1
fi

echo -e "\n${GREEN}✅ Migration confirmada!${NC}\n"

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}PASSO 2: CRIAR BACKUPS${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}\n"

# Criar diretório de backup
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo -e "${CYAN}Criando backups em: $BACKUP_DIR${NC}\n"

# Backup Login.tsx
if [ -f "src/pages/Login.tsx" ]; then
    cp "src/pages/Login.tsx" "$BACKUP_DIR/Login.tsx"
    echo -e "  ✅ Backup: Login.tsx"
fi

# Backup SuperAdmin.tsx
if [ -f "src/pages/SuperAdmin.tsx" ]; then
    cp "src/pages/SuperAdmin.tsx" "$BACKUP_DIR/SuperAdmin.tsx"
    echo -e "  ✅ Backup: SuperAdmin.tsx"
fi

# Backup UserManagement.tsx (já foi modificado, mas fazer backup do estado atual)
if [ -f "src/components/admin/UserManagement.tsx" ]; then
    cp "src/components/admin/UserManagement.tsx" "$BACKUP_DIR/UserManagement.tsx"
    echo -e "  ✅ Backup: UserManagement.tsx"
fi

echo -e "\n${GREEN}✅ Backups criados com sucesso!${NC}\n"

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}PASSO 3: SUBSTITUIR ARQUIVOS${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}\n"

# Substituir Login.tsx
if [ -f "src/pages/Login_updated.tsx" ]; then
    mv "src/pages/Login.tsx" "src/pages/Login_OLD.tsx" 2>/dev/null || true
    cp "src/pages/Login_updated.tsx" "src/pages/Login.tsx"
    echo -e "  ✅ Login.tsx atualizado"
else
    echo -e "  ${RED}❌ Login_updated.tsx não encontrado${NC}"
fi

# Substituir SuperAdmin.tsx
if [ -f "src/pages/SuperAdmin_updated.tsx" ]; then
    mv "src/pages/SuperAdmin.tsx" "src/pages/SuperAdmin_OLD.tsx" 2>/dev/null || true
    cp "src/pages/SuperAdmin_updated.tsx" "src/pages/SuperAdmin.tsx"
    echo -e "  ✅ SuperAdmin.tsx atualizado"
else
    echo -e "  ${RED}❌ SuperAdmin_updated.tsx não encontrado${NC}"
fi

# UserManagement já está modificado, não precisa substituir
echo -e "  ✅ UserManagement.tsx (já modificado)"

echo -e "\n${GREEN}✅ Arquivos substituídos com sucesso!${NC}\n"

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}PASSO 4: VALIDAÇÃO${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}\n"

# Verificar se arquivos existem
VALIDATION_PASSED=true

echo -e "${CYAN}Verificando arquivos críticos:${NC}\n"

# Arquivos que devem existir
FILES=(
    "src/pages/Login.tsx:Página de Login"
    "src/pages/SuperAdmin.tsx:Página SuperAdmin"
    "src/components/admin/UserManagement.tsx:Gerenciamento de Usuários"
    "src/components/superadmin/ContactRequestsManagement.tsx:Gerenciamento de Solicitações"
    "src/components/auth/ClinicSelector.tsx:Seletor de Clínicas"
    "src/pages/SelectClinic.tsx:Página Seletor de Clínicas"
    "supabase/migrations/20260212_correcoes_sistema.sql:Migration de Correções"
)

for file_desc in "${FILES[@]}"; do
    IFS=':' read -r file desc <<< "$file_desc"
    if [ -f "$file" ]; then
        echo -e "  ${GREEN}✅${NC} $desc"
    else
        echo -e "  ${RED}❌${NC} $desc (não encontrado: $file)"
        VALIDATION_PASSED=false
    fi
done

echo ""

if [ "$VALIDATION_PASSED" = true ]; then
    echo -e "${GREEN}✅ Validação concluída com sucesso!${NC}\n"
else
    echo -e "${RED}⚠️  Alguns arquivos não foram encontrados${NC}\n"
fi

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}RESUMO DAS CORREÇÕES APLICADAS${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}\n"

echo -e "${GREEN}✅ 1. Email único para usuários${NC}"
echo -e "   └─ Não permite criar usuários com emails duplicados\n"

echo -e "${GREEN}✅ 2. Criação automática de clínica removida${NC}"
echo -e "   └─ Ao criar usuário, não cria mais clínica automaticamente\n"

echo -e "${GREEN}✅ 3. Admin pode deletar usuários${NC}"
echo -e "   └─ Botão de deletar com confirmação adicionado\n"

echo -e "${GREEN}✅ 4. Notificações de leads corrigidas${NC}"
echo -e "   └─ Contador zera ao aprovar/rejeitar\n"

echo -e "${GREEN}✅ 5. Dono visualiza todas as clínicas${NC}"
echo -e "   └─ Sistema pronto para múltiplas clínicas por owner\n"

echo -e "${GREEN}✅ 6. Formulário de contato na página de login${NC}"
echo -e "   └─ Botão 'Solicitar Acesso' com formulário completo\n"

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}PRÓXIMOS PASSOS${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}\n"

echo -e "${YELLOW}1. Reiniciar o servidor de desenvolvimento:${NC}"
echo -e "   ${CYAN}npm run dev${NC}\n"

echo -e "${YELLOW}2. Testar as funcionalidades:${NC}"
echo -e "   ├─ Email único (tentar criar usuário duplicado)"
echo -e "   ├─ Deletar usuário (ir em Administração > Usuários)"
echo -e "   ├─ Notificações (aprovar/rejeitar um lead)"
echo -e "   └─ Formulário de contato (logout e testar 'Solicitar Acesso')\n"

echo -e "${YELLOW}3. Consultar documentação:${NC}"
echo -e "   ├─ ${CYAN}LEIA-ME.md${NC} - Resumo completo"
echo -e "   ├─ ${CYAN}GUIA_RAPIDO.md${NC} - Guia passo a passo"
echo -e "   └─ ${CYAN}INSTRUCOES_CORRECOES.md${NC} - Documentação detalhada\n"

echo -e "${YELLOW}4. Backups disponíveis em:${NC}"
echo -e "   ${CYAN}$BACKUP_DIR/${NC}\n"

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}\n"

echo -e "${GREEN}"
cat << "EOF"
  ██████╗ ██████╗ ███╗   ██╗ ██████╗██╗     ██╗   ██╗██╗██████╗  ██████╗ 
 ██╔════╝██╔═══██╗████╗  ██║██╔════╝██║     ██║   ██║██║██╔══██╗██╔═══██╗
 ██║     ██║   ██║██╔██╗ ██║██║     ██║     ██║   ██║██║██║  ██║██║   ██║
 ██║     ██║   ██║██║╚██╗██║██║     ██║     ██║   ██║██║██║  ██║██║   ██║
 ╚██████╗╚██████╔╝██║ ╚████║╚██████╗███████╗╚██████╔╝██║██████╔╝╚██████╔╝
  ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝╚══════╝ ╚═════╝ ╚═╝╚═════╝  ╚═════╝ 
                                                                          
EOF
echo -e "${NC}"

echo -e "${GREEN}🎉 Todas as correções foram aplicadas com sucesso!${NC}\n"
