/* =========================================================
   PIX — gera o código "Pix copia e cola"
   ---------------------------------------------------------
   O Pix copia e cola segue um padrão do Banco Central
   chamado "BR Code". Ele é um texto montado em blocos:

       ID (2 dígitos) + TAMANHO (2 dígitos) + VALOR

   Ex.: o bloco "5802BR" quer dizer:
       58 = país   |   02 = o valor tem 2 letras   |   BR

   No fim vem um "dígito verificador" (CRC16) que o app do
   banco usa para conferir se o código não foi alterado.

   ⚠️ Este é um Pix ESTÁTICO: o site não fica sabendo
   quando o pagamento cai. Confira sempre no app do banco.
   ========================================================= */

// Monta um bloco no formato ID + TAMANHO + VALOR
function campoPix(id, valor) {                                   // recebe o número do campo e o conteúdo
  const tamanho = String(valor.length).padStart(2, "0");         // conta as letras do valor e completa com zero à esquerda (ex.: 9 → "09")
  return id + tamanho + valor;                                   // junta tudo: ex.: "58" + "02" + "BR" = "5802BR"
}

// Deixa o texto do jeito que o Pix aceita: sem acento, maiúsculo, só letras/números/espaço
function limparTextoPix(texto, limite) {                         // recebe o texto e o tamanho máximo permitido
  return texto                                                   // começa com o texto original
    .normalize("NFD")                                            // separa as letras dos acentos (ex.: "ã" vira "a" + "~")
    .replace(/[̀-ͯ]/g, "")                             // apaga os acentos que ficaram separados
    .toUpperCase()                                               // transforma tudo em MAIÚSCULAS
    .replace(/[^A-Z0-9 ]/g, "")                                  // remove qualquer símbolo que não seja letra, número ou espaço
    .slice(0, limite);                                           // corta no tamanho máximo
}

// Calcula o dígito verificador CRC16 (padrão exigido pelo Pix)
function crc16Pix(texto) {                                       // recebe o código quase pronto
  let crc = 0xffff;                                              // valor inicial definido pelo padrão
  for (let i = 0; i < texto.length; i++) {                       // passa por cada letra do código
    crc ^= texto.charCodeAt(i) << 8;                             // mistura o código da letra no cálculo
    for (let bit = 0; bit < 8; bit++) {                          // repete 8 vezes (uma para cada bit da letra)
      crc = crc & 0x8000                                         // se o bit mais alto estiver ligado...
        ? (crc << 1) ^ 0x1021                                    // ...desloca e mistura com o "polinômio" do padrão
        : crc << 1;                                              // ...senão, só desloca
      crc &= 0xffff;                                             // mantém o número com 16 bits
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");        // devolve em hexadecimal com 4 dígitos (ex.: "A1B2")
}

// Função principal: devolve o texto do Pix copia e cola
function gerarPixCopiaECola({ chave, nome, cidade, valor, identificador }) {  // recebe os dados do pagamento
  const contaPix =                                               // bloco 26: "conta" que vai receber
    campoPix("00", "br.gov.bcb.pix") +                           // 00 = identificador fixo do Pix
    campoPix("01", chave.trim());                                // 01 = a chave Pix da loja

  const codigo =                                                 // monta o código bloco por bloco
    campoPix("00", "01") +                                       // 00 = versão do padrão (sempre "01")
    campoPix("26", contaPix) +                                   // 26 = dados da conta Pix (montados acima)
    campoPix("52", "0000") +                                     // 52 = categoria do comerciante ("0000" = não informado)
    campoPix("53", "986") +                                      // 53 = moeda (986 = Real brasileiro)
    campoPix("54", valor.toFixed(2)) +                           // 54 = valor com 2 casas e PONTO (ex.: "712.31")
    campoPix("58", "BR") +                                       // 58 = país
    campoPix("59", limparTextoPix(nome, 25)) +                   // 59 = nome do recebedor (até 25 letras)
    campoPix("60", limparTextoPix(cidade, 15)) +                 // 60 = cidade do recebedor (até 15 letras)
    campoPix("62", campoPix("05", identificador)) +              // 62/05 = identificador do pedido (aparece no extrato)
    "6304";                                                      // 63 = início do CRC (o "04" é o tamanho dele)

  return codigo + crc16Pix(codigo);                              // código final = código + dígito verificador
}
