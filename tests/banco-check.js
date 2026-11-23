// Roda os testes do repositório e do banco (tests/test_repositorio.py) dentro do npm test.

const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { test } = require("node:test");
const { RAIZ, PYTHON } = require("./servidor-de-teste");

test("repositório e banco (unittest do Python)", () => {
  const resultado = spawnSync(PYTHON, ["-m", "unittest", "discover", "-s", "tests", "-p", "test_*.py"], {
    cwd: RAIZ,
    encoding: "utf-8",
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1", PYTHONIOENCODING: "utf-8" },
  });
  assert.equal(resultado.status, 0, resultado.stderr);
});
