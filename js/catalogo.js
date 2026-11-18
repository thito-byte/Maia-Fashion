/* =========================================================
   CATÁLOGO — abas, filtros, ordenação e grade
   ---------------------------------------------------------
   Como funciona (o "ciclo"):
   1. A cliente clica em algo (aba, filtro, ordenação).
   2. Atualizamos o ESTADO (o objeto "filtros" abaixo).
   3. Chamamos atualizar(): ele filtra, ordena e redesenha.
   Sempre o mesmo caminho: evento → estado → desenhar.
   ========================================================= */

function iniciarCatalogo() {                                                 // função principal do catálogo
  // ---------- 1. Estado: o que a cliente escolheu ----------
  const filtros = {                                                          // tudo que a cliente escolheu fica aqui
    categoria: "todos",                                                      // aba selecionada
    tamanhos: new Set(),                                                     // tamanhos marcados, ex.: {"M", "G"}
    cores: new Set(),                                                        // cores marcadas, ex.: {"Preto"}
    preco: "todos",                                                          // faixa de preço, ex.: "250-400"
    soDisponiveis: false,                                                    // "mostrar só peças disponíveis"
    ordem: "novidades",                                                      // ordenação escolhida
  };

  // ---------- 2. Elementos do HTML ----------
  const el = {                                                               // guardamos os elementos num objeto para achar fácil
    abas: document.getElementById("abas"),                                   // container das abas
    grade: document.getElementById("grade"),                                 // container dos cards
    contagem: document.getElementById("contagem"),                           // "Você está vendo X de Y peças"
    totalPecas: document.getElementById("total-pecas"),                      // número no subtítulo
    vazio: document.getElementById("estado-vazio"),                          // mensagem de "nenhuma peça"
    opcoesTamanho: document.getElementById("opcoes-tamanho"),                // onde entram os chips de tamanho
    opcoesCor: document.getElementById("opcoes-cor"),                        // onde entram as opções de cor
    soDisponiveis: document.getElementById("so-disponiveis"),                // caixinha de disponibilidade
    ordenar: document.getElementById("ordenar"),                             // lista de ordenação
    ativos: document.getElementById("filtros-ativos"),                       // etiquetas dos filtros ativos
    painel: document.getElementById("painel-filtros"),                       // bloco com todos os filtros
    abrirFiltros: document.getElementById("abrir-filtros"),                  // botão "Filtrar" (celular)
    fecharFiltros: document.getElementById("fechar-filtros"),                // X da gaveta (celular)
    verResultados: document.getElementById("ver-resultados"),                // botão "Ver X peças" (celular)
    verQuantidade: document.getElementById("ver-quantidade"),                // número dentro desse botão
    contadorFiltros: document.getElementById("contador-filtros"),            // bolinha com nº de filtros (celular)
    sombra: document.getElementById("sombra-filtros"),                       // fundo escuro da gaveta
  };

  const reduzirMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;  // pessoa pediu menos animação?
  const porcentagemPix = Math.round(CONFIG_LOJA.descontoPix * 100);          // ex.: 0.05 → 5
  el.totalPecas.textContent = PRODUTOS.length;                               // escreve o total de peças no subtítulo

  // ---------- 3. Montar as opções dos filtros a partir dos dados ----------
  const todosTamanhos = LOJA.ordemTamanhos.filter((t) =>                     // pega a ordem PP → GG...
    PRODUTOS.some((p) => p.tamanhos.includes(t)));                           // ...e mantém só os tamanhos que existem em alguma peça
  el.opcoesTamanho.innerHTML = todosTamanhos                                 // cria um chip para cada tamanho
    .map((t) => `<label class="opcao-chip"><input type="checkbox" name="tamanho" value="${t}"><span>${t}</span></label>`)
    .join("");                                                               // junta tudo num texto só

  const todasCores = [...new Set(PRODUTOS.map((p) => p.cor))];               // lista de cores sem repetição
  el.opcoesCor.innerHTML = todasCores                                        // cria uma opção para cada cor
    .map((c) => `<label class="opcao"><input type="checkbox" name="cor" value="${c}"><span><i class="amostra-cor" style="background:${LOJA.coresAmostra[c] || "#888"}"></i>${c}</span></label>`)
    .join("");

  // ---------- 4. Filtrar ----------
  function filtrar(lista, ignorarCategoria = false) {                        // devolve só os produtos que passam nos filtros
    return lista.filter((p) => {                                             // testa cada produto
      if (!ignorarCategoria && filtros.categoria !== "todos" && p.categoria !== filtros.categoria) return false;  // categoria diferente: fora

      if (filtros.tamanhos.size > 0) {                                       // se algum tamanho foi marcado...
        const temTamanho = [...filtros.tamanhos].some((t) =>                 // ...a peça precisa ter pelo menos um deles...
          p.tamanhos.includes(t) && !p.esgotados.includes(t));               // ...e esse tamanho não pode estar esgotado
        if (!temTamanho) return false;                                       // senão: fora
      }

      if (filtros.cores.size > 0 && !filtros.cores.has(p.cor)) return false; // cor não marcada: fora

      if (filtros.preco !== "todos") {                                       // se escolheu uma faixa de preço...
        const [min, max] = filtros.preco.split("-").map(Number);             // ..."250-400" vira [250, 400]
        if (p.preco < min || p.preco > max) return false;                    // fora da faixa: fora
      }

      if (filtros.soDisponiveis && !estaDisponivel(p)) return false;         // só disponíveis e a peça esgotou: fora
      return true;                                                           // passou em tudo: fica
    });
  }

  // ---------- 5. Ordenar ----------
  function ordenar(lista) {                                                  // devolve a lista na ordem escolhida
    const copia = [...lista];                                                // faz uma cópia (nunca mexemos na original)
    if (filtros.ordem === "menor-preco") copia.sort((a, b) => a.preco - b.preco);  // do mais barato ao mais caro
    if (filtros.ordem === "maior-preco") copia.sort((a, b) => b.preco - a.preco);  // do mais caro ao mais barato
    if (filtros.ordem === "novidades") copia.sort((a, b) => b.lancamento.localeCompare(a.lancamento));  // data mais recente primeiro
    copia.sort((a, b) => estaDisponivel(b) - estaDisponivel(a));             // esgotadas sempre vão para o fim
    return copia;                                                            // devolve a lista ordenada
  }

  // ---------- 6. Desenhar as abas ----------
  function desenharAbas() {                                                  // cria os botões das abas com os números
    const semCategoria = filtrar(PRODUTOS, true);                            // aplica os filtros, menos a categoria (para contar)
    el.abas.innerHTML = LOJA.categorias                                      // um botão para cada categoria
      .map((cat) => {
        const qtd = cat.id === "todos"                                       // quantas peças nessa aba?
          ? semCategoria.length                                              // "Todos": todas que passaram nos filtros
          : semCategoria.filter((p) => p.categoria === cat.id).length;       // outras: só as daquela categoria
        const ativa = filtros.categoria === cat.id;                          // é a aba selecionada?
        return `<button class="aba${ativa ? " aba--ativa" : ""}" type="button" data-categoria="${cat.id}" aria-pressed="${ativa}">
                  ${cat.nome}<span class="aba__contador">${String(qtd).padStart(2, "0")}</span>
                </button>`;                                                  // padStart deixa "8" como "08"
      })
      .join("");
  }

  // ---------- 7. Desenhar um card de produto ----------
  function cardProduto(p) {                                                  // devolve o HTML de um card
    const disponivel = estaDisponivel(p);                                    // tem estoque?
    const parcelas = CONFIG_LOJA.parcelasCartao;                             // nº de parcelas (config.js)
    const parcela = formatarPreco(p.preco / parcelas);                       // valor de cada parcela
    const precoPix = formatarPreco(p.preco * (1 - CONFIG_LOJA.descontoPix)); // preço com desconto do Pix
    const selo = p.selo === "novo" ? `<span class="selo selo--novo">Novo</span>`  // selo "Novo" (com filete magenta)
               : p.selo === "mais-amado" ? `<span class="selo">Mais amado</span>`  // selo "Mais amado"
               : "";                                                         // sem selo
    const favorito = Sacola.ehFavorito(p.id);                                // já está nos favoritos?

    const tamanhos = p.tamanhos                                              // botões de tamanho do card
      .map((t) => {
        const esgotado = p.esgotados.includes(t);                            // esse tamanho acabou?
        return `<button class="tamanho" type="button" data-tamanho="${t}" ${esgotado ? `disabled aria-label="${t} esgotado"` : ""}>${t}</button>`;  // esgotado = botão desativado
      })
      .join("");

    return `
      <article class="produto${disponivel ? "" : " produto--esgotado"}" id="produto-${p.id}" data-id="${p.id}">
        <div class="produto__midia">
          <img src="${p.imagem}" alt="${p.nome}, ${p.cor.toLowerCase()}, em ${p.tecido.toLowerCase()}" loading="lazy">
          ${disponivel ? selo : `<span class="selo selo--esgotado">Esgotado</span>`}

          <button class="produto__favorito" type="button" aria-pressed="${favorito}" aria-label="Favoritar ${p.nome}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>
          </button>

          ${disponivel ? `
          <button class="produto__adicionar" type="button" aria-expanded="false" aria-label="Escolher tamanho de ${p.nome}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8h12l-1 12H7L6 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/><path d="M12 12v5M9.5 14.5h5"/></svg>
          </button>
          <div class="produto__tamanhos" role="group" aria-label="Tamanhos de ${p.nome}">
            <p class="produto__tamanhos-titulo">Escolha o tamanho</p>
            <div class="produto__tamanhos-lista">${tamanhos}</div>
          </div>` : ""}
        </div>

        <h3 class="produto__nome">${p.nome}</h3>
        <p class="produto__detalhe">${p.cor} · ${p.tecido}</p>
        <p class="produto__preco">${formatarPreco(p.preco)}</p>
        <p class="produto__condicoes">${parcelas}x de ${parcela} no cartão<br><span>${precoPix} no Pix (${porcentagemPix}% off)</span></p>
      </article>`;                                                           // peças esgotadas não ganham botão de sacola
  }

  // ---------- 8. Etiquetas dos filtros ativos ----------
  function desenharAtivos() {                                                // mostra os filtros escolhidos como etiquetas
    const etiquetas = [];                                                    // lista de { texto, remover }
    filtros.tamanhos.forEach((t) => etiquetas.push({ texto: `Tamanho ${t}`, remover: () => filtros.tamanhos.delete(t) }));  // uma por tamanho
    filtros.cores.forEach((c) => etiquetas.push({ texto: c, remover: () => filtros.cores.delete(c) }));                   // uma por cor
    if (filtros.preco !== "todos") {                                         // faixa de preço escolhida?
      const rotulo = document.querySelector(`input[name="preco"][value="${filtros.preco}"]`).nextElementSibling.textContent;  // pega o texto da opção
      etiquetas.push({ texto: rotulo, remover: () => (filtros.preco = "todos") });
    }
    if (filtros.soDisponiveis) etiquetas.push({ texto: "Só disponíveis", remover: () => (filtros.soDisponiveis = false) });

    el.ativos.innerHTML = etiquetas                                          // desenha as etiquetas
      .map((e, i) => `<button class="etiqueta-filtro" type="button" data-indice="${i}" aria-label="Remover filtro ${e.texto}">${e.texto}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17"/></svg></button>`)
      .join("") + (etiquetas.length > 1 ? `<button class="limpar-tudo" type="button" data-limpar>Limpar tudo</button>` : "");  // "Limpar tudo" só com 2+ filtros

    el.ativos.querySelectorAll(".etiqueta-filtro").forEach((botao) => {      // para cada etiqueta...
      botao.addEventListener("click", () => {                                // ...ao clicar:
        etiquetas[botao.dataset.indice].remover();                           // remove o filtro do estado
        sincronizarCampos();                                                 // desmarca a caixinha correspondente
        atualizar();                                                         // redesenha
      });
    });
    el.ativos.querySelector("[data-limpar]")?.addEventListener("click", limparFiltros);  // "?." = só se o botão existir

    el.contadorFiltros.textContent = etiquetas.length;                       // número na bolinha do botão "Filtrar"
    el.contadorFiltros.hidden = etiquetas.length === 0;                      // esconde se não houver filtro
  }

  // ---------- 9. ATUALIZAR: o coração do catálogo ----------
  function atualizar() {                                                     // chamada depois de QUALQUER mudança
    const resultado = ordenar(filtrar(PRODUTOS));                            // filtra e depois ordena

    el.grade.innerHTML = resultado.map(cardProduto).join("");                // desenha os cards
    el.vazio.hidden = resultado.length > 0;                                  // mensagem de vazio só se não sobrou nada
    el.contagem.hidden = resultado.length === 0;                             // contagem some quando está vazio
    el.contagem.textContent = `Você está vendo ${resultado.length} de ${PRODUTOS.length} peças`;  // texto da contagem
    el.verQuantidade.textContent = resultado.length;                         // número no botão "Ver X peças"

    desenharAbas();                                                          // atualiza os números das abas
    desenharAtivos();                                                        // atualiza as etiquetas
    animarEntrada();                                                         // prepara a animação dos cards
  }

  // ---------- 10. Animação: cards surgem ao aparecer na tela ----------
  const observador = "IntersectionObserver" in window && !reduzirMovimento   // o navegador suporta e a pessoa não pediu menos movimento?
    ? new IntersectionObserver((entradas) => {                               // "observador" avisa quando um elemento aparece na tela
        entradas.forEach((entrada) => {                                      // para cada card observado...
          if (entrada.isIntersecting) {                                      // ...se apareceu na tela:
            entrada.target.classList.add("visivel");                         // adiciona "visivel" (o CSS faz ele subir e aparecer)
            observador.unobserve(entrada.target);                            // para de observar (anima só uma vez)
          }
        });
      }, { threshold: 0.15 })                                                // dispara quando 15% do card aparece
    : null;                                                                  // sem suporte: não usa observador

  function animarEntrada() {                                                 // liga a animação nos cards novos
    el.grade.querySelectorAll(".produto").forEach((card, i) => {             // para cada card...
      if (!observador) return card.classList.add("visivel");                 // ...sem observador: já mostra direto
      card.style.transitionDelay = `${(i % 4) * 90}ms`;                      // atraso em "cascata" (0, 90, 180, 270 ms por linha)
      observador.observe(card);                                              // começa a observar o card
    });
  }

  // ---------- 11. Manter os campos do formulário iguais ao estado ----------
  function sincronizarCampos() {                                             // marca/desmarca as caixinhas conforme o estado
    document.querySelectorAll('input[name="tamanho"]').forEach((i) => (i.checked = filtros.tamanhos.has(i.value)));
    document.querySelectorAll('input[name="cor"]').forEach((i) => (i.checked = filtros.cores.has(i.value)));
    document.querySelectorAll('input[name="preco"]').forEach((i) => (i.checked = i.value === filtros.preco));
    el.soDisponiveis.checked = filtros.soDisponiveis;
  }

  function limparFiltros() {                                                 // zera todos os filtros (menos a aba e a ordem)
    filtros.tamanhos.clear();                                                // tira todos os tamanhos
    filtros.cores.clear();                                                   // tira todas as cores
    filtros.preco = "todos";                                                 // volta para todos os preços
    filtros.soDisponiveis = false;                                           // desmarca disponibilidade
    sincronizarCampos();                                                     // atualiza as caixinhas
    atualizar();                                                             // redesenha
  }

  // ---------- 12. Eventos: abas, filtros e ordenação ----------
  el.abas.addEventListener("click", (e) => {                                 // clique em qualquer lugar das abas
    const aba = e.target.closest(".aba");                                    // descobre qual aba foi clicada
    if (!aba) return;                                                        // clicou fora de uma aba: ignora
    filtros.categoria = aba.dataset.categoria;                               // muda o estado
    atualizar();                                                             // redesenha
  });

  el.painel.addEventListener("change", (e) => {                              // qualquer caixinha/opção mudou nos filtros
    const campo = e.target;                                                  // o campo que mudou
    if (campo.name === "tamanho") campo.checked ? filtros.tamanhos.add(campo.value) : filtros.tamanhos.delete(campo.value);  // marca/desmarca tamanho
    if (campo.name === "cor") campo.checked ? filtros.cores.add(campo.value) : filtros.cores.delete(campo.value);           // marca/desmarca cor
    if (campo.name === "preco") filtros.preco = campo.value;                 // troca a faixa de preço
    if (campo.id === "so-disponiveis") filtros.soDisponiveis = campo.checked;  // liga/desliga disponibilidade
    atualizar();                                                             // redesenha
  });

  el.ordenar.addEventListener("change", () => {                              // mudou a ordenação
    filtros.ordem = el.ordenar.value;                                        // guarda a escolha
    atualizar();                                                             // redesenha
  });

  document.getElementById("limpar-filtros").addEventListener("click", limparFiltros);  // botão "Limpar" da gaveta
  document.getElementById("limpar-vazio").addEventListener("click", limparFiltros);    // botão da mensagem de vazio

  // ---------- 13. Dropdowns do desktop ----------
  const grupos = el.painel.querySelectorAll(".filtro");                      // os 4 grupos (tamanho, cor, preço, disponibilidade)

  function fecharDropdowns(exceto) {                                         // fecha todos os menus (menos o informado)
    grupos.forEach((g) => {
      if (g === exceto) return;                                              // pula o que deve ficar aberto
      g.classList.remove("aberto");                                          // fecha
      g.querySelector(".filtro__botao").setAttribute("aria-expanded", "false");  // avisa leitores de tela
    });
  }

  grupos.forEach((grupo) => {                                                // para cada grupo...
    const botao = grupo.querySelector(".filtro__botao");                     // ...pega o botão dele
    botao.addEventListener("click", () => {                                  // ao clicar:
      const abrir = !grupo.classList.contains("aberto");                     // se estava fechado, vai abrir
      fecharDropdowns(grupo);                                                // fecha os outros
      grupo.classList.toggle("aberto", abrir);                               // abre ou fecha este
      botao.setAttribute("aria-expanded", String(abrir));                    // avisa leitores de tela
    });
  });

  document.addEventListener("click", (e) => {                                // clique em qualquer lugar da página
    if (!e.target.closest(".filtro")) fecharDropdowns();                     // fora dos filtros: fecha os menus
  });
  document.addEventListener("keydown", (e) => {                              // tecla apertada
    if (e.key === "Escape") { fecharDropdowns(); fecharGaveta(); }           // Esc fecha menus e gaveta
  });

  // ---------- 14. Gaveta do celular ----------
  function abrirGaveta() {                                                   // abre a gaveta de filtros
    el.painel.classList.add("aberto");                                       // classe "aberto" faz a gaveta subir (CSS)
    el.sombra.hidden = false;                                                // mostra o fundo escuro
    document.body.classList.add("sem-rolagem");                              // trava a rolagem da página
    el.abrirFiltros.setAttribute("aria-expanded", "true");                   // avisa leitores de tela
    el.fecharFiltros.focus();                                                // leva o foco para dentro da gaveta
  }
  function fecharGaveta() {                                                  // fecha a gaveta
    if (!el.painel.classList.contains("aberto")) return;                     // já está fechada: nada a fazer
    el.painel.classList.remove("aberto");                                    // gaveta desce
    el.sombra.hidden = true;                                                 // some o fundo escuro
    document.body.classList.remove("sem-rolagem");                           // libera a rolagem
    el.abrirFiltros.setAttribute("aria-expanded", "false");                  // avisa leitores de tela
    el.abrirFiltros.focus();                                                 // devolve o foco ao botão "Filtrar"
  }
  el.abrirFiltros.addEventListener("click", abrirGaveta);                    // botão "Filtrar" abre
  el.fecharFiltros.addEventListener("click", fecharGaveta);                  // X fecha
  el.verResultados.addEventListener("click", fecharGaveta);                  // "Ver X peças" fecha
  el.sombra.addEventListener("click", fecharGaveta);                         // clique no fundo escuro fecha

  // ---------- 15. Ações dentro dos cards (favoritar, tamanho, sacola) ----------
  el.grade.addEventListener("click", (e) => {                                // UM ouvinte cuida de todos os cards ("delegação de eventos")
    const card = e.target.closest(".produto");                               // card onde aconteceu o clique
    if (!card) return;                                                       // fora de um card: ignora
    const produto = PRODUTOS.find((p) => p.id === card.dataset.id);          // dados do produto desse card

    const favorito = e.target.closest(".produto__favorito");                 // clicou no coração?
    if (favorito) {
      const ativo = Sacola.alternarFavorito(produto);                        // liga/desliga o favorito
      favorito.setAttribute("aria-pressed", String(ativo));                  // atualiza o botão (o CSS pinta o coração)
      return;                                                                // termina aqui
    }

    const adicionar = e.target.closest(".produto__adicionar");               // clicou no botão da sacola do card?
    if (adicionar) {
      const abrir = !card.classList.contains("escolhendo");                  // vai abrir ou fechar o painel de tamanhos?
      el.grade.querySelectorAll(".escolhendo").forEach((c) => {              // fecha painéis abertos em outros cards
        c.classList.remove("escolhendo");
        c.querySelector(".produto__adicionar").setAttribute("aria-expanded", "false");
      });
      card.classList.toggle("escolhendo", abrir);                            // abre/fecha o painel deste card
      adicionar.setAttribute("aria-expanded", String(abrir));                // avisa leitores de tela
      return;
    }

    const tamanho = e.target.closest(".tamanho");                            // clicou num tamanho?
    if (tamanho && !tamanho.disabled) {                                      // (e ele não está esgotado)
      Sacola.adicionar(produto, tamanho.dataset.tamanho);                    // coloca na sacola
      tamanho.classList.add("escolhido");                                    // pinta o botão de ciano
      setTimeout(() => {                                                     // depois de 0,7 s:
        tamanho.classList.remove("escolhido");                               // volta a cor normal
        card.classList.remove("escolhendo");                                 // fecha o painel de tamanhos
      }, 700);
    }
  });

  // ---------- 16. Começar ----------
  atualizar();                                                               // desenha o catálogo pela primeira vez
}

document.addEventListener("DOMContentLoaded", iniciarCatalogo);              // roda quando o HTML terminar de carregar
