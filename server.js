import express from "express";
import { chromium } from "playwright";

const PORT = 3000;
const HEADLESS_MODE = false;

const app = express();
app.use(express.json());

async function basic(page, correo, contraseña, cliente, listaPrecio, producto, cantProducto, valorBonificacion, nuevoProductoUpper, nombreNuevoProducto, tipoNuevoProducto, ivaNuevoProducto, contableVenta, contableCompra, categoriaNuevoProducto, codigoProveedor, codigoBarra, productoLibreUpper, descripcionProductoLibre, cantidadProductoLibre, precioProductoLibre, bonificacionProductoLibre) {
  await page.goto("https://dev.fidel.com.ar/");
  await page.getByRole("link", { name: "Iniciar sesión" }).click();
  await page.waitForTimeout(4000);
  await page.getByRole("textbox", { name: "Email" }).fill(correo);
  await page.getByRole("textbox", { name: "Contraseña" }).fill(contraseña);
  await page.getByRole("button", { name: "Ingresar" }).click();
  
  await page.waitForTimeout(10000);
  await page.goto("https://dev.fidel.com.ar/Sistema/ComprobanteRapido/Crear");
  await page.waitForTimeout(4000);

  if (cliente && cliente.trim() !== "" && cliente.trim() !== "0000") {
    await page.getByRole("link", { name: "0000 - Consumidor Final - $ 20.000,00  " }).click();
    await page.locator("#s2id_autogen1_search.select2-input").fill(cliente);
    await page.waitForTimeout(3000);
    
    await page.click('.select2-result-label');
    await page.waitForTimeout(3000);
  } else {
    console.log("Cliente es '0000' o vacío, no se modifica");
    await page.waitForTimeout(3000);
  }

  if (listaPrecio && listaPrecio.trim() !== "" && listaPrecio.trim().toLowerCase() !== "general") {
    await page.locator("#ListaDePreciosVentaId_chosen").click();
    await page.waitForTimeout(1000);
    await page.keyboard.type(listaPrecio);
    await page.waitForTimeout(1000);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(2000);
  } else {
    console.log("Lista de precios es 'General' o vacía, no se modifica");
    await page.waitForTimeout(2000);
  }
  
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
            await page.keyboard.press('Tab');
            break;
          }
         await page.keyboard.press('Tab');
        }
      }
    }
    

    if (nuevoProductoUpper === "SI") {
      await page.waitForTimeout(3000);

      await page.getByRole('link', { name: 'Crear Producto/Servicio' }).click();
      await page.waitForTimeout(2000);

      await page.waitForSelector('#form-productoModal', { state: 'visible', timeout: 5000 });

      await page.locator('#form-productoModal #Nombre').click();
      await page.locator('#form-productoModal #Nombre').fill(nombreNuevoProducto);

      await page.waitForTimeout(1000);

      if (codigoProveedor && codigoProveedor.trim() !== "") {
      await page.locator('#form-productoModal #CodigoProveedor').fill(codigoProveedor);
      await page.waitForTimeout(500);
      }

      if (codigoBarra && codigoBarra.trim() !== "") {
      await page.locator('#form-productoModal #CodigoDeBarra').fill(codigoBarra);
      await page.waitForTimeout(500);
      }

      await page.locator('#ConceptoId_chosen a').filter({ hasText: 'Productos' }).click();
      await page.waitForTimeout(500);

      await page.locator('#ConceptoId_chosen > .chosen-drop > .chosen-search > input').fill(tipoNuevoProducto);
      await page.waitForTimeout(1000);
      await page.keyboard.press('Enter');

      await page.locator('#AlicuotaId_chosen a').filter({ hasText: /^Seleccione...$/ }).click();
      await page.waitForTimeout(500);

      await page.locator('#AlicuotaId_chosen > .chosen-drop > .chosen-search > input').fill(ivaNuevoProducto);
      await page.waitForTimeout(1000);
      await page.keyboard.press('Enter');

      await page.locator('#divSubCategorias a').filter({ hasText: /^Seleccione...$/ }).click();
      await page.waitForTimeout(500);

      await page.locator('#divSubCategorias .chosen-search input').fill(categoriaNuevoProducto);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);

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

    await page.waitForTimeout(5000);
    
    let precioTotal = await page.evaluate(() => {
      const totalElement = document.querySelector('input#TotalTemp.numeroConComa');
      if (totalElement) {
        return totalElement.value;
      }
      return null;
    });
    
    if (precioTotal) {
      console.log(`PRECIO TOTAL DE LA FACTURA: $${precioTotal}`);
    } else {
      console.log('No se encontró el precio total');
      
      precioTotal = await page.evaluate(() => {
        const selectors = [
          'input#TotalTemp',
          'input.numeroConComa[id*="Total"]',
          'input[name*="Total"]',
          'input[placeholder*="Total"]',
          '.total-final',
          '.importe-total'
        ];
        
        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element && element.value) {
            return element.value;
          }
        }
        return null;
      });
      
      if (precioTotal) {
        console.log(`PRECIO TOTAL ENCONTRADO (selector alternativo): $${precioTotal}`);
      }
    }
    
    const resultado = {
      precioTotal: precioTotal || "No encontrado"
    };

    await page.waitForTimeout(5000);
    
    try {
      await page.locator('a.btn.btn-xs.btn-success:has-text("Facturar")').click();
    } catch (error) {
      try {
        await page.locator('a:has-text("Facturar")').click();
      } catch (error2) {
        await page.evaluate(() => {
          const elements = document.querySelectorAll('a.btn.btn-xs.btn-success');
          for (let element of elements) {
            if (element.textContent && element.textContent.includes('Facturar')) {
              element.click();
              return true;
            }
          }
          return false;
        });
      }
    }
    
    await page.pause();
    
    return resultado;
  }
  
  return { precioTotal: "Sin producto" };
}

app.post("/login-basic", async (req, res) => {
  const { correo, contraseña, cliente, listaPrecio, producto, cantProducto, 
          valorBonificacion, porcentajeIVA, nuevoProducto, nombreNuevoProducto, 
          categoriaNuevoProducto, tipoNuevoProducto, ivaNuevoProducto, contableVenta, contableCompra, codigoProveedor, codigoBarra, productoLibre, 
          descripcionProductoLibre, cantidadProductoLibre, precioProductoLibre, 
          bonificacionProductoLibre } = req.body;

  if (!correo || !contraseña) {
    return res.status(400).json({ 
      ok: false, 
      error: "Faltan datos básicos." 
    });
  }

  const nuevoProductoUpper = nuevoProducto ? nuevoProducto.trim().toUpperCase() : "NO";

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
    if (!ivaNuevoProducto) {
      return res.status(400).json({ 
        ok: false, 
        error: "Cuando nuevoProducto es 'SI', el campo ivaNuevoProducto es obligatorio." 
      });
    }
    if (!contableCompra) {
      return res.status(400).json({ 
        ok: false, 
        error: "Cuando nuevoProducto es 'SI', el campo contableCompra es obligatorio." 
      });
    }
    if (!contableVenta) {
      return res.status(400).json({ 
        ok: false, 
        error: "Cuando nuevoProducto es 'SI', el campo contableVenta es obligatorio." 
      });
    }
  }
  if (nuevoProductoUpper !== "SI" && nuevoProductoUpper !== "NO") {
    return res.status(400).json({ 
      ok: false, 
      error: "El campo nuevoProducto debe ser 'SI' o 'NO'." 
    });
  }

  const productoLibreUpper = productoLibre ? productoLibre.trim().toUpperCase() : "NO";

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
  
  page.setDefaultTimeout(120000);
  page.setDefaultNavigationTimeout(120000);

  try {
    const resultado = await basic(page, correo, contraseña, cliente || "", listaPrecio || "", producto || "", 
                cantProducto || "", valorBonificacion || "", nuevoProductoUpper, 
                nombreNuevoProducto || "", categoriaNuevoProducto || "", codigoProveedor || '', 
                codigoBarra || '', tipoNuevoProducto || "", ivaNuevoProducto || "", contableVenta || "", contableCompra || "", productoLibreUpper, descripcionProductoLibre || "", 
                cantidadProductoLibre || "", precioProductoLibre || "", bonificacionProductoLibre || "");

    res.json({ 
      ok: true, 
      message: "COMPLETADO",
      precioTotal: resultado.precioTotal
    });

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