// Sobe o servidor Python para os testes com um banco temporário, criado na primeira
// inicialização com os dados de exemplo: os testes nunca tocam no banco de verdade.

const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const RAIZ = path.join(__dirname, "..");
const PYTHON = process.platform === "win32" ? "python" : "python3";

async function aguardarResposta(processo, url) {
  for (let tentativa = 0; tentativa < 50; tentativa++) {
    if (processo.exitCode !== null) throw new Error("o servidor Python encerrou ao iniciar");
    // Qualquer resposta HTTP serve: um teste pode usar de propósito um banco com defeito.
    if (await fetch(`${url}/api/workouts`).then(() => true, () => false)) return;
    await new Promise((resolver) => setTimeout(resolver, 200));
  }
  throw new Error("o servidor Python não respondeu a tempo");
}

// Use uma porta diferente da padrão, para não conversar com um servidor já aberto.
// Com "db", usa esse arquivo e não o apaga ao encerrar (para testar reinicializações).
async function iniciarServidor(porta, { db } = {}) {
  const pastaTemporaria = db ? null : fs.mkdtempSync(path.join(os.tmpdir(), "gymlog-"));
  const arquivoDoBanco = db ?? path.join(pastaTemporaria, "gymlog.db");

  const processo = spawn(PYTHON, [path.join(RAIZ, "server", "server.py")], {
    env: { ...process.env, PORT: String(porta), DB_PATH: arquivoDoBanco, MOCK_DELAY_MS: "20" },
    stdio: "ignore",
  });
  const terminou = new Promise((resolver) => processo.once("exit", resolver));

  const url = `http://127.0.0.1:${porta}`;
  const encerrar = async () => {
    processo.kill();
    await terminou; // o arquivo do banco só pode ser apagado depois que o processo o solta
    if (pastaTemporaria) fs.rmSync(pastaTemporaria, { recursive: true, force: true });
  };

  try {
    await aguardarResposta(processo, url);
  } catch (erro) {
    await encerrar();
    throw erro;
  }
  return { url, encerrar };
}

module.exports = { RAIZ, PYTHON, iniciarServidor };
