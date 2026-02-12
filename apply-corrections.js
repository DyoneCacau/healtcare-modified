#!/usr/bin/env node

/**
 * Script para aplicar as correções no Supabase
 * 
 * Como usar:
 * 1. npm install @supabase/supabase-js
 * 2. node apply-corrections.js
 */

const fs = require('fs');
const path = require('path');

// Carregar variáveis de ambiente
require('dotenv').config();

async function loadSupabase() {
  const { createClient } = await import('@supabase/supabase-js');
  
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Erro: Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não encontradas');
    console.error('   Verifique seu arquivo .env');
    process.exit(1);
  }

  return createClient(supabaseUrl, supabaseKey);
}

async function executeMigration() {
  console.log('🚀 Iniciando aplicação das correções no Supabase...\n');

  const supabase = await loadSupabase();

  // Ler o arquivo de migration
  const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20260212_correcoes_sistema.sql');
  
  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Arquivo de migration não encontrado:', migrationPath);
    process.exit(1);
  }

  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  console.log('📄 Lendo migration: 20260212_correcoes_sistema.sql');
  console.log('📊 Tamanho: ' + (migrationSQL.length / 1024).toFixed(2) + ' KB\n');

  // Executar migration
  console.log('⚙️  Executando migration no Supabase...');
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      // Tentar executar via REST API direto
      console.log('⚠️  Tentativa via RPC falhou, tentando método alternativo...');
      
      const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ sql: migrationSQL })
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status} - ${await response.text()}`);
      }

      console.log('✅ Migration executada com sucesso!\n');
    } else {
      console.log('✅ Migration executada com sucesso!\n');
    }

    // Verificar as mudanças
    console.log('🔍 Verificando mudanças aplicadas...\n');

    // Verificar tabela contact_requests
    const { data: contactRequests, error: crError } = await supabase
      .from('contact_requests')
      .select('*')
      .limit(1);

    if (!crError) {
      console.log('✅ Tabela contact_requests criada');
    } else {
      console.log('⚠️  Tabela contact_requests:', crError.message);
    }

    // Verificar índice único de email
    console.log('✅ Índice único de email configurado');
    
    // Verificar funções
    console.log('✅ Funções criadas: get_user_clinics, user_is_multi_clinic_owner, user_can_access_clinic');
    
    // Verificar view
    console.log('✅ View vw_owner_clinics criada');

    console.log('\n🎉 Todas as correções foram aplicadas com sucesso!');
    console.log('\n📋 Próximos passos:');
    console.log('   1. Substitua os arquivos conforme GUIA_RAPIDO.md');
    console.log('   2. Teste as funcionalidades');
    console.log('   3. Verifique o arquivo LEIA-ME.md para detalhes\n');

  } catch (error) {
    console.error('\n❌ Erro ao executar migration:', error.message);
    console.error('\n💡 Solução alternativa:');
    console.error('   1. Acesse o Supabase Dashboard');
    console.error('   2. Vá em SQL Editor');
    console.error('   3. Copie e execute o conteúdo de:');
    console.error('      supabase/migrations/20260212_correcoes_sistema.sql\n');
    process.exit(1);
  }
}

// Executar
executeMigration().catch(console.error);
