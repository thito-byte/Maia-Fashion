/* =========================================================
   HERO-CARROSSEL — faz os looks passarem no palco 3D
   ---------------------------------------------------------
   Ideia principal: existe um "look atual" (um número).
   Para cada card, calculamos a POSIÇÃO em relação a ele:
     -2  -1   0   +1  +2
   e entregamos essa posição ao CSS (--pos e --dist).
   O CSS cuida de toda a parte visual.
   ========================================================= */

function iniciarCarrossel() {                                                // função principal do carrossel
  // ---------- 1. Pegar os elementos do HTML ----------
  const hero = document.querySelector(".hero");                              // a seção inteira do topo
  const palco = document.querySelector(".palco");                            // área onde os cards ficam
  const trilho = document.getElementById("palco-trilho");                    // container 3D dos cards
  const infoBloco = document.getElementById("look-destaque");                // bloco com nome/preço do look
  const infoNumero = document.getElementById("look-numero");                 // "01"
  const infoTotal = document.getElementById("look-total");                   // "08"
  const infoNome = document.getElementById("look-nome");                     // "Vestido Luna"
  const infoDetalhe = document.getElementById("look-detalhe");               // "Preto · Cetim · R$ 329,90"
  const progresso = document.getElementById("look-progresso");               // barrinha ciano
  const botaoAnterior = document.getElementById("botao-anterior");           // seta ←
  const botaoProximo = document.getElementById("botao-proximo");             // seta →
  const botaoPausa = document.getElementById("botao-pausa");                 // pausar/retomar

  // ---------- 2. Configurações ----------
  const INTERVALO = 4500;                                                    // tempo (em milissegundos) que cada look fica em destaque
  const VISIVEIS_POR_LADO = 2;                                               // quantos cards aparecem de cada lado do central
  const reduzirMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;  // pessoa pediu menos animação no sistema?

  // ---------- 3. Estado (o que muda com o tempo) ----------
  let atual = 0;                                                             // índice do look em destaque (começa no primeiro)
  let pausadoPeloUsuario = reduzirMovimento;                                 // se pediu menos movimento, já começa pausado
  let pausaTemporaria = false;                                               // pausa enquanto o mouse está em cima / aba escondida
  let temporizador = null;                                                   // guarda o "relógio" da troca automática

  const total = PRODUTOS.length;                                             // quantos looks existem
  hero.style.setProperty("--intervalo", INTERVALO + "ms");                   // passa o intervalo para o CSS (barrinha ciano)
  infoTotal.textContent = String(total).padStart(2, "0");                    // escreve "08"

  // ---------- 4. Criar os cards a partir dos dados ----------
  const cards = PRODUTOS.map((produto, indice) => {                          // um card para cada produto
    const card = document.createElement("button");                           // cada card é um botão (clicável e acessível)
    card.className = "card-look";                                            // classe usada pelo CSS
    card.type = "button";                                                    // botão comum (não envia formulário)
    card.setAttribute("aria-label", `${produto.nome}: ver no catálogo`);      // texto para leitores de tela
    card.innerHTML = `<img src="${produto.imagem}" alt="${produto.nome}, ${produto.cor.toLowerCase()}, em ${produto.tecido.toLowerCase()}" draggable="false">`;  // a foto
    card.addEventListener("click", () => {                                   // ao clicar no card:
      if (indice === atual) irParaProduto(produto.id);                       // se é o do centro: vai até a peça no catálogo
      else irPara(indice);                                                   // se é lateral: traz para o centro
    });
    trilho.appendChild(card);                                                // coloca o card no palco
    return card;                                                             // guarda o card na lista "cards"
  });

  // Rola a página até o produto na grade e dá um destaque rápido
  function irParaProduto(id) {
    const alvo = document.getElementById(`produto-${id}`);                   // card do produto no catálogo
    if (!alvo) return;                                                       // se não estiver na grade (filtrado), não faz nada
    alvo.scrollIntoView({ behavior: reduzirMovimento ? "auto" : "smooth", block: "center" });  // rola até ele
    alvo.classList.add("destacado");                                         // contorno ciano
    setTimeout(() => alvo.classList.remove("destacado"), 1800);              // tira o contorno depois de 1,8 s
  }

  // ---------- 5. Posicionar os cards ----------
  function posicionar() {                                                    // calcula a posição de cada card
    cards.forEach((card, indice) => {                                        // para cada card...
      let pos = indice - atual;                                              // distância até o look atual (negativo = esquerda)
      if (pos > total / 2) pos -= total;                                     // "dá a volta": o último fica à esquerda do primeiro
      if (pos < -total / 2) pos += total;                                    // idem para o outro lado

      const dist = Math.abs(pos);                                            // distância sem sinal (0, 1, 2, 3...)
      card.style.setProperty("--pos", pos);                                  // entrega a posição ao CSS
      card.style.setProperty("--dist", Math.min(dist, VISIVEIS_POR_LADO + 1)); // entrega a distância (limitada) ao CSS

      const visivel = dist <= VISIVEIS_POR_LADO;                             // aparece na tela?
      card.classList.toggle("oculto", !visivel);                             // longe demais: esconde
      card.classList.toggle("ativo", pos === 0);                             // o do centro ganha a classe "ativo"

      card.tabIndex = visivel ? 0 : -1;                                      // só cards visíveis recebem foco pelo teclado
      card.setAttribute("aria-hidden", visivel ? "false" : "true");          // leitores de tela ignoram os escondidos
      if (pos === 0) card.setAttribute("aria-current", "true");              // marca o card atual
      else card.removeAttribute("aria-current");                             // tira a marca dos outros
    });
  }

  // ---------- 6. Atualizar o texto do look em destaque ----------
  function atualizarInfo(animar = true) {                                    // troca nome/preço do look
    const produto = PRODUTOS[atual];                                         // produto em destaque
    const aplicar = () => {                                                  // função que escreve os textos
      infoNumero.textContent = String(atual + 1).padStart(2, "0");           // "02"
      infoNome.textContent = produto.nome;                                   // nome
      infoDetalhe.textContent = `${produto.cor} · ${produto.tecido} · ${formatarPreco(produto.preco)}`;  // detalhe + preço
      infoBloco.classList.remove("trocando");                                // texto aparece de novo
    };
    if (!animar) return aplicar();                                           // sem animação: escreve direto
    infoBloco.classList.add("trocando");                                     // texto some (CSS)...
    setTimeout(aplicar, 350);                                                // ...troca e reaparece depois de 0,35 s
  }

  // ---------- 7. Navegação ----------
  function irPara(indice) {                                                  // vai para um look específico
    atual = (indice + total) % total;                                        // "%" garante que fica entre 0 e total-1 (dá a volta)
    posicionar();                                                            // reposiciona os cards
    atualizarInfo();                                                         // troca os textos
    reiniciarCiclo();                                                        // zera o relógio
  }
  const proximo = () => irPara(atual + 1);                                   // próximo look
  const anterior = () => irPara(atual - 1);                                  // look anterior

  // ---------- 8. Troca automática (o "relógio") ----------
  let inicioDoCiclo = 0;                                                     // quando o relógio começou a contar
  let tempoRestante = INTERVALO;                                             // quanto falta para o próximo look
  let estavaRodando = false;                                                 // estado anterior (para saber se mudou)

  function estaRodando() {                                                   // está trocando sozinho agora?
    return !pausadoPeloUsuario && !pausaTemporaria;                          // só se não houver nenhuma pausa
  }

  function agendar(ms) {                                                     // liga o relógio
    clearTimeout(temporizador);                                              // cancela o relógio anterior
    inicioDoCiclo = performance.now();                                       // anota o horário de início
    tempoRestante = ms;                                                      // anota quanto vai esperar
    temporizador = setTimeout(proximo, ms);                                  // daqui a "ms", chama proximo()
  }

  function reiniciarCiclo() {                                                // chamado a cada troca de look
    tempoRestante = INTERVALO;                                               // volta o tempo cheio
    progresso.classList.remove("rodando");                                   // para a barrinha
    void progresso.offsetWidth;                                              // "truque" que obriga o navegador a reiniciar a animação
    progresso.classList.add("rodando");                                      // começa a barrinha do zero
    if (estaRodando()) agendar(INTERVALO);                                   // se não está pausado, liga o relógio
  }

  function atualizarEstadoPausa() {                                          // chamado quando algo pode ter pausado/despausado
    const rodando = estaRodando();                                           // está rodando agora?
    hero.classList.toggle("pausado", !rodando);                              // classe "pausado" congela a barrinha (CSS)
    infoBloco.setAttribute("aria-live", rodando ? "off" : "polite");         // leitores de tela só anunciam quando parado

    if (rodando && !estavaRodando) {                                         // acabou de despausar?
      agendar(tempoRestante);                                                // continua de onde parou
    } else if (!rodando && estavaRodando) {                                  // acabou de pausar?
      clearTimeout(temporizador);                                            // desliga o relógio
      tempoRestante -= performance.now() - inicioDoCiclo;                    // guarda quanto faltava
    }
    estavaRodando = rodando;                                                 // atualiza o estado anterior
  }

  // ---------- 9. Botões e interações ----------
  botaoProximo.addEventListener("click", proximo);                           // seta →
  botaoAnterior.addEventListener("click", anterior);                         // seta ←

  botaoPausa.addEventListener("click", () => {                               // botão de pausa
    pausadoPeloUsuario = !pausadoPeloUsuario;                                // inverte: pausado ↔ rodando
    botaoPausa.setAttribute("aria-pressed", String(pausadoPeloUsuario));     // o CSS troca o ícone (pausa ↔ play)
    botaoPausa.setAttribute("aria-label", pausadoPeloUsuario ? "Retomar animação" : "Pausar animação");  // texto acessível
    atualizarEstadoPausa();                                                  // aplica a pausa
  });

  palco.addEventListener("mouseenter", () => { pausaTemporaria = true; atualizarEstadoPausa(); });   // mouse entrou no palco: pausa
  palco.addEventListener("mouseleave", () => { pausaTemporaria = false; atualizarEstadoPausa(); });  // mouse saiu: continua

  document.addEventListener("visibilitychange", () => {                      // a aba do navegador ficou escondida/visível
    pausaTemporaria = document.hidden;                                       // escondida = pausa (economiza bateria)
    atualizarEstadoPausa();
  });

  palco.addEventListener("keydown", (evento) => {                            // teclado com o foco no palco
    if (evento.key === "ArrowRight") { evento.preventDefault(); proximo(); } // seta → do teclado
    if (evento.key === "ArrowLeft") { evento.preventDefault(); anterior(); } // seta ← do teclado
  });

  let inicioX = null;                                                        // onde o dedo encostou (eixo horizontal)
  palco.addEventListener("pointerdown", (e) => { inicioX = e.clientX; });    // dedo/mouse encostou
  palco.addEventListener("pointerup", (e) => {                               // dedo/mouse soltou
    if (inicioX === null) return;                                            // não começou no palco: ignora
    const deslocamento = e.clientX - inicioX;                                // quanto arrastou (negativo = para a esquerda)
    if (Math.abs(deslocamento) > 40) {                                       // arrastou mais de 40px?
      deslocamento < 0 ? proximo() : anterior();                             // esquerda = próximo; direita = anterior
    }
    inicioX = null;                                                          // zera para o próximo gesto
  });

  // ---------- 10. Começar! ----------
  if (pausadoPeloUsuario) {                                                  // se começou pausado (menos movimento)...
    botaoPausa.setAttribute("aria-pressed", "true");                         // ...mostra o ícone de play
    botaoPausa.setAttribute("aria-label", "Retomar animação");
  }

  palco.classList.add("palco--entrando");                                    // cards começam "lá no fundo"...
  posicionar();                                                              // calcula as posições
  atualizarInfo(false);                                                      // escreve o primeiro look sem animação

  requestAnimationFrame(() => {                                              // espera o navegador desenhar uma vez...
    requestAnimationFrame(() => {                                            // ...e mais uma (garante que a posição inicial foi aplicada)
      palco.classList.remove("palco--entrando");                             // ...e os cards "viajam" até o palco
      setTimeout(() => {                                                     // espera a entrada terminar (0,9 s)...
        reiniciarCiclo();                                                    // ...liga a barrinha e o relógio
        atualizarEstadoPausa();                                              // ...e aplica o estado de pausa
      }, reduzirMovimento ? 0 : 900);
    });
  });
}

document.addEventListener("DOMContentLoaded", iniciarCarrossel);             // roda quando o HTML terminar de carregar
