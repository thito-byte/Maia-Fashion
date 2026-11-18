/* =========================================================
   SACOLA E FAVORITOS — guarda o que a cliente escolheu
   ---------------------------------------------------------
   Este arquivo só cuida dos DADOS da sacola (o que tem
   dentro, quantidades e total). Quem desenha a tela da
   sacola é o checkout.js.

   Os itens ficam salvos no navegador da cliente
   (localStorage): se ela recarregar a página, não perde nada.
   ========================================================= */

const Sacola = (() => {                                          // "módulo": tudo aqui dentro fica protegido; só sai o que está no "return"
  const CHAVE_SALVAR = "maia-sacola";                            // nome usado para salvar a sacola no navegador
  const itens = carregar();                                      // lista de itens, ex.: [{ id: "vestido-luna", tamanho: "M", quantidade: 1 }]
  const favoritos = new Set();                                   // conjunto com os ids dos produtos favoritados (Set não aceita repetidos)
  const ouvintes = [];                                           // funções que querem ser avisadas quando a sacola mudar

  const contadorSacola = document.getElementById("contador-sacola");        // bolinha com número no ícone da sacola
  const contadorFavoritos = document.getElementById("contador-favoritos");  // bolinha com número no ícone de favoritos
  const botaoSacola = document.getElementById("botao-sacola");              // botão da sacola no cabeçalho
  const aviso = document.getElementById("aviso");                           // caixinha de aviso que aparece embaixo da tela
  let temporizadorAviso = null;                                  // guarda o "relógio" do aviso para poder reiniciá-lo

  // ---------- Salvar e carregar do navegador ----------
  function carregar() {                                          // lê a sacola salva (se existir)
    try {                                                        // "try": tenta; se der erro, vai para o "catch"
      const salvo = localStorage.getItem(CHAVE_SALVAR);          // pega o texto salvo
      const lista = salvo ? JSON.parse(salvo) : [];              // transforma o texto de volta em lista (ou começa vazia)
      return lista.filter((i) => PRODUTOS.some((p) => p.id === i.id));  // descarta itens de produtos que não existem mais
    } catch (erro) {                                             // se o navegador bloquear o armazenamento...
      return [];                                                 // ...começa com a sacola vazia, sem quebrar o site
    }
  }

  function salvar() {                                            // grava a sacola atual no navegador
    try {                                                        // tenta salvar
      localStorage.setItem(CHAVE_SALVAR, JSON.stringify(itens)); // transforma a lista em texto e guarda
    } catch (erro) {                                             // se não der para salvar...
      /* sem problema: a sacola continua funcionando até recarregar */
    }
  }

  // ---------- Avisar quem depende da sacola ----------
  function quandoMudar(funcao) {                                 // outro arquivo "se inscreve" para ser avisado
    ouvintes.push(funcao);                                       // guarda a função na lista de ouvintes
  }

  function mudou() {                                             // chamada sempre que algo muda na sacola
    salvar();                                                    // salva no navegador
    atualizarContadorSacola();                                   // atualiza a bolinha do cabeçalho
    ouvintes.forEach((funcao) => funcao());                      // avisa todos os ouvintes (ex.: a tela da sacola se redesenha)
  }

  // ---------- Contadores do cabeçalho ----------
  function mostrarNumero(elemento, numero) {                     // escreve o número na bolinha
    elemento.textContent = numero;                               // coloca o número
    elemento.hidden = numero === 0;                              // esconde a bolinha quando é zero
  }

  function atualizarContadorSacola() {                           // conta as peças e atualiza o ícone
    const total = quantidadeTotal();                             // soma as quantidades
    mostrarNumero(contadorSacola, total);                        // mostra na bolinha
    botaoSacola.setAttribute("aria-label", `Sacola, ${total} ${total === 1 ? "item" : "itens"}`);  // texto para leitores de tela
  }

  // ---------- Aviso na tela ----------
  function mostrarAviso(mensagem) {                              // mostra uma mensagem por 3 segundos
    aviso.textContent = mensagem;                                // escreve a mensagem
    aviso.classList.add("visivel");                              // a classe "visivel" faz o aviso aparecer (CSS)
    clearTimeout(temporizadorAviso);                             // cancela o relógio anterior, se houver
    temporizadorAviso = setTimeout(() => aviso.classList.remove("visivel"), 3000);  // some depois de 3 segundos
  }

  // ---------- Ações da sacola ----------
  function adicionar(produto, tamanho) {                         // coloca uma peça na sacola
    const existente = itens.find((i) => i.id === produto.id && i.tamanho === tamanho);  // já tem essa peça nesse tamanho?
    if (existente) existente.quantidade += 1;                    // se tem, só aumenta a quantidade
    else itens.push({ id: produto.id, tamanho, quantidade: 1 }); // se não tem, acrescenta um item novo

    botaoSacola.classList.remove("pulsar");                      // tira a animação (para poder repetir)
    void botaoSacola.offsetWidth;                                // "truque" que reinicia a animação
    botaoSacola.classList.add("pulsar");                         // ícone da sacola dá uma pulsada

    mostrarAviso(`${produto.nome} · tamanho ${tamanho} adicionado à sacola`);  // mensagem de confirmação
    mudou();                                                     // salva e avisa todo mundo
  }

  function alterarQuantidade(indice, diferenca) {                // aumenta (+1) ou diminui (-1) um item
    const item = itens[indice];                                  // pega o item pela posição na lista
    if (!item) return;                                           // se não existir, não faz nada
    item.quantidade += diferenca;                                // soma ou subtrai
    if (item.quantidade <= 0) itens.splice(indice, 1);           // se chegou a zero, tira o item da lista
    mudou();                                                     // salva e avisa
  }

  function remover(indice) {                                     // tira um item da sacola
    itens.splice(indice, 1);                                     // remove 1 item na posição indicada
    mudou();                                                     // salva e avisa
  }

  function esvaziar() {                                          // tira tudo da sacola
    itens.length = 0;                                            // zera a lista
    mudou();                                                     // salva e avisa
  }

  // ---------- Cálculos ----------
  function quantidadeTotal() {                                   // quantas peças no total
    return itens.reduce((soma, i) => soma + i.quantidade, 0);    // soma a quantidade de cada item
  }

  function valorTotal() {                                        // valor total da sacola (sem desconto)
    return itens.reduce((soma, i) => {                           // percorre os itens somando
      const produto = PRODUTOS.find((p) => p.id === i.id);       // encontra o produto para saber o preço
      return soma + produto.preco * i.quantidade;                // preço x quantidade
    }, 0);                                                       // começa a soma do zero
  }

  function itensDetalhados() {                                   // lista pronta para desenhar na tela
    return itens.map((i) => ({                                   // para cada item...
      ...i,                                                      // ...copia id, tamanho e quantidade
      produto: PRODUTOS.find((p) => p.id === i.id),              // ...e junta os dados do produto (nome, foto, preço)
    }));
  }

  // ---------- Favoritos ----------
  function alternarFavorito(produto) {                           // liga/desliga o coração
    const agora = !favoritos.has(produto.id);                    // se não era favorito, passa a ser (e vice-versa)
    if (agora) favoritos.add(produto.id);                        // adiciona aos favoritos
    else favoritos.delete(produto.id);                           // ou remove
    mostrarNumero(contadorFavoritos, favoritos.size);            // atualiza a bolinha do coração
    return agora;                                                // devolve o novo estado (true = favoritado)
  }

  const ehFavorito = (id) => favoritos.has(id);                  // pergunta: este produto é favorito?

  atualizarContadorSacola();                                     // ao abrir a página, mostra o número de itens salvos

  return {                                                       // o que os outros arquivos podem usar:
    adicionar, alterarQuantidade, remover, esvaziar,             // ações
    quantidadeTotal, valorTotal, itensDetalhados,                // cálculos
    alternarFavorito, ehFavorito, quandoMudar,                   // favoritos e "avisos"
  };
})();
