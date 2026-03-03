/**
 * API Endpoint para sincronização de Conta Contábil
 * Recebe dados do Google Sheets e salva no Supabase
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase credentials not configured');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function handler(req: any, res: any) {
  // Validar método
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body;

    // Validar body
    if (!body || !body.cod_conta) {
      return res.status(400).json({
        error: 'Dados inválidos',
        message: 'cod_conta é obrigatório'
      });
    }

    console.log(`📊 Sincronizando conta: ${body.cod_conta}`);

    // Preparar dados
    const contaData = {
      cod_conta: body.cod_conta,
      tag1: body.tag1 || null,
      tag2: body.tag2 || null,
      tag3: body.tag3 || null,
      tag4: body.tag4 || null,
      tag_orc: body.tag_orc || null,
      ger: body.ger || null,
      bp_dre: body.bp_dre || null,
      nat_orc: body.nat_orc || null,
      nome_nat_orc: body.nome_nat_orc || null,
      responsavel: body.responsavel || null,
      synced_at: new Date().toISOString(),
    };

    // Upsert no Supabase (tabela: tags)
    const { data, error } = await supabase
      .from('tags')
      .upsert(contaData, {
        onConflict: 'cod_conta',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao salvar no Supabase:', error);
      return res.status(500).json({
        error: 'Erro ao salvar dados',
        message: error.message
      });
    }

    console.log(`✅ Conta ${body.cod_conta} sincronizada com sucesso`);

    return res.status(200).json({
      success: true,
      message: 'Conta sincronizada com sucesso',
      data: data
    });

  } catch (error: any) {
    console.error('❌ Erro na sincronização:', error);
    return res.status(500).json({
      error: 'Erro interno',
      message: error.message
    });
  }
}

export default handler;
