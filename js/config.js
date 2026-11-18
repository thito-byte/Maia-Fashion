/* =========================================================
   CONFIGURAÇÃO DA LOJA  ⚠️ ESTE É O ARQUIVO QUE VOCÊ EDITA
   ---------------------------------------------------------
   Todos os dados abaixo são EXEMPLOS. Troque pelos dados
   reais da Maia Fashion antes de colocar o site no ar.
   Nenhum outro arquivo precisa ser mudado para isso.
   ========================================================= */

const CONFIG_LOJA = {                       // objeto com todas as configurações da loja

  /* ---------- WhatsApp ---------- */
  whatsapp: "5511999999999",                // número da loja: 55 (Brasil) + DDD + número, só dígitos, sem espaços nem traços

  /* ---------- Pix ---------- */
  pix: {                                    // dados usados para gerar o "Pix copia e cola" e o QR Code
    chave: "pix@exemplo.com.br",            // sua chave Pix (e-mail, CPF/CNPJ só números, telefone no formato +5511999999999 ou chave aleatória)
    nomeRecebedor: "MAIA FASHION",          // nome que aparece no banco de quem recebe (máximo 25 letras, sem acento)
    cidade: "SAO PAULO",                    // cidade do recebedor (máximo 15 letras, sem acento)
  },

  /* ---------- Condições de pagamento ---------- */
  descontoPix: 0.05,                        // desconto no Pix: 0.05 = 5% (para 10%, use 0.10)
  parcelasCartao: 3,                        // número máximo de parcelas no cartão

  /* ---------- Frete (só envio, sem retirada) ---------- */
  frete: {                                  // regras de cálculo do frete
    modo: "tabela",                         // "tabela" = calcula pelo estado | "combinar" = frete combinado depois pelo WhatsApp (fica fora do Pix)
    valorPadrao: 29.90,                     // frete para estados que não estão na lista abaixo
    porEstado: {                            // frete específico por estado (sigla: valor)
      SP: 19.90,                            // exemplo: São Paulo mais barato
      RJ: 24.90,                            // exemplo: Rio de Janeiro
    },
    gratisAcimaDe: 500,                     // frete grátis quando as peças somam este valor ou mais (use 0 para desligar)
  },

  /* ---------- Textos ---------- */
  nomeLoja: "Maia Fashion",                 // nome usado na mensagem do WhatsApp
};
