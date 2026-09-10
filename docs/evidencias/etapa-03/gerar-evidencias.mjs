/*
 * Gera as 9 evidências da Etapa 03 (3 viewports x 3 telas).
 *
 * Dirige o Chrome ou o Edge em modo headless pelo Chrome DevTools Protocol.
 * Não usa nenhuma dependência: Node 20+ já traz WebSocket e fetch globais.
 *
 * Uso:  node docs/evidencias/etapa-03/gerar-evidencias.mjs
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
import { pathToFileURL, fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";

const AQUI = dirname(fileURLToPath(import.meta.url));
const PROJ = resolve(AQUI, "../../..");
const INDEX = pathToFileURL(resolve(PROJ, "src/index.html")).href;
const SAIDA = AQUI;

const NAVEGADORES = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
];
const BIN = NAVEGADORES.find(existsSync);
if (!BIN) throw new Error("Chrome/Edge não encontrado — ajuste a lista NAVEGADORES.");
const PORTA = 9333;

// Os três viewports padronizados da disciplina.
const VIEWPORTS = [
  { nome: "desktop",    largura: 1440, altura: 900  },
  { nome: "tablet",     largura: 768,  altura: 1024 },
  { nome: "smartphone", largura: 390,  altura: 844  },
];

// As três interfaces representativas (mesmas da Etapa 02).
const TELAS = [
  { id: "tela-01", acao: "irParaTreinos()" },   // Meus Treinos (cronograma)
  { id: "tela-02", acao: "abrirTreino(1)" },     // Tela do Treino (Treino A)
  { id: "tela-03", acao: "abrirExercicio(1)" },  // Tela do Exercício (Supino Reto)
];

let seq = 0;
function cdp(ws, method, params = {}) {
  const id = ++seq;
  return new Promise((ok, erro) => {
    const ouvir = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id !== id) return;
      ws.removeEventListener("message", ouvir);
      m.error ? erro(new Error(method + ": " + m.error.message)) : ok(m.result);
    };
    ws.addEventListener("message", ouvir);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

const proc = spawn(BIN, [
  "--headless=new", "--disable-gpu", "--hide-scrollbars",
  "--no-first-run", "--no-default-browser-check",
  `--remote-debugging-port=${PORTA}`,
  `--user-data-dir=${(process.env.TEMP || "/tmp")}/gymlog-evidencias`,
  "about:blank",
], { stdio: "ignore" });

async function principal() {
  mkdirSync(SAIDA, { recursive: true });

  let alvo;
  for (let i = 0; i < 40 && !alvo; i++) {
    try {
      const lista = await (await fetch(`http://127.0.0.1:${PORTA}/json/list`)).json();
      alvo = lista.find((t) => t.type === "page");
    } catch { /* ainda subindo */ }
    if (!alvo) await sleep(250);
  }
  if (!alvo) throw new Error("o navegador não respondeu na porta " + PORTA);

  const ws = new WebSocket(alvo.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  await cdp(ws, "Page.enable");
  await cdp(ws, "Runtime.enable");
  // O próprio app desliga a animação de entrada sob prefers-reduced-motion.
  await cdp(ws, "Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });

  for (const vp of VIEWPORTS) {
    await cdp(ws, "Emulation.setDeviceMetricsOverride", {
      width: vp.largura, height: vp.altura,
      deviceScaleFactor: 1, mobile: vp.nome === "smartphone",
    });
    for (const tela of TELAS) {
      await cdp(ws, "Page.navigate", { url: INDEX });
      await sleep(600);
      await cdp(ws, "Runtime.evaluate", { expression: tela.acao, awaitPromise: true });
      await sleep(500);
      const { data } = await cdp(ws, "Page.captureScreenshot", {
        format: "png", captureBeyondViewport: false,
      });
      writeFileSync(`${SAIDA}/${vp.nome}-${tela.id}.png`, Buffer.from(data, "base64"));
      console.log("gerado:", `${vp.nome}-${tela.id}.png`);
    }
  }
  ws.close();
}

principal().then(
  () => proc.kill(),
  (e) => { console.error(e); proc.kill(); process.exit(1); },
);
