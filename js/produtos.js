/* =========================================================
   PRODUTOS — dados da coleção
   ---------------------------------------------------------
   Esta lista alimenta TUDO: o carrossel do hero, as abas,
   os filtros, a grade e a sacola. Para adicionar uma peça
   nova, basta copiar uma linha e trocar os dados.

   Campos de cada produto:
   - id:         nome único, sem espaço nem acento (usado no código)
   - nome:       nome que aparece no site
   - cor/tecido: aparecem embaixo do nome ("Preto · Cetim")
   - preco:      número com PONTO nos centavos (329.90)
   - categoria:  vestidos | saias | calcas | macacoes
   - tamanhos:   tamanhos que a peça tem
   - esgotados:  tamanhos que acabaram no estoque
   - lancamento: data (ano-mês-dia), usada em "Novidades"
   - selo:       "novo", "mais-amado" ou null (sem selo)
   - imagem:     caminho da foto (proporção 4:5, ex.: 620x780)
   ========================================================= */

const PRODUTOS = [                                               // lista (array) com todos os produtos
  { id: "vestido-luna",     nome: "Vestido Luna",     cor: "Preto",     tecido: "Cetim",         preco: 329.90, categoria: "vestidos", tamanhos: ["PP", "P", "M", "G", "GG"], esgotados: ["G"],  lancamento: "2026-11-10", selo: "novo",       imagem: "img/produtos/vestido-luna.jpg" },
  { id: "vestido-aurora",   nome: "Vestido Aurora",   cor: "Vinho",     tecido: "Acetinado",     preco: 389.90, categoria: "vestidos", tamanhos: ["P", "M", "G", "GG"],       esgotados: [],     lancamento: "2026-10-20", selo: null,         imagem: "img/produtos/vestido-aurora.jpg" },
  { id: "conjunto-eclipse", nome: "Conjunto Eclipse", cor: "Preto",     tecido: "Alfaiataria",   preco: 459.90, categoria: "calcas",   tamanhos: ["P", "M", "G", "GG"],       esgotados: ["P"],  lancamento: "2026-09-15", selo: "mais-amado", imagem: "img/produtos/conjunto-eclipse.jpg" },
  { id: "vestido-stella",   nome: "Vestido Stella",   cor: "Prata",     tecido: "Metalizado",    preco: 349.90, categoria: "vestidos", tamanhos: ["PP", "P", "M", "G"],       esgotados: ["PP"], lancamento: "2026-10-28", selo: null,         imagem: "img/produtos/vestido-stella.jpg" },
  { id: "top-midnight",     nome: "Top Midnight",     cor: "Preto",     tecido: "Estruturado",   preco: 189.90, categoria: "calcas",   tamanhos: ["PP", "P", "M", "G"],       esgotados: [],     lancamento: "2026-09-30", selo: null,         imagem: "img/produtos/top-midnight.jpg" },
  { id: "saia-celeste",     nome: "Saia Celeste",     cor: "Champagne", tecido: "Cetim",         preco: 229.90, categoria: "saias",    tamanhos: ["P", "M", "G"],             esgotados: ["M"],  lancamento: "2026-10-05", selo: null,         imagem: "img/produtos/saia-celeste.jpg" },
  { id: "vestido-noite",    nome: "Vestido Noite",    cor: "Preto",     tecido: "Malha premium", preco: 299.90, categoria: "vestidos", tamanhos: ["P", "M", "G", "GG"],       esgotados: ["P", "M", "G", "GG"], lancamento: "2026-08-22", selo: null, imagem: "img/produtos/vestido-noite.jpg" },  // todos os tamanhos esgotados = peça esgotada
  { id: "macacao-eden",     nome: "Macacão Éden",     cor: "Preto",     tecido: "Crepe",         preco: 419.90, categoria: "macacoes", tamanhos: ["P", "M", "G", "GG"],       esgotados: [],     lancamento: "2026-11-12", selo: "novo",       imagem: "img/produtos/macacao-eden.jpg" },
];

/* Informações da vitrine (as regras de pagamento ficam no config.js) */
const LOJA = {                                                   // objeto com dados usados em vários lugares
  categorias: [                                                  // abas do catálogo, na ordem em que aparecem
    { id: "todos",    nome: "Todos" },                           // "todos" mostra tudo
    { id: "vestidos", nome: "Vestidos" },                        // o id precisa ser igual ao campo "categoria" dos produtos
    { id: "saias",    nome: "Saias" },
    { id: "calcas",   nome: "Calças" },
    { id: "macacoes", nome: "Macacões" },
  ],
  ordemTamanhos: ["PP", "P", "M", "G", "GG"],                    // ordem certa dos tamanhos no filtro
  coresAmostra: {                                                // cor da bolinha de cada cor no filtro
    Preto: "#16121b",
    Vinho: "#5e1a2b",
    Prata: "#b9b7bf",
    Champagne: "#dcc6a3",
  },
};

/* Funções auxiliares usadas por outros arquivos */
const formatarPreco = (valor) =>                                 // recebe um número, ex.: 329.9
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });  // devolve "R$ 329,90"

const estaDisponivel = (produto) =>                              // a peça tem algum tamanho em estoque?
  produto.tamanhos.some((t) => !produto.esgotados.includes(t));  // true se pelo menos 1 tamanho não está esgotado
