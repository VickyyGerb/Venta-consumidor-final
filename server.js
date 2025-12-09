import express from "express";
import { chromium } from "playwright";

const PORT = 3000;
const HEADLESS_MODE = false;

const app = express();
app.use(express.json());

async function basic(page, correo, contraseña, cliente, listaPrecio, producto, cantProducto, valorBonificacion, porcentajeIVA, productoLibre, descripcionLibre, precioLibre) {
  await page.goto("https://dev.fidel.com.ar/");
  await page.getByRole("link", { name: "Iniciar sesión" }).click();
  await page.waitForTimeout(4000);
  await page.getByRole("textbox", { name: "Email" }).fill(correo);
  await page.getByRole("textbox", { name: "Contraseña" }).fill(contraseña);
  await page.getByRole("button", { name: "Ingresar" }).click();
  
  await page.waitForTimeout(6000);
  await page.goto("https://dev.fidel.com.ar/Sistema/ComprobanteRapido/Crear");
  await page.waitForTimeout(4000);

  await page.getByRole("link", { name: "0000 - Consumidor Final - $ 20.000,00  " }).click();
  await page.locator("#s2id_autogen1_search.select2-input").fill(cliente);
  await page.waitForTimeout(3000);
  
  await page.click('.select2-result-label');
  await page.waitForTimeout(3000);

  await page.locator("#ListaDePreciosVentaId_chosen").click();
  await page.waitForTimeout(1000);
  await page.keyboard.type(listaPrecio);
  await page.waitForTimeout(1000);
  await page.keyboard.press("Enter");
  
  await page.waitForTimeout(5000);

  if (productoLibre && productoLibre.toUpperCase() === "SI") {
    await page.getByRole("link", { name: "Seleccione... " }).click();
    await page.waitForTimeout(2000);
    await page.locator('.select2-input:visible').last().fill("LIBRE");
    await page.waitForTimeout(3000);
    
    const libreOption = page.locator('.select2-results li').filter({ hasText: /libre/i });
    if (await libreOption.count() > 0) {
      await libreOption.first().click();
      await page.waitForTimeout(2000);
      
      if (descripcionLibre) {
        await page.fill('input[placeholder*="descripcion" i], input[placeholder*="Descripción" i], input[name*="Descripcion"], textarea', descripcionLibre);
      }
      
      if (precioLibre && precioLibre !== "0") {
        await page.waitForTimeout(1000);
        await page.fill('input.numeroConComa, input[name*="Precio"], input[placeholder*="Precio"]', precioLibre);
      }
    }
  } else {
    const codigoProducto = producto.split(' ')[0];
    
    await page.getByRole("link", { name: "Seleccione... " }).click();
    await page.waitForTimeout(2000);
    
    await page.locator('.select2-input:visible').last().fill(codigoProducto);
    await page.waitForTimeout(4000);
    
    await page.waitForSelector('.select2-results li', { timeout: 10000 });
    await page.locator('.select2-results li').first().click();
    await page.waitForTimeout(2000);
  }

  if (cantProducto) {
    await page.waitForTimeout(1000);
    
    const selectoresCantidad = [
      'input[placeholder*="Cant"]',
      'input[placeholder*="cant"]',
      'input[id*="Cantidad"]',
      'td input.numeroConComa',
      'input.numeroConComa'
    ];
    
    let cantidadInput = null;
    
    for (const selector of selectoresCantidad) {
      const elementos = page.locator(selector);
      const count = await elementos.count();
      if (count > 0) {
        for (let i = 0; i < count; i++) {
          const elemento = elementos.nth(i);
          if (await elemento.isVisible()) {
            cantidadInput = elemento;
            break;
          }
        }
        if (cantidadInput) break;
      }
    }
    
    if (cantidadInput) {
      await cantidadInput.click();
      await cantidadInput.fill('');
      await cantidadInput.fill(cantProducto);
      await cantidadInput.press('Tab');
    } else {
      const todosInputs = await page.$$('input[type="text"], input.numeroConComa');
      for (const input of todosInputs) {
        const placeholder = await input.getAttribute('placeholder');
        const id = await input.getAttribute('id');
        if ((placeholder && placeholder.toLowerCase().includes('cant')) || 
            (id && id.toLowerCase().includes('cantidad'))) {
          await input.click();
          await input.fill('');
          await input.fill(cantProducto);
          await page.keyboard.press('Tab');
          break;
        }
      }
    }
  }

  await page.waitForTimeout(2000);

  if (valorBonificacion && valorBonificacion !== "0") {
    const bonificacionSelectores = [
      'input[id*="Bonificacion"]',
      'input[name*="Bonificacion"]',
      'input[placeholder*="Bonificacion"]',
      'input[placeholder*="bonificacion"]',
      'input.numeroConComa'
    ];
    
    let bonificacionEncontrada = false;
    
    for (const selector of bonificacionSelectores) {
      const elementos = page.locator(selector);
      const count = await elementos.count();
      
      if (count > 0) {
        for (let i = 0; i < count; i++) {
          const elemento = elementos.nth(i);
          const isVisible = await elemento.isVisible();
          
          if (isVisible) {
            await elemento.click();
            await elemento.fill('');
            await elemento.fill(valorBonificacion);
            await elemento.press('Tab');
            bonificacionEncontrada = true;
            break;
          }
        }
        
        if (bonificacionEncontrada) break;
      }
    }
    
    if (!bonificacionEncontrada) {
      const todosInputs = await page.$$('input[type="text"], input.numeroConComa');
      
      for (const input of todosInputs) {
        const placeholder = await input.getAttribute('placeholder');
        const id = await input.getAttribute('id');
        const name = await input.getAttribute('name');
        const isVisible = await input.evaluate(el => el.offsetParent !== null);
        
        if (isVisible && (placeholder || id || name)) {
          const texto = (placeholder || id || name).toLowerCase();
          
          if (texto.includes('bonificacion')) {
            await input.click();
            await input.fill('');
            await input.fill(valorBonificacion);
            await page.keyboard.press('Tab');
            bonificacionEncontrada = true;
            break;
          }
        }
      }
    }
  }

  await page.waitForTimeout(1000);

  const allHiddenSelects = await page.$$('select[style*="display: none"]');
  
  for (const select of allHiddenSelects) {
    const selectId = await select.getAttribute('id');
    const selectName = await select.getAttribute('name');
    
    if (selectId && selectId.includes('TipoIVA') || selectName && selectName.includes('TipoIVA')) {
      const chosenDiv = await page.$(`div[id="${selectId}_chosen"]`);
      
      if (chosenDiv) {
        const chosenSingle = await chosenDiv.$('a.chosen-single');
        
        if (chosenSingle) {
          await chosenSingle.click();
          await page.waitForTimeout(500);
          
          const searchInput = await page.$('.chosen-drop .chosen-search input');
          
          if (searchInput) {
            await searchInput.click();
            await searchInput.fill('');
            await searchInput.fill(porcentajeIVA);
            await page.waitForTimeout(1000);
            const firstOption = await page.$('.chosen-drop .active-result');
            if (firstOption) await firstOption.click();
          } else {
            const allOptions = await page.$$('.chosen-drop .active-result');
            for (const option of allOptions) {
              const text = await option.textContent();
              if (text && text.includes(porcentajeIVA)) {
                await option.click();
                break;
              }
            }
          }
          break;
        }
      }
    }
  }

  await page.pause();
}

app.post("/login-basic", async (req, res) => {
  const { correo, contraseña, cliente, listaPrecio, producto, cantProducto, valorBonificacion, porcentajeIVA, productoLibre, descripcionLibre, precioLibre } = req.body;

  if (!correo || !contraseña || !cliente || !listaPrecio || !porcentajeIVA) {
    return res.status(400).json({ ok: false, error: "Faltan datos básicos." });
  }

  const browser = await chromium.launch({ headless: HEADLESS_MODE });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await basic(page, correo, contraseña, cliente, listaPrecio, producto, cantProducto, valorBonificacion, porcentajeIVA, productoLibre, descripcionLibre, precioLibre);

    res.json({ ok: true, message: "COMPLETADO" });

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ ok: false, error: error.message });

  } finally {
    await browser.close();
  }
});

app.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`);
});