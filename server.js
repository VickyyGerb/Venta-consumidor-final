import express from "express";
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const PORT = 3000;
const HEADLESS_MODE = false;

// Crear carpeta para errores si no existe
const erroresFolder = "./errores";
if (!fs.existsSync(erroresFolder)) {
  fs.mkdirSync(erroresFolder);
}

const app = express();
app.use(express.json()); // Para recibir JSON


// ---------------- FUNCIONES --------------------

async function guardarEvidenciaError(page, nombreBase = "error") {
  if (!page || page.isClosed()) return;

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    await page.screenshot({
      path: path.join(erroresFolder, `${nombreBase}_${timestamp}.png`),
      fullPage: true,
    });

    const html = await page.content();
    fs.writeFileSync(
      path.join(erroresFolder, `${nombreBase}_${timestamp}.html`),
      html
    );
  } catch (err) {
    console.error("Error guardando evidencia:", err);
  }
}

async function basic(page, correo, contraseña) {
  await page.goto("https://dev.fidel.com.ar/");
  await page.getByRole("link", { name: "Iniciar sesión" }).click();

  await page.waitForTimeout(4000);
  await page.getByRole("textbox", { name: "Email" }).fill(correo);
  await page.getByRole("textbox", { name: "Contraseña" }).fill(contraseña);
  await page.getByRole("button", { name: "Ingresar" }).click();
}



// ---------------- ENDPOINT --------------------

app.post("/login-basic", async (req, res) => {
  const { correo, contraseña } = req.body;

  if (!correo || !contraseña) {
    return res.status(400).json({
      ok: false,
      error: "Faltan datos: correo y contraseña son requeridos."
    });
  }

  const browser = await chromium.launch({ headless: HEADLESS_MODE });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await basic(page, correo, contraseña);

    res.json({
      ok: true,
      message: "Login ejecutado correctamente."
    });
  } catch (error) {
    console.error("Error en login-basic:", error);
    await guardarEvidenciaError(page, "login-error");

    res.status(500).json({
      ok: false,
      error: error.message
    });
  } finally {
    await browser.close();
  }
});


// ---------------- SERVIDOR --------------------

app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
});
