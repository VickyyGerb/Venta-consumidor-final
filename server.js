import express from "express";
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const PORT = 3000;
const HEADLESS_MODE = false;

const erroresFolder = "./errores";
if (!fs.existsSync(erroresFolder)) {
  fs.mkdirSync(erroresFolder);
}

const app = express();
app.use(express.json()); 

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

async function basic(page, correo, contraseña, cliente, listaPrecio, producto) {
  await page.goto("https://dev.fidel.com.ar/");
  await page.getByRole("link", { name: "Iniciar sesión" }).click();

  await page.waitForTimeout(4000);
  await page.getByRole("textbox", { name: "Email" }).fill(correo);
  await page.getByRole("textbox", { name: "Contraseña" }).fill(contraseña);
  await page.getByRole("button", { name: "Ingresar" }).click();

  console.log("Login completado.");

  await page.waitForTimeout(6000);
  await page.goto("https://dev.fidel.com.ar/Sistema/ComprobanteRapido/Crear");
  await page.waitForTimeout(4000);

  await page.getByRole("link", { name: "0000 - Consumidor Final - $ 20.000,00  " }).click();
  await page.locator("#s2id_autogen1_search.select2-input").fill(cliente);
  await page.waitForTimeout(5000); 
  await page.locator("#select2-result-label-4.select2-result-label").first().click();
  await page.waitForTimeout(5000);

  
  console.log("=== INICIO SELECCIÓN LISTA DE PRECIOS ===");
  
  const dropdownLocator = page.locator("#ListaDePreciosVentaId_chosen");
  const isDropdownVisible = await dropdownLocator.isVisible();
  console.log("Dropdown visible:", isDropdownVisible);
  
  if (isDropdownVisible) {
    
    console.log("Haciendo click en dropdown...");
    await dropdownLocator.click();
    
    try {
      const selectors = [
        ".chosen-search input",
        ".chosen-drop input",
        ".search-field input",
        ".chosen-search > input",
        "input.chosen-search-input"
      ];
      
      let inputFound = false;
      for (const selector of selectors) {
        console.log(`Probando selector: ${selector}`);
        try {
          await page.waitForSelector(selector, { 
            state: "visible", 
            timeout: 3000 
          });
          console.log(`✓ Selector encontrado: ${selector}`);
          
          const input = page.locator(selector);
          await input.fill(listaPrecio);
          await page.waitForTimeout(1000);
          await input.press("Enter");
          inputFound = true;
          break;
        } catch (e) {
          console.log(`✗ Selector no encontrado: ${selector}`);
        }
      }
      
      if (!inputFound) {
        console.log("No se encontró input de búsqueda, intentando método alternativo...");        
        await page.keyboard.type(listaPrecio);
        await page.waitForTimeout(1000);
        await page.keyboard.press("Enter");
      }
      
    } catch (error) {
      console.error("Error en selección:", error);
    }
  } else {
    console.log("Dropdown no visible, intentando método alternativo...");
    
    try {
      await page.selectOption("#ListaDePreciosVentaId", listaPrecio);
      console.log("Seleccionado directamente");
    } catch (error) {
      console.error("Error en selección directa:", error);
      
      const options = await page.locator("#ListaDePreciosVentaId option").all();
      console.log("Opciones disponibles:");
      for (const option of options) {
        const text = await option.textContent();
        console.log(`- ${text}`);
      }
    }
  }
  await page.waitForTimeout(5000)

  await page.getByRole("link", { name: "Seleccione... " }).click();

  await page.locator("#s2id_autogen3_search.select2-input").fill(producto)
}



app.post("/login-basic", async (req, res) => {
  const { correo, contraseña, cliente, listaPrecio, producto } = req.body;

  if (!correo || !contraseña || !cliente || !listaPrecio || !producto) {
    return res.status(400).json({
      ok: false,
      error: "Faltan datos: correo, contraseña, cliente, producto y listaPrecio son requeridos."
    });
  }


  const browser = await chromium.launch({ headless: HEADLESS_MODE, slowMo: 200
 });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await basic(page, correo, contraseña, cliente, listaPrecio, producto);

    res.json({
      ok: true,
      message: "COMPLETADOOO"
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

app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
});
