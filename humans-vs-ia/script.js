// =====================================================================
//  HUMANS VS IA — defensores humanos contra robôs que invadem pela direita
//  Organização do arquivo:
//    1. Configuração (números que você pode ajustar)
//    2. Estado do jogo
//    3. Funções de apoio
//    4. Interface (cards, grade, placar)
//    5. Criação de defensores, robôs e sóis
//    6. Atualização a cada quadro (defensores, tiros, robôs, sóis)
//    7. Botões e laço principal
// =====================================================================


// ---------------------------------------------------------------------
// 1. CONFIGURAÇÃO
// ---------------------------------------------------------------------

// Tela fixa do jogo (é escalada para caber na janela)
var W = 1672, H = 941;

// Grade onde os defensores são colocados
var X0 = 250, Y0 = 366;          // canto superior esquerdo da grade
var CW = 97, CH = 97;            // tamanho de cada casa
var COLS = 14, ROWS = 5;

// Defensores e robôs ficam com os pés na mesma linha do chão:
// PE_NO_CHAO = distância, em pixels, entre os pés e a borda de baixo da casa
var PE_NO_CHAO = 4;

// Robôs
var ROBO_W = 90, ROBO_H = 128;
var ROBO_ACELERA = 50;           // ganha velocidade devagar ao voltar a andar
var ROBO_FREIA = 160;            // perde velocidade rápido ao encontrar defensor
var ROBO_DANO = 4;               // dano por mordida
var ROBO_INTERVALO = 1;          // segundos entre mordidas
// Pontos do corpo do robô (em pixels a partir do x dele), usados nas colisões
var ROBO_FRENTE = 25, ROBO_TRAS = 75, ROBO_CENTRO = 45;

// Sóis
var SOL_TAM = 56;                // tamanho do sol (igual ao CSS)
var SOL_VALOR = 25;              // quanto cada sol vale
var SOL_VEL_MEDIA = 380;         // velocidade média da queda (px/s)
var SOL_QUEDA_MIN = 0.7;         // duração mínima da queda (segundos)
var SOL_INTERVALO_CEU = 5;       // segundos entre sóis que caem do céu

// Defensores
//   altura:   altura do desenho na tela (a largura sai da proporção do PNG)
//   prop:     largura / altura do PNG original (mantém a proporção certa)
//   tempo:    segundos entre ações (sol ou tiro)
//   alcance:  distância máxima do tiro, em pixels
//   vel:      velocidade da bala
var tipos = {
  sucateiro:  { nome: 'Sucateiro',  custo: 50,  vida: 12, altura: 140, prop: 0.91, modo: 'sol',  tempo: 8 },
  pistoleiro: { nome: 'Pistoleiro', custo: 100, vida: 12, altura: 140, prop: 1.00, modo: 'tiro', tempo: 1.4, dano: 2, alcance: 1200, vel: 620 },
  minigunner: { nome: 'Minigunner', custo: 175, vida: 12, altura: 128, prop: 1.11, modo: 'tiro', tempo: 0.3, dano: 1, alcance: 1200, vel: 660 },
  escudo:     { nome: 'Escudo',     custo: 75,  vida: 70, altura: 140, prop: 0.89, modo: 'escudo' },
  sniper:     { nome: 'Sniper',     custo: 150, vida: 12, altura: 90,  prop: 2.04, modo: 'tiro', tempo: 3.2, dano: 7, alcance: 9999, vel: 1200, forte: true },
  cqb:        { nome: 'Pist. CQB',  custo: 125, vida: 12, altura: 134, prop: 0.98, modo: 'tiro', tempo: 1.1, dano: 2, alcance: 1000, vel: 640 }
};
var ordem = ['sucateiro', 'pistoleiro', 'minigunner', 'escudo', 'sniper', 'cqb'];

// Tipos de robô e chance de aparecer (peso maior = mais comum)
var skins = [
  { nome: 'padrao',     peso: 35, vida: 12 },
  { nome: 'destruida',  peso: 25, vida: 8 },
  { nome: 'bruxo',      peso: 8,  vida: 12 },
  { nome: 'nadador',    peso: 8,  vida: 12 },
  { nome: 'pirata',     peso: 8,  vida: 12 },
  { nome: 'professor',  peso: 8,  vida: 12 },
  { nome: 'fazendeiro', peso: 8,  vida: 12 }
];


// ---------------------------------------------------------------------
// 2. ESTADO DO JOGO
// ---------------------------------------------------------------------

var jogo = document.getElementById('jogo');
var campo = document.getElementById('campo');
var aviso = document.getElementById('aviso');

var sois = 100;                  // saldo de sóis
var abates = 0;                  // robôs destruídos
var tempoJogo = 0;               // segundos de jogo
var pausado = false, fim = false;
var velocidade = 1;              // 1 ou 2 (botão 2X)
var selecionado = '';            // defensor escolhido no card ('' = nenhum)

var tempoProxSol = 3;            // contagem para o próximo sol do céu
var tempoProxRobo = 12;          // contagem para o próximo robô

var grade = [];                  // grade[linha][coluna] = defensor ou null
var defensores = [], robos = [], tiros = [], solList = [];


// ---------------------------------------------------------------------
// 3. FUNÇÕES DE APOIO
// ---------------------------------------------------------------------

// Cria uma <div> dentro do campo
function criar(classe) {
  var e = document.createElement('div');
  e.className = classe;
  campo.appendChild(e);
  return e;
}

// Posiciona um elemento na tela
function mover(el, x, y) {
  el.style.transform = 'translate(' + x + 'px,' + y + 'px)';
}

// Número aleatório entre a e b
function aleatorio(a, b) {
  return a + Math.random() * (b - a);
}

// Tira o item i de uma lista e remove o desenho dele da tela
function remover(lista, i) {
  campo.removeChild(lista[i].el);
  lista.splice(i, 1);
}

// Y do topo de uma linha da grade e Y do chão (onde ficam os pés)
function topoDaLinha(linha) { return Y0 + linha * CH; }
function chaoDaLinha(linha) { return Y0 + linha * CH + CH - PE_NO_CHAO; }

// Ajusta o tamanho do jogo à janela
function escalar() {
  var s = Math.min(window.innerWidth / W, window.innerHeight / H);
  jogo.style.transform = 'translate(' + (-W * s / 2) + 'px,' + (-H * s / 2) + 'px) scale(' + s + ')';
}
window.onresize = escalar;
escalar();


// ---------------------------------------------------------------------
// 4. INTERFACE
// ---------------------------------------------------------------------

// Casas clicáveis da grade
for (var r = 0; r < ROWS; r++) {
  grade[r] = [];
  for (var c = 0; c < COLS; c++) {
    grade[r][c] = null;
    var cel = criar('cel');
    cel.style.left = (X0 + c * CW) + 'px';
    cel.style.top = topoDaLinha(r) + 'px';
    cel.onclick = colocarDefensor(r, c);
  }
}

// Cards de escolha dos defensores
var cardEls = {};
ordem.forEach(function (k) {
  var card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = '<img src="img/' + k + '.png"><span>' + tipos[k].nome + '</span><b>' + tipos[k].custo + '</b>';
  card.onclick = function () { escolherCard(k); };
  document.getElementById('cards').appendChild(card);
  cardEls[k] = card;
});

function escolherCard(k) {
  if (pausado || fim) return;
  if (selecionado == k) selecionado = '';                  // clicar de novo desmarca
  else if (sois >= tipos[k].custo) selecionado = k;        // só marca se tiver sóis
  atualizarUI();
}

// Atualiza placar, cards disponíveis e cursor
function atualizarUI() {
  document.getElementById('solTexto').innerHTML = sois;
  document.getElementById('abates').innerHTML = abates;
  ordem.forEach(function (k) {
    var semSois = sois < tipos[k].custo;
    if (selecionado == k && semSois) selecionado = '';
    cardEls[k].className = 'card' + (semSois ? ' off' : '') + (selecionado == k ? ' sel' : '');
  });
  campo.className = selecionado ? 'plantando' : '';
}

function mudarSois(quantidade) {
  sois += quantidade;
  atualizarUI();
}


// ---------------------------------------------------------------------
// 5. CRIAÇÃO DE DEFENSORES, ROBÔS E SÓIS
// ---------------------------------------------------------------------

// Clique numa casa: coloca o defensor escolhido
function colocarDefensor(linha, coluna) {
  return function () {
    if (pausado || fim || !selecionado || grade[linha][coluna]) return;
    var t = tipos[selecionado];
    if (sois < t.custo) return;

    var w = Math.round(t.altura * t.prop), h = t.altura;
    var el = criar('ent def');
    el.style.width = w + 'px';
    el.style.height = h + 'px';
    el.style.zIndex = 10 + linha;
    el.innerHTML = '<div class="sombra"></div><img src="img/' + selecionado + '.png">';

    // centralizado na casa, com os pés na linha do chão
    var x = X0 + coluna * CW + (CW - w) / 2;
    var y = chaoDaLinha(linha) - h;
    mover(el, x, y);

    var d = { t: t, row: linha, col: coluna, hp: t.vida,
              el: el, x: x, y: y, w: w, h: h,
              tempo: t.modo == 'sol' ? 5 : 0.5 };   // espera antes da 1ª ação
    grade[linha][coluna] = d;
    defensores.push(d);

    selecionado = '';
    mudarSois(-t.custo);
  };
}

// Sol: aparece em (x, y) e desce em linha reta, suave, até a altura "chao".
// Depois de pousar fica parado até ser coletado.
function criarSol(x, y, chao) {
  var el = criar('sol-obj');
  var duracao = Math.max(SOL_QUEDA_MIN, (chao - y) / SOL_VEL_MEDIA);
  var s = { el: el, x: x, y0: y, y: y, chao: chao, t: 0, duracao: duracao, coletado: false };
  mover(el, x, y);
  el.onclick = function () {
    if (pausado || fim || s.coletado) return;   // pode coletar caindo ou parado
    s.coletado = true;
    mudarSois(SOL_VALOR);
  };
  solList.push(s);
}

// Sorteia o tipo de robô usando os pesos
function sortearSkin() {
  var total = 0;
  skins.forEach(function (sk) { total += sk.peso; });
  var n = Math.random() * total;
  for (var i = 0; i < skins.length; i++) {
    if (n < skins[i].peso) return skins[i];
    n -= skins[i].peso;
  }
  return skins[0];
}

// Cria um robô na borda direita, numa linha aleatória
function criarRobo() {
  var sk = sortearSkin();
  var linha = Math.floor(Math.random() * ROWS);
  var el = criar('ent robo');
  el.style.width = ROBO_W + 'px';
  el.style.height = ROBO_H + 'px';
  el.style.zIndex = 10 + linha;
  el.innerHTML = '<div class="sombra"></div><img src="img/robo_' + sk.nome + '.png">';
  // ritmo da passada diferente para cada robô (não andam sincronizados)
  el.style.setProperty('--dur', aleatorio(0.62, 0.78).toFixed(2) + 's');
  el.style.setProperty('--delay', '-' + aleatorio(0, 0.7).toFixed(2) + 's');

  var robo = { row: linha, x: W, y: chaoDaLinha(linha) - ROBO_H, hp: sk.vida,
               el: el, img: el.lastChild, flash: 0,
               ataque: 0, comendo: false,
               v: 0, vmax: aleatorio(22, 27) };     // velocidade atual e máxima
  mover(el, robo.x, robo.y);
  robos.push(robo);
}


// ---------------------------------------------------------------------
// 6. ATUALIZAÇÃO A CADA QUADRO
// ---------------------------------------------------------------------

function atualizar(dt) {
  tempoJogo += dt;
  gerarSoisDoCeu(dt);
  gerarRobos(dt);
  atualizarDefensores(dt);
  atualizarTiros(dt);
  atualizarRobos(dt);
  atualizarSois(dt);
}

// --- sóis que caem do céu ---
function gerarSoisDoCeu(dt) {
  tempoProxSol -= dt;
  if (tempoProxSol > 0) return;
  tempoProxSol = SOL_INTERVALO_CEU;
  var x = aleatorio(X0, X0 + COLS * CW - SOL_TAM);
  var chao = topoDaLinha(Math.floor(Math.random() * ROWS)) + aleatorio(20, 50);
  criarSol(x, -SOL_TAM, chao);
}

// --- novos robôs: o intervalo diminui com o tempo ---
function gerarRobos(dt) {
  tempoProxRobo -= dt;
  if (tempoProxRobo > 0) return;
  criarRobo();
  if (tempoJogo > 120 && Math.random() < 0.3) criarRobo();   // depois de 2 min, às vezes vêm dois
  tempoProxRobo = Math.max(2.8, 10 - tempoJogo / 20);
}

// --- defensores: morrem, produzem sol ou atiram ---
function atualizarDefensores(dt) {
  for (var i = defensores.length - 1; i >= 0; i--) {
    var d = defensores[i];
    if (d.hp <= 0) {
      grade[d.row][d.col] = null;
      remover(defensores, i);
      continue;
    }
    if (d.t.modo == 'escudo') continue;      // escudo só aguenta dano

    d.tempo -= dt;
    if (d.tempo > 0) continue;

    if (d.t.modo == 'sol') {
      d.tempo = d.t.tempo;
      // o sol cai em linha reta, na frente do defensor, até o chão
      criarSol(d.x + d.w - SOL_TAM, d.y, chaoDaLinha(d.row) - SOL_TAM);
    } else if (temRoboNoAlcance(d)) {
      d.tempo = d.t.tempo;
      atirar(d);
    }
  }
}

// Existe algum robô na mesma linha, à frente e dentro do alcance?
function temRoboNoAlcance(d) {
  var centro = d.x + d.w / 2;
  return robos.some(function (r) {
    var dist = r.x + ROBO_CENTRO - centro;
    return r.row == d.row && r.x < W - 20 && dist > 0 && dist < d.t.alcance;
  });
}

function atirar(d) {
  var largura = d.t.forte ? 34 : 16;
  var el = criar('tiro' + (d.t.forte ? ' forte' : ''));
  el.style.width = largura + 'px';
  var x = d.x + d.w * 0.85, y = d.y + d.h * 0.38;
  mover(el, x, y);
  tiros.push({ el: el, x: x, y: y, row: d.row, w: largura, t: d.t, acertou: [] });
}

// --- tiros: andam e machucam os robôs ---
function atualizarTiros(dt) {
  for (var i = tiros.length - 1; i >= 0; i--) {
    var b = tiros[i];
    var antes = b.x;
    b.x += b.t.vel * dt;
    var gastou = false;

    for (var j = 0; j < robos.length; j++) {
      var o = robos[j];
      if (o.row != b.row || o.hp <= 0 || o.x > W - 10) continue;
      var passouPelaFrente = b.x + b.w >= o.x + ROBO_FRENTE;
      var naoPassouDoCorpo = antes <= o.x + ROBO_TRAS;
      if (passouPelaFrente && naoPassouDoCorpo && b.acertou.indexOf(o) < 0) {
        o.hp -= b.t.dano;
        o.flash = 0.1;
        b.acertou.push(o);
        if (!b.t.forte) { gastou = true; break; }   // só o sniper atravessa robôs
      }
    }

    if (b.x > W || gastou) remover(tiros, i);
    else mover(b.el, b.x, b.y);
  }
}

// --- robôs: andam, mordem defensores, chegam na base ---
function atualizarRobos(dt) {
  for (var i = robos.length - 1; i >= 0; i--) {
    var r = robos[i];
    if (r.hp <= 0) {
      remover(robos, i);
      abates++;
      atualizarUI();
      continue;
    }

    // há defensor na casa em que o robô está?
    var coluna = Math.floor((r.x + ROBO_FRENTE - X0) / CW);
    var alvo = (coluna >= 0 && coluna < COLS) ? grade[r.row][coluna] : null;

    if (alvo) {
      r.ataque -= dt;
      if (r.ataque <= 0) { alvo.hp -= ROBO_DANO; r.ataque = ROBO_INTERVALO; }
      if (!r.comendo) { r.comendo = true; r.el.className = 'ent robo parado'; }
      r.v = Math.max(0, r.v - ROBO_FREIA * dt);            // freia suave
    } else {
      if (r.comendo) { r.comendo = false; r.el.className = 'ent robo'; }
      r.v = Math.min(r.vmax, r.v + ROBO_ACELERA * dt);     // acelera suave
    }
    r.x -= r.v * dt;

    // brilho rápido ao levar tiro
    if (r.flash > 0) { r.flash -= dt; r.img.style.filter = 'brightness(2.2)'; }
    else r.img.style.filter = '';

    mover(r.el, r.x, r.y);
    if (r.x + ROBO_W / 2 < X0 - 20) terminar();             // chegou na base
  }
}

// --- sóis: descem em linha reta (começo e fim suaves) e ficam parados no chão ---
function atualizarSois(dt) {
  for (var i = solList.length - 1; i >= 0; i--) {
    var s = solList[i];
    if (s.coletado) { remover(solList, i); continue; }
    if (s.t < s.duracao) {
      s.t = Math.min(s.t + dt, s.duracao);
      var p = s.t / s.duracao;                                   // progresso de 0 a 1
      var suave = 0.5 - Math.cos(Math.PI * p) / 2;               // acelera no início, freia no fim
      s.y = s.y0 + (s.chao - s.y0) * suave;
      mover(s.el, s.x, s.y);
    }
  }
}

function terminar() {
  fim = true;
  aviso.style.display = 'flex';
  aviso.innerHTML = 'OS ROBÔS INVADIRAM!<div style="font-size:30px">Abates: ' + abates + '</div><button id="btnReiniciar">Jogar de novo</button>';
  document.getElementById('btnReiniciar').onclick = function () { location.reload(); };
}


// ---------------------------------------------------------------------
// 7. BOTÕES E LAÇO PRINCIPAL
// ---------------------------------------------------------------------

document.getElementById('btnVel').onclick = function () {
  velocidade = (velocidade == 1) ? 2 : 1;
  this.className = velocidade == 2 ? 'ativo' : '';
};

document.getElementById('btnPausa').onclick = function () {
  if (fim) return;
  pausado = !pausado;
  this.innerHTML = pausado ? 'Continuar' : 'Pausar';
  jogo.className = pausado ? 'pausado' : '';
  aviso.style.display = pausado ? 'flex' : 'none';
  aviso.innerHTML = pausado ? 'PAUSADO' : '';
};

// Roda ~60 vezes por segundo
var ultimo = 0;
function laco(agora) {
  var dt = (agora - ultimo) / 1000;
  ultimo = agora;
  if (dt > 0.05) dt = 0.05;                  // evita saltos se a aba ficar em segundo plano
  if (!pausado && !fim) atualizar(dt * velocidade);
  requestAnimationFrame(laco);
}
atualizarUI();
requestAnimationFrame(laco);
