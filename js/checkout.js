/* =========================================================
   CHECKOUT — tela da sacola, entrega, pagamento e WhatsApp
   ---------------------------------------------------------
   Etapas:  itens  →  dados  →  pagamento
   - itens:     lista do que está na sacola
   - dados:     nome, endereço de entrega e forma de pagamento
   - pagamento: Pix (QR Code + copia e cola) ou aviso do cartão,
                e o botão que abre o WhatsApp com a mensagem pronta
   Só existe ENVIO (não há retirada na loja).
   ========================================================= */

function iniciarCheckout() {                                                // função principal (roda quando a página carrega)
  // ---------- 1. Elementos do HTML ----------
  const painel = document.getElementById("painel-sacola");                  // o painel inteiro da sacola
  const sombra = document.getElementById("sombra-sacola");                  // fundo escuro atrás do painel
  const titulo = document.getElementById("sacola-titulo");                  // título no topo do painel
  const botaoAbrir = document.getElementById("botao-sacola");               // ícone da sacola no cabeçalho
  const botaoFechar = document.getElementById("sacola-fechar");             // "X" do painel
  const botaoVoltar = document.getElementById("sacola-voltar");             // seta de voltar uma etapa
  const lista = document.getElementById("sacola-lista");                    // <ul> onde os itens são desenhados
  const vazia = document.getElementById("sacola-vazia");                    // mensagem "sacola vazia"
  const rodape = document.getElementById("sacola-rodape");                  // rodapé com resumo e botões
  const botaoAvancar = document.getElementById("sacola-avancar");           // botão principal (muda de texto por etapa)
  const botaoWhatsapp = document.getElementById("sacola-whatsapp");         // botão verde do WhatsApp
  const form = document.getElementById("form-pedido");                      // formulário da etapa "dados"
  const erroFormulario = document.getElementById("erro-formulario");        // aviso "preencha os campos destacados"
  const campoCep = document.getElementById("campo-cep");                    // campo do CEP
  const statusCep = document.getElementById("status-cep");                  // mensagem ao lado do CEP ("Buscando...")
  const campoUf = document.getElementById("campo-uf");                      // lista de estados
  const campoParcelas = document.getElementById("campo-parcelas");          // caixa com a escolha de parcelas
  const selectParcelas = document.getElementById("campo-parcelas-select");  // lista de parcelas (1x, 2x, 3x)
  const avisoEnviado = document.getElementById("aviso-enviado");            // mensagem que aparece depois de enviar
  const etapasIndicador = document.querySelectorAll("#sacola-etapas li");   // os 3 passos no topo
  const secoes = painel.querySelectorAll(".etapa");                         // as 3 seções de conteúdo

  const ETAPAS = ["itens", "dados", "pagamento"];                           // ordem das etapas
  const TITULOS = { itens: "Sua sacola", dados: "Entrega e pagamento", pagamento: "Pagamento" };  // título de cada etapa
  const ESTADOS = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
    "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];  // as 27 siglas, em ordem alfabética
  let etapaAtual = "itens";                                                 // começa na lista de itens
  let pedido = null;                                                        // guarda o pedido montado na etapa de pagamento
  let elementoAntesDeAbrir = null;                                          // quem tinha o foco antes de abrir (para devolver ao fechar)

  campoUf.innerHTML = `<option value="">UF</option>` +                      // primeira opção vazia ("UF")
    ESTADOS.map((uf) => `<option value="${uf}">${uf}</option>`).join("");   // uma opção para cada estado

  // ---------- 2. Contas de dinheiro ----------
  const arredondar = (valor) => Math.round(valor * 100) / 100;              // arredonda para 2 casas (centavos)
  const comDescontoPix = (valor) => arredondar(valor * (1 - CONFIG_LOJA.descontoPix));  // aplica o desconto do Pix
  const porcentagemPix = Math.round(CONFIG_LOJA.descontoPix * 100) + "%";   // ex.: 0.05 vira "5%"

  // Calcula o frete. Devolve:
  //   número    → valor do frete (0 = grátis)
  //   null      → "a combinar" (modo combinar)
  //   undefined → ainda não dá para saber (falta o estado)
  function calcularFrete(subtotal, uf) {                                    // recebe o valor das peças e a sigla do estado
    const regras = CONFIG_LOJA.frete;                                       // regras do config.js
    if (regras.modo === "combinar") return null;                            // modo combinar: frete fica para o WhatsApp
    if (regras.gratisAcimaDe > 0 && subtotal >= regras.gratisAcimaDe) return 0;  // passou do valor mínimo: grátis
    if (!uf) return undefined;                                              // sem estado ainda: não dá para calcular
    return regras.porEstado[uf] ?? regras.valorPadrao;                      // valor do estado ou, se não tiver, o padrão ("??" = "se não existir, use")
  }

  function textoFrete(frete) {                                              // transforma o frete em texto para a tela
    if (frete === null) return "a combinar";                                // modo combinar
    if (frete === undefined) return "calculado no endereço";                // falta o estado
    if (frete === 0) return "Grátis";                                       // frete grátis
    return formatarPreco(frete);                                            // valor, ex.: "R$ 19,90"
  }

  function calcularTotais() {                                               // junta todas as contas num lugar só
    const subtotal = arredondar(Sacola.valorTotal());                       // soma das peças
    const frete = calcularFrete(subtotal, campoUf.value);                   // frete pelo estado escolhido
    const valorFrete = typeof frete === "number" ? frete : 0;               // para somar: "a combinar"/"sem estado" contam como 0
    return {                                                                // devolve um objeto com tudo
      subtotal,                                                             // peças
      frete,                                                                // frete (número, null ou undefined)
      totalPix: arredondar(comDescontoPix(subtotal) + valorFrete),          // Pix: desconto só nas peças + frete cheio
      totalCartao: arredondar(subtotal + valorFrete),                       // cartão: peças + frete
    };
  }

  document.getElementById("resumo-desconto").textContent = porcentagemPix;  // escreve "5%" no resumo
  document.getElementById("selo-desconto").textContent = porcentagemPix + " off";  // escreve "5% off" na opção Pix

  // ---------- 3. Abrir e fechar o painel ----------
  function abrir() {                                                        // abre a sacola
    elementoAntesDeAbrir = document.activeElement;                          // lembra onde estava o foco
    irParaEtapa("itens");                                                   // sempre começa pela lista de itens
    painel.classList.add("aberto");                                         // classe "aberto" faz o painel deslizar (CSS)
    painel.setAttribute("aria-hidden", "false");                            // avisa leitores de tela que está visível
    sombra.hidden = false;                                                  // mostra o fundo escuro
    document.body.classList.add("sem-rolagem");                             // trava a rolagem da página atrás
    botaoFechar.focus();                                                    // leva o foco para dentro do painel
  }

  function fechar() {                                                       // fecha a sacola
    if (!painel.classList.contains("aberto")) return;                       // se já está fechada, não faz nada
    painel.classList.remove("aberto");                                      // painel desliza para fora
    painel.setAttribute("aria-hidden", "true");                             // avisa leitores de tela que sumiu
    sombra.hidden = true;                                                   // esconde o fundo escuro
    document.body.classList.remove("sem-rolagem");                          // libera a rolagem
    elementoAntesDeAbrir?.focus();                                          // devolve o foco para onde estava
  }

  botaoAbrir.addEventListener("click", abrir);                              // clique no ícone da sacola abre
  botaoFechar.addEventListener("click", fechar);                            // clique no X fecha
  sombra.addEventListener("click", fechar);                                 // clique no fundo escuro fecha
  document.addEventListener("keydown", (e) => {                             // tecla apertada em qualquer lugar...
    if (e.key === "Escape") fechar();                                       // ...se for Esc, fecha
  });
  document.getElementById("sacola-ver-colecao").addEventListener("click", () => {  // botão "Ver a coleção" da sacola vazia
    fechar();                                                               // fecha a sacola
    document.getElementById("colecao").scrollIntoView({ behavior: "smooth" });  // rola até o catálogo
  });

  // ---------- 4. Trocar de etapa ----------
  function irParaEtapa(etapa) {                                             // mostra só a etapa pedida
    etapaAtual = etapa;                                                     // guarda qual é a etapa atual
    secoes.forEach((s) => (s.hidden = s.dataset.etapa !== etapa));          // esconde todas as seções menos a atual
    titulo.textContent = TITULOS[etapa];                                    // troca o título do topo
    botaoVoltar.hidden = etapa === "itens";                                 // seta de voltar só aparece depois da 1ª etapa

    const posicao = ETAPAS.indexOf(etapa);                                  // número da etapa (0, 1 ou 2)
    etapasIndicador.forEach((li, i) => {                                    // para cada passo do indicador...
      li.classList.toggle("feita", i < posicao);                            // ...marca como feito se já passou
      li.classList.toggle("atual", i === posicao);                          // ...destaca se é o atual
    });

    botaoAvancar.hidden = etapa === "pagamento";                            // na última etapa, o botão principal some...
    botaoWhatsapp.hidden = etapa !== "pagamento";                           // ...e aparece o botão do WhatsApp
    botaoAvancar.textContent = etapa === "itens" ? "Finalizar pedido" : "Ir para o pagamento";  // texto do botão principal
    avisoEnviado.hidden = true;                                             // esconde o aviso de "pedido enviado"
    painel.querySelector(".sacola__corpo").scrollTop = 0;                   // volta o conteúdo para o topo
  }

  botaoVoltar.addEventListener("click", () => {                             // clique na seta de voltar
    const anterior = ETAPAS[ETAPAS.indexOf(etapaAtual) - 1];                // pega a etapa anterior
    if (anterior) irParaEtapa(anterior);                                    // e vai para ela
  });

  // ---------- 5. Desenhar a lista de itens e o resumo ----------
  function desenhar() {                                                     // redesenha a sacola (chamada sempre que ela muda)
    const itens = Sacola.itensDetalhados();                                 // pega os itens com os dados dos produtos

    lista.innerHTML = itens                                                 // monta o HTML de cada item
      .map((item, indice) => `
        <li class="item">
          <img class="item__foto" src="${item.produto.imagem}" alt="">
          <div class="item__info">
            <p class="item__nome">${item.produto.nome}</p>
            <p class="item__detalhe">Tamanho ${item.tamanho} · ${item.produto.cor}</p>
            <div class="item__quantidade" role="group" aria-label="Quantidade de ${item.produto.nome}">
              <button type="button" data-acao="menos" data-indice="${indice}" aria-label="Diminuir">−</button>
              <span>${item.quantidade}</span>
              <button type="button" data-acao="mais" data-indice="${indice}" aria-label="Aumentar">+</button>
            </div>
          </div>
          <div class="item__lado">
            <p class="item__preco">${formatarPreco(item.produto.preco * item.quantidade)}</p>
            <button class="link-simples" type="button" data-acao="remover" data-indice="${indice}">Remover</button>
          </div>
        </li>`)
      .join("");                                                            // junta tudo num texto só

    const estaVazia = itens.length === 0;                                   // a sacola está vazia?
    vazia.hidden = !estaVazia;                                              // mostra a mensagem de vazia, se for o caso
    rodape.hidden = estaVazia;                                              // sem itens, sem rodapé
    if (estaVazia && etapaAtual !== "itens") irParaEtapa("itens");          // se esvaziou no meio do caminho, volta ao início

    atualizarResumo();                                                      // atualiza os valores
  }

  function atualizarResumo() {                                              // escreve todos os valores na tela
    const t = calcularTotais();                                             // faz as contas
    const parcelas = CONFIG_LOJA.parcelasCartao;                            // número máximo de parcelas

    document.getElementById("resumo-subtotal").textContent = formatarPreco(t.subtotal);            // peças
    document.getElementById("resumo-frete").textContent = textoFrete(t.frete);                     // frete
    document.getElementById("resumo-pix").textContent = formatarPreco(t.totalPix);                 // total no Pix
    document.getElementById("resumo-cartao").textContent = `${parcelas}x de ${formatarPreco(t.totalCartao / parcelas)}`;  // total no cartão
    document.getElementById("valor-pix").textContent = formatarPreco(t.totalPix);                  // valor na opção Pix
    document.getElementById("valor-cartao").textContent = `até ${parcelas}x de ${formatarPreco(t.totalCartao / parcelas)}`;  // valor na opção cartão

    const parcelaEscolhida = selectParcelas.value || String(parcelas);      // lembra a parcela escolhida (ou o máximo)
    selectParcelas.innerHTML = Array.from({ length: parcelas }, (_, i) => i + 1)  // cria a lista [1, 2, 3]
      .map((n) => `<option value="${n}">${n}x de ${formatarPreco(t.totalCartao / n)}${n > 1 ? " sem juros" : ""}</option>`)  // uma opção por parcela
      .join("");                                                            // junta as opções
    selectParcelas.value = parcelaEscolhida;                                // mantém a escolha
  }

  lista.addEventListener("click", (e) => {                                  // um único "ouvinte" para todos os botões da lista
    const botao = e.target.closest("button[data-acao]");                    // descobre qual botão foi clicado
    if (!botao) return;                                                     // clicou fora de um botão: ignora
    const indice = Number(botao.dataset.indice);                            // posição do item na sacola
    if (botao.dataset.acao === "mais") Sacola.alterarQuantidade(indice, +1);   // botão +
    if (botao.dataset.acao === "menos") Sacola.alterarQuantidade(indice, -1);  // botão −
    if (botao.dataset.acao === "remover") Sacola.remover(indice);           // "Remover"
  });

  Sacola.quandoMudar(desenhar);                                             // sempre que a sacola mudar, redesenha
  desenhar();                                                               // desenha pela primeira vez

  // ---------- 6. CEP: máscara e busca automática do endereço ----------
  campoCep.addEventListener("input", () => {                                // a cada tecla no campo do CEP
    const numeros = campoCep.value.replace(/\D/g, "").slice(0, 8);          // tira tudo que não é número e limita a 8 dígitos
    campoCep.value = numeros.length > 5                                     // coloca o traço depois do 5º número...
      ? `${numeros.slice(0, 5)}-${numeros.slice(5)}`                        // ...ex.: "01001-000"
      : numeros;                                                            // ...ou deixa só os números
    if (numeros.length === 8) buscarCep(numeros);                           // CEP completo: busca o endereço
    else statusCep.textContent = "";                                        // incompleto: limpa a mensagem
  });

  async function buscarCep(cep) {                                           // "async" = função que espera respostas da internet
    statusCep.textContent = "Buscando endereço…";                           // avisa que está buscando
    const controle = new AbortController();                                 // permite cancelar a busca
    const limite = setTimeout(() => controle.abort(), 6000);                // desiste depois de 6 segundos
    try {                                                                   // tenta buscar
      const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: controle.signal });  // pergunta ao ViaCEP (serviço gratuito)
      const dados = await resposta.json();                                  // lê a resposta (formato JSON)
      if (dados.erro) {                                                     // o ViaCEP responde "erro" quando o CEP não existe
        statusCep.textContent = "CEP não encontrado. Confira ou preencha à mão.";
        return;                                                             // para aqui
      }
      preencher("campo-rua", dados.logradouro);                             // rua
      preencher("campo-bairro", dados.bairro);                              // bairro
      preencher("campo-cidade", dados.localidade);                          // cidade
      campoUf.value = dados.uf || "";                                       // estado
      statusCep.textContent = "Endereço encontrado ✓";                      // confirma
      atualizarResumo();                                                    // o estado mudou: recalcula o frete
      document.getElementById("campo-numero").focus();                      // leva o cursor para o número (o CEP não traz)
    } catch (erro) {                                                        // sem internet, bloqueado ou demorou demais
      statusCep.textContent = "Não conseguimos buscar o CEP. Preencha o endereço à mão.";
    } finally {                                                             // "finally" roda sempre, dando certo ou não
      clearTimeout(limite);                                                 // cancela o relógio de 6 segundos
    }
  }

  function preencher(id, valor) {                                           // coloca um valor num campo, se vier algum
    const campo = document.getElementById(id);                              // acha o campo
    if (valor) {                                                            // se o ViaCEP mandou esse dado...
      campo.value = valor;                                                  // ...preenche
      campo.removeAttribute("aria-invalid");                                // ...e tira a marcação de erro
    }
  }

  // ---------- 7. Formulário: parcelas, frete e erros ----------
  form.addEventListener("change", (e) => {                                  // quando algo muda no formulário
    const pagamento = form.elements.pagamento.value;                        // "pix" ou "cartao"
    campoParcelas.hidden = pagamento !== "cartao";                          // parcelas só aparecem para cartão
    if (e.target === campoUf) atualizarResumo();                            // mudou o estado: recalcula o frete
  });

  form.addEventListener("input", (e) => {                                   // enquanto a cliente digita em qualquer campo...
    e.target.removeAttribute("aria-invalid");                               // ...tira a marcação de erro daquele campo
    if (!form.querySelector("[aria-invalid='true']")) erroFormulario.hidden = true;  // sem erros: some o aviso geral
  });

  function validarFormulario() {                                            // confere os campos obrigatórios
    const obrigatorios = form.querySelectorAll("[required]");               // todos os campos com "required" no HTML
    let primeiroErro = null;                                                // guarda o primeiro campo com problema
    obrigatorios.forEach((campo) => {                                       // para cada campo obrigatório...
      let valido = campo.value.trim() !== "";                               // ...está preenchido?
      if (campo === campoCep) valido = campo.value.replace(/\D/g, "").length === 8;  // CEP precisa ter 8 números
      if (valido) campo.removeAttribute("aria-invalid");                    // preenchido: tira a marcação de erro
      else campo.setAttribute("aria-invalid", "true");                      // vazio: marca como inválido (borda magenta no CSS)
      if (!valido && !primeiroErro) primeiroErro = campo;                   // lembra o primeiro erro
    });
    erroFormulario.hidden = !primeiroErro;                                  // mostra o aviso geral se tiver erro
    if (primeiroErro) primeiroErro.focus();                                 // leva o cursor até o primeiro erro
    return !primeiroErro;                                                   // true = tudo certo
  }

  // ---------- 8. Botão principal (avançar) ----------
  botaoAvancar.addEventListener("click", () => {                            // clique no botão principal
    if (etapaAtual === "itens") return irParaEtapa("dados");                // da lista → para os dados
    if (etapaAtual === "dados") {                                           // dos dados → para o pagamento
      if (!validarFormulario()) return;                                     // faltou algo: não avança
      montarPedido();                                                       // cria o pedido (número, valores, Pix)
      irParaEtapa("pagamento");                                             // vai para a última etapa
    }
  });

  // ---------- 9. Montar o pedido ----------
  function gerarNumeroPedido() {                                            // cria um código único, ex.: "MF8K2J4Q"
    return "MF" + Date.now().toString(36).toUpperCase().slice(-6);          // "MF" + data/hora em base 36 (letras e números)
  }

  function lerEndereco() {                                                  // junta os campos do endereço num objeto
    const valor = (nome) => form.elements[nome].value.trim();               // atalho: pega o valor de um campo pelo nome
    return {
      cep: valor("cep"), rua: valor("rua"), numero: valor("numero"),        // CEP, rua e número
      complemento: valor("complemento"), bairro: valor("bairro"),           // complemento e bairro
      cidade: valor("cidade"), uf: valor("uf"),                             // cidade e estado
    };
  }

  function enderecoEmTexto(e) {                                             // transforma o endereço em texto corrido
    const complemento = e.complemento ? `, ${e.complemento}` : "";          // só põe o complemento se tiver
    return `${e.rua}, ${e.numero}${complemento} – ${e.bairro}, ${e.cidade}/${e.uf} – CEP ${e.cep}`;
  }

  function montarPedido() {                                                 // junta tudo o que foi escolhido
    const t = calcularTotais();                                             // valores atualizados
    const formaPagamento = form.elements.pagamento.value;                   // "pix" ou "cartao"
    const parcelas = Number(selectParcelas.value);                          // número de parcelas escolhido

    pedido = {                                                              // objeto com todos os dados do pedido
      numero: gerarNumeroPedido(),                                          // número do pedido
      nome: form.elements.nome.value.trim(),                                // nome da cliente
      endereco: lerEndereco(),                                              // endereço de entrega
      observacao: form.elements.observacao.value.trim(),                    // observação (pode ficar vazia)
      itens: Sacola.itensDetalhados(),                                      // cópia dos itens
      subtotal: t.subtotal,                                                 // valor das peças
      frete: t.frete,                                                       // frete (número ou null = a combinar)
      formaPagamento,                                                       // forma escolhida
      parcelas,                                                             // parcelas (usado no cartão)
      valorFinal: formaPagamento === "pix" ? t.totalPix : t.totalCartao,    // valor a pagar
      codigoPix: null,                                                      // preenchido logo abaixo, se for Pix
    };

    document.getElementById("pedido-numero").textContent = "#" + pedido.numero;           // mostra o número
    document.getElementById("entrega-endereco").textContent = enderecoEmTexto(pedido.endereco);  // mostra o endereço

    const ehPix = formaPagamento === "pix";                                 // escolheu Pix?
    document.getElementById("bloco-pix").hidden = !ehPix;                   // mostra o bloco do Pix...
    document.getElementById("bloco-cartao").hidden = ehPix;                 // ...ou o bloco do cartão

    if (ehPix) {                                                            // se for Pix:
      pedido.codigoPix = gerarPixCopiaECola({                               // gera o código copia e cola (pix.js)
        chave: CONFIG_LOJA.pix.chave,                                       // chave da loja
        nome: CONFIG_LOJA.pix.nomeRecebedor,                                // nome do recebedor
        cidade: CONFIG_LOJA.pix.cidade,                                     // cidade
        valor: pedido.valorFinal,                                           // valor (peças com desconto + frete)
        identificador: pedido.numero,                                       // número do pedido (aparece no extrato)
      });
      document.getElementById("pix-codigo").value = pedido.codigoPix;       // coloca o código na caixa de texto
      document.getElementById("pix-valor").textContent =                    // mostra o valor...
        formatarPreco(pedido.valorFinal) + (pedido.frete === null ? " (frete à parte)" : "");  // ...avisando se o frete é à parte
      desenharQRCode(pedido.codigoPix);                                     // desenha o QR Code
    } else {                                                                // se for cartão:
      document.getElementById("cartao-resumo").textContent =                // escreve o resumo das parcelas
        `cartão de crédito em ${parcelas}x de ${formatarPreco(pedido.valorFinal / parcelas)}`;
    }

    botaoWhatsapp.href = linkWhatsapp(mensagemPedido());                    // prepara o link do WhatsApp com a mensagem
  }

  // ---------- 10. Desenhar o QR Code (em SVG) ----------
  function desenharQRCode(texto) {                                          // transforma o código Pix em QR Code
    const destino = document.getElementById("pix-qrcode");                  // onde o QR vai aparecer
    if (typeof GeradorQRCode !== "function") {                              // se a biblioteca não carregou...
      destino.innerHTML = "<p>Use o código copia e cola abaixo.</p>";       // ...mostra só o aviso (o copia e cola continua funcionando)
      return;                                                               // e para aqui
    }
    const matriz = GeradorQRCode(texto);                                    // matriz de quadradinhos (true = preto)
    const margem = 4;                                                       // borda branca obrigatória ao redor do QR (4 quadradinhos)
    const tamanho = matriz.length + margem * 2;                             // tamanho total, contando a borda
    let quadrados = "";                                                     // aqui vamos juntar o desenho dos quadradinhos pretos
    matriz.forEach((linha, y) => {                                          // para cada linha...
      linha.forEach((preto, x) => {                                         // ...e cada coluna
        if (preto) quadrados += `M${x + margem} ${y + margem}h1v1h-1z`;     // desenha um quadradinho 1x1 na posição certa
      });
    });
    destino.innerHTML = `
      <svg viewBox="0 0 ${tamanho} ${tamanho}" shape-rendering="crispEdges" aria-hidden="true">
        <rect width="100%" height="100%" fill="#ffffff"/>
        <path d="${quadrados}" fill="#100D16"/>
      </svg>`;                                                              // fundo branco + quadradinhos escuros
  }

  // ---------- 11. Copiar o código Pix ----------
  document.getElementById("pix-copiar").addEventListener("click", async (e) => {  // clique em "Copiar código Pix"
    const botao = e.currentTarget;                                          // o próprio botão
    const caixa = document.getElementById("pix-codigo");                    // a caixa com o código
    try {                                                                   // tenta usar a área de transferência moderna
      await navigator.clipboard.writeText(caixa.value);                     // copia o texto
    } catch (erro) {                                                        // se o navegador não permitir...
      caixa.select();                                                       // ...seleciona o texto da caixa
      document.execCommand("copy");                                         // ...e usa o método antigo de copiar
    }
    botao.textContent = "Código copiado ✓";                                 // confirma para a cliente
    setTimeout(() => (botao.textContent = "Copiar código Pix"), 2500);      // volta ao texto normal depois de 2,5 s
  });

  // ---------- 12. Mensagem do WhatsApp ----------
  function mensagemPedido() {                                               // monta o texto que vai para o WhatsApp
    const linhas = [];                                                      // cada posição é uma linha da mensagem
    linhas.push(`Olá, ${CONFIG_LOJA.nomeLoja}! Quero finalizar meu pedido *#${pedido.numero}*:`);  // *texto* = negrito no WhatsApp
    linhas.push("");                                                        // linha em branco
    pedido.itens.forEach((i) => {                                           // uma linha por peça
      const qtd = i.quantidade > 1 ? `${i.quantidade}x ` : "";              // mostra "2x" só se tiver mais de uma
      linhas.push(`• ${qtd}${i.produto.nome} · tam. ${i.tamanho} · ${formatarPreco(i.produto.preco * i.quantidade)}`);
    });
    linhas.push("");                                                        // linha em branco
    linhas.push(`Peças: ${formatarPreco(pedido.subtotal)}`);                // valor das peças
    linhas.push(`Frete: ${pedido.frete === null ? "a combinar" : textoFrete(pedido.frete)}`);  // frete

    if (pedido.formaPagamento === "pix") {                                  // se for Pix:
      linhas.push(`Pagamento: *Pix (${porcentagemPix} off nas peças) → ${formatarPreco(pedido.valorFinal)}*`);  // forma e valor
      linhas.push("");                                                      // linha em branco
      linhas.push("Código Pix copia e cola:");                              // título do código
      linhas.push(pedido.codigoPix);                                        // o código em si
    } else {                                                                // se for cartão:
      linhas.push(`Pagamento: *Cartão em ${pedido.parcelas}x de ${formatarPreco(pedido.valorFinal / pedido.parcelas)}* (total ${formatarPreco(pedido.valorFinal)})`);
      linhas.push("Aguardo o link de pagamento. 🙂");                       // pede o link para a lojista
    }

    linhas.push("");                                                        // linha em branco
    linhas.push(`*Entrega para:* ${pedido.nome}`);                          // nome da cliente
    linhas.push(enderecoEmTexto(pedido.endereco));                          // endereço completo
    if (pedido.observacao) linhas.push(`Observação: ${pedido.observacao}`); // observação, se tiver
    return linhas.join("\n");                                               // junta tudo com quebra de linha
  }

  function linkWhatsapp(texto) {                                            // cria o endereço que abre o WhatsApp
    return `https://wa.me/${CONFIG_LOJA.whatsapp}?text=${encodeURIComponent(texto)}`;  // encodeURIComponent "traduz" espaços e acentos para caber num link
  }

  botaoWhatsapp.addEventListener("click", () => {                           // quando a cliente clica para enviar
    avisoEnviado.hidden = false;                                            // mostra a mensagem "Pedido enviado?"
  });

  document.getElementById("concluir-pedido").addEventListener("click", () => {  // "Concluir e esvaziar a sacola"
    Sacola.esvaziar();                                                      // limpa a sacola
    form.reset();                                                           // limpa o formulário
    statusCep.textContent = "";                                             // limpa a mensagem do CEP
    campoParcelas.hidden = true;                                            // esconde as parcelas de novo
    fechar();                                                               // fecha o painel
  });
}

document.addEventListener("DOMContentLoaded", iniciarCheckout);             // roda quando o HTML terminar de carregar
