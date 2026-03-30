const { readdir, readFile, writeFile } = require("node:fs/promises");
const { join } = require("node:path");

const TARGET_RUNTIME = "nodejs20.x";
const FUNCTIONS_DIR = ".vercel/output/functions";

const getFunctionConfigPaths = async () => {
  const entries = await readdir(FUNCTIONS_DIR, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isDirectory() && entry.name.endsWith(".func"))
    .map((entry) => join(FUNCTIONS_DIR, entry.name, ".vc-config.json"));
};

const updateRuntime = async (configPath) => {
  const rawConfig = await readFile(configPath, "utf8");
  const parsedConfig = JSON.parse(rawConfig);

  if (parsedConfig.runtime === TARGET_RUNTIME) return false;

  parsedConfig.runtime = TARGET_RUNTIME;
  await writeFile(configPath, `${JSON.stringify(parsedConfig, null, 2)}\n`, "utf8");
  return true;
};

const main = async () => {
  try {
    const configPaths = await getFunctionConfigPaths();

    if (configPaths.length === 0) {
      console.warn("[fix-vercel-runtime] No se encontraron funciones para actualizar.");
      return;
    }

    let updatedCount = 0;
    for (const configPath of configPaths) {
      const updated = await updateRuntime(configPath);
      if (updated) updatedCount += 1;
    }

    console.log(
      `[fix-vercel-runtime] Runtime actualizado a ${TARGET_RUNTIME} en ${updatedCount} funcion(es).`,
    );
  } catch (error) {
    console.error("[fix-vercel-runtime] Error al actualizar runtimes de Vercel.");
    console.error(error);
    process.exitCode = 1;
  }
};

main();
