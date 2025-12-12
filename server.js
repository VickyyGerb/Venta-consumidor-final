import express from "express";
import { chromium } from "playwright";

const PORT = 3000;
const HEADLESS_MODE = false;

const app = express();
app.use(express.json());

async function basic(page, correo, contraseña, cliente, listaPrecio, producto, cantProducto, valorBonificacion, nuevoProductoUpper, nombreNuevoProducto, categoriaNuevoProducto, codigoProveedor, codigoBarra, productoLibreUpper, descripcionProductoLibre, cantidadProductoLibre, precioProductoLibre, bonificacionProductoLibre) {
  await page.goto("https://dev.fidel.com.ar/");
  await page.getByRole("link", { name: "Iniciar sesión" }).click();
  await page.waitForTimeout(4000);
  await page.getByRole("textbox", { name: "Email" }).fill(correo);
  await page.getByRole("textbox", { name: "Contraseña" }).fill(contraseña);
  await page.getByRole("button", { name: "Ingresar" }).click();
  
  await page.waitForTimeout(10000);
  await page.goto("https://dev.fidel.com.ar/Sistema/ComprobanteRapido/Crear");
  await page.waitForTimeout(4000);

  await page.getByRole("link", { name: "0000 - Consumidor Final - $ 20.000,00  " }).click();
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

  if (producto && producto.trim() !== "") {    
    await page.getByRole("link", { name: "Seleccione... " }).click();
    await page.waitForTimeout(2000);
    
    await page.locator('.select2-input:visible').last().fill(producto);
    await page.waitForTimeout(4000);
    
    await page.waitForSelector('.select2-results li', { timeout: 10000 });
    await page.locator('.select2-results li').first().click();
    await page.waitForTimeout(2000);

    if (cantProducto && cantProducto !== "0") {
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
        const elementos = page.locator(selector).filter({ hasNot: page.locator(":disabled") });
        const count = await elementos.count();
        if (count > 0) {
          for (let i = 0; i < count; i++) {
            const elemento = elementos.nth(i);
            if (await elemento.isVisible() && !(await elemento.isDisabled())) {
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
      }
    }
    
    const bonificacionSelectores = [
      'input[id*="Bonificacion"]',
      'input[name*="Bonificacion"]',
      'input[placeholder*="Bonificacion"]',
      'input[placeholder*="bonificacion"]',
      'input.numeroConComa'
    ];
    
    for (const selector of bonificacionSelectores) {
      const elementos = page.locator(selector).filter({ hasNot: page.locator(":disabled") });
      const count = await elementos.count();
      
      if (count > 0) {
        for (let i = 0; i < count; i++) {
          const elemento = elementos.nth(i);
          const isVisible = await elemento.isVisible();
          const isDisabled = await elemento.isDisabled();
          
          if (isVisible && !isDisabled) {
            await elemento.click();
            await elemento.fill('');
            await elemento.fill(valorBonificacion);
            break;
          }
        }
      }
    }
    
    await page.waitForTimeout(2000);

    if (nuevoProductoUpper === "SI") {
      await page.waitForTimeout(3000);
      
      await page.evaluate(() => {
        const links = document.querySelectorAll('a');
        for (let link of links) {
          if (link.textContent && link.textContent.includes('Crear Producto/Servicio')) {
            link.click();
            return true;
          }
        }
        return false;
      });
      
      await page.waitForTimeout(5000);
      
      await page.waitForLoadState('networkidle');
      
      await page.evaluate((nombre) => {
        const input = document.querySelector('input[id="Nombre"]');
        if (input) {
          input.focus();
          input.value = nombre;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
        return false;
      }, nombreNuevoProducto);
      
      await page.waitForTimeout(1000);
      
      await page.evaluate((codigoProveedor) => {
        const input = document.querySelector('input[id="CodigoProveedor"]');
        if (input) {
          input.focus();
          input.value = codigoProveedor;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          return true;
        }
        return false;
      }, codigoProveedor);
      
      await page.waitForTimeout(1000);
      
      await page.evaluate((codigoBarra) => {
        const input = document.querySelector('input[id="CodigoDeBarra"]');
        if (input) {
          input.focus();
          input.value = codigoBarra;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          return true;
        }
        return false;
      }, codigoBarra);
      
      await page.waitForTimeout(1000);
      
      await page.evaluate(() => {
        const span = document.querySelector('#CategoriaId_chosen .chosen-single span');
        if (span) {
          span.click();
          return true;
        }
        return false;
      });
      
      await page.waitForTimeout(500);
      
      await page.evaluate((categoria) => {
        const input = document.querySelector('.chosen-container-active .chosen-search input');
        if (input) {
          input.focus();
          input.value = categoria;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          return true;
        }
        return false;
      }, categoriaNuevoProducto);
      
      await page.waitForTimeout(1500);
      
      await page.evaluate(() => {
        const firstOption = document.querySelector('.chosen-container-active .chosen-results li');
        if (firstOption) {
          firstOption.click();
          return true;
        }
        return false;
      });
    }
    
    if (productoLibreUpper === "SI") {
      await page.waitForTimeout(3000);
      
      try {
        await page.locator('text="Productos/Servicios Libres"').first().click();
        await page.waitForTimeout(1000);
      } catch (error) {
        console.log('No se pudo hacer clic en Productos/Servicios Libres');
      }
      
      await page.waitForTimeout(2000);
      
      const tableRows = await page.locator('table tr').all();
      let productoTipoSelect = null;
      
      for (let row of tableRows) {
        const rowText = await row.textContent();
        if (rowText && rowText.includes('Productos/Servicios Libres')) {
          const selectElement = await row.locator('select').first();
          if (await selectElement.count() > 0) {
            productoTipoSelect = selectElement;
            break;
          }
        }
      }
      
      if (productoTipoSelect) {
        await productoTipoSelect.selectOption({ label: 'Productos' });
        await page.waitForTimeout(1000);
      }
      
      const libreRows = await page.locator('table tr').all();
      let libreRow = null;
      
      for (let row of libreRows) {
        const rowText = await row.textContent();
        if (rowText && (rowText.includes('Descripción') || rowText.includes('Tipo') || rowText.includes('Cant.'))) {
          libreRow = row;
          break;
        }
      }
      
      if (libreRow) {
        const inputs = await libreRow.locator('input').all();
        
        if (inputs.length >= 4) {
          await inputs[0].fill(descripcionProductoLibre);
          await page.waitForTimeout(500);
          
          await inputs[1].fill(cantidadProductoLibre);
          await page.waitForTimeout(500);
          
          await inputs[2].fill(precioProductoLibre);
          await page.waitForTimeout(500);
          
          await inputs[3].fill(bonificacionProductoLibre);
        }
      }
      
      await page.waitForTimeout(2000);
    }
  }
}

app.post("/login-basic", async (req, res) => {
  const { correo, contraseña, cliente, listaPrecio, producto, cantProducto, 
          valorBonificacion, porcentajeIVA, nuevoProducto, nombreNuevoProducto, 
          categoriaNuevoProducto, codigoProveedor, codigoBarra, productoLibre, 
          descripcionProductoLibre, cantidadProductoLibre, precioProductoLibre, 
          bonificacionProductoLibre } = req.body;

  if (!correo || !contraseña || !producto || 
      !cantProducto || !porcentajeIVA || !nuevoProducto) {
    return res.status(400).json({ 
      ok: false, 
      error: "Faltan datos básicos." 
    });
  }

  const nuevoProductoUpper = nuevoProducto.trim().toUpperCase();

  if (nuevoProductoUpper === "SI") {
    if (!nombreNuevoProducto) {
      return res.status(400).json({ 
        ok: false, 
        error: "Cuando nuevoProducto es 'SI', el campo nombreNuevoProducto es obligatorio." 
      });
    }
    
    if (!categoriaNuevoProducto) {
      return res.status(400).json({ 
        ok: false, 
        error: "Cuando nuevoProducto es 'SI', el campo categoriaNuevoProducto es obligatorio." 
      });
    }
  }
  if (nuevoProductoUpper !== "SI" && nuevoProductoUpper !== "NO") {
    return res.status(400).json({ 
      ok: false, 
      error: "El campo nuevoProducto debe ser 'SI' o 'NO'." 
    });
  }

  const productoLibreUpper = productoLibre.trim().toUpperCase();

  if (productoLibreUpper === "SI") {
    if (!descripcionProductoLibre) {
      return res.status(400).json({
        ok: false,
        error: "Cuando productoLibre es 'SI', el campo descripcionProductoLibre es obligatorio."
      });
    }
    if (!cantidadProductoLibre) {
      return res.status(400).json({
        ok: false,  
        error: "Cuando productoLibre es 'SI', el campo cantidadProductoLibre es obligatorio."
      });
    }
    if (!precioProductoLibre) {
      return res.status(400).json({
        ok: false,
        error: "Cuando productoLibre es 'SI', el campo precioProductoLibre es obligatorio."
      });
    }
    if (!bonificacionProductoLibre) {
      return res.status(400).json({
        ok: false,
        error: "Cuando productoLibre es 'SI', el campo bonificacionProductoLibre es obligatorio."
      });
    }
  }

  if (productoLibreUpper !== "SI" && productoLibreUpper !== "NO") {
    return res.status(400).json({ 
      ok: false, 
      error: "El campo productoLibre debe ser 'SI' o 'NO'." 
    });
  }

  const browser = await chromium.launch({ 
    headless: HEADLESS_MODE,
    args: ['--start-maximized']
  });
  
  const context = await browser.newContext({ 
    viewport: null
  });
  
  const page = await context.newPage();

  try {
    await basic(page, correo, contraseña, cliente, listaPrecio, producto, 
                cantProducto, valorBonificacion, nuevoProductoUpper, 
                nombreNuevoProducto, categoriaNuevoProducto, codigoProveedor || '', 
                codigoBarra || '', productoLibreUpper, descripcionProductoLibre, 
                cantidadProductoLibre, precioProductoLibre, bonificacionProductoLibre);

    res.json({ ok: true, message: "COMPLETADO" });

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ 
      ok: false, 
      error: error.message || "Error interno del servidor" 
    });

  } finally {
    await browser.close();
  }
});

app.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`);
});