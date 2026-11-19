// Sobe o servidor Python para os testes, com uma cópia temporária do db.json:
// os testes nunca alteram os dados de exemplo.

const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const RAIZ = path.join(__dirname, "..");

async function aguardarResposta(processo, url) {
  for (let tentativa = 0; tentativa < 50; tentativa++) {
    if (processo.exitCode !== null) throw new Error("o servidor Python encerrou ao iniciar");
    if (await fetch(`${url}/api/workouts`).then((r) => r.ok, () => false)) return;
    await new Promise((resolver) => setTimeout(resolver, 200));
  }
  throw new Error("o servidor Python não respondeu a tempo");
}

// Use uma porta diferente da padrão, para não conversar com um servidor já aberto.
async function iniciarServidor(porta) {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), "gymlog-"));
  const db = path.join(pasta, "db.json");
  fs.copyFileSync(path.join(RAIZ, "server", "db.json"), db);

  const python = process.platform === "win32" ? "python" : "python3";
  const processo = spawn(python, [path.join(RAIZ, "server", "server.py")], {
    env: { ...process.env, PORT: String(porta), DB_PATH: db, MOCK_DELAY_MS: "20" },
    stdio: "ignore",
  });

  const url = `http://127.0.0.1:${porta}`;
  const encerrar = () => {
    processo.kill();
    fs.rmSync(pasta, { recursive: true, force: true });
  };

  try {
    await aguardarResposta(processo, url);
  } catch (erro) {
    encerrar();
    throw erro;
  }
  return { url, encerrar };
}

module.exports = { RAIZ, iniciarServidor };
