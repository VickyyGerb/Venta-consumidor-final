import express from "express";
import { chromium } from "playwright";

const PORT = 3000;
const HEADLESS_MODE = false;

const app = express();
app.use(express.json());

async function basic(page, correo, contraseña, cliente, listaPrecio, producto, cantProducto, valorBonificacion, nuevoProductoUpper, nombreNuevoProducto, tipoNuevoProducto, ivaNuevoProducto, contableVenta, contableCompra, categoriaNuevoProducto, codigoProveedor, codigoBarra, productoLibreUpper, descripcionProductoLibre, cantidadProductoLibre, precioProductoLibre, bonificacionProductoLibre, productoNormalUpper, precioNuevoProducto, cantProductoNuevo, tipoProductoLibre, bonificacionProductoNuevo, condicionPago, cantidadCuotas) {
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

  let codigoLeido = "";

  if (productoNormalUpper === "SI" && producto && producto.trim() !== "") {    
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
  }

  if (nuevoProductoUpper === "SI") {
    await page.waitForTimeout(3000);

    try {
      await page.getByRole('link', { name: 'Crear Producto/Servicio' }).click();
      await page.waitForTimeout(3000);
      
      await page.waitForSelector('#form-productoModal', { state: 'visible', timeout: 5000 });
      
      codigoLeido = await page.locator('#form-productoModal input#Codigo').inputValue();
      console.log(`Código leído del formulario: ${codigoLeido}`);
      
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

      await page.locator('#ConceptoId_chosen a').click();
      await page.waitForTimeout(500);
      
      await page.locator('#ConceptoId_chosen .chosen-search input').fill(tipoNuevoProducto);
      await page.waitForTimeout(1000);
      
      const tipoOptions = await page.locator('#ConceptoId_chosen .chosen-results li').all();
      for (const option of tipoOptions) {
        const optionText = await option.textContent();
        if (optionText && optionText.includes(tipoNuevoProducto)) {
          await option.click();
          break;
        }
      }
      await page.waitForTimeout(1000);

      await page.locator('#AlicuotaId_chosen a').click();
      await page.waitForTimeout(500);
      
      await page.locator('#AlicuotaId_chosen .chosen-search input').fill('');
      await page.waitForTimeout(500);
      
      let ivaEncontrado = false;
      
      if (ivaNuevoProducto === "5" || ivaNuevoProducto === "5.0" || ivaNuevoProducto === "5,0") {
        await page.locator('#AlicuotaId_chosen .chosen-search input').fill('5%');
        await page.waitForTimeout(2000);
        
        const ivaOptions = await page.locator('#AlicuotaId_chosen .chosen-results li').all();
        for (const option of ivaOptions) {
          const optionText = await option.textContent();
          if (optionText) {
            const text = optionText.trim();
            if (text === "5%" || text === "5.00%" || text === "5,00%" || 
                text.startsWith("5%") || text.includes("5.00%")) {
              await option.click();
              ivaEncontrado = true;
              break;
            }
          }
        }
      } 
      else if (ivaNuevoProducto === "10.5" || ivaNuevoProducto === "10,5") {
        await page.locator('#AlicuotaId_chosen .chosen-search input').fill('10.5%');
        await page.waitForTimeout(2000);
        
        const ivaOptions = await page.locator('#AlicuotaId_chosen .chosen-results li').all();
        for (const option of ivaOptions) {
          const optionText = await option.textContent();
          if (optionText) {
            const text = optionText.trim();
            if (text === "10.5%" || text === "10,5%" || text === "10.50%" || text === "10,50%") {
              await option.click();
              ivaEncontrado = true;
              break;
            }
          }
        }
      }
      else {
        await page.locator('#AlicuotaId_chosen .chosen-search input').fill(ivaNuevoProducto);
        await page.waitForTimeout(2000);
        
        const ivaOptions = await page.locator('#AlicuotaId_chosen .chosen-results li').all();
        for (const option of ivaOptions) {
          const optionText = await option.textContent();
          if (optionText && optionText.includes(ivaNuevoProducto)) {
            await option.click();
            ivaEncontrado = true;
            break;
          }
        }
      }
      
      if (!ivaEncontrado) {
        await page.locator('#AlicuotaId_chosen .chosen-results li').first().click();
      }
      
      await page.waitForTimeout(1000);

      await page.locator('#divSubCategorias a').click();
      await page.waitForTimeout(500);
      
      await page.locator('#divSubCategorias .chosen-search input').fill(categoriaNuevoProducto);
      await page.waitForTimeout(2000);
      
      const categoriaOptions = await page.locator('#divSubCategorias .chosen-results li').all();
      let categoriaEncontrada = false;
      
      for (const option of categoriaOptions) {
        const optionText = await option.textContent();
        if (optionText) {
          const text = optionText.trim();
          if (text.toLowerCase() === categoriaNuevoProducto.toLowerCase()) {
            await option.click();
            categoriaEncontrada = true;
            break;
          }
        }
      }
      
      if (!categoriaEncontrada) {
        for (const option of categoriaOptions) {
          const optionText = await option.textContent();
          if (optionText && optionText.toLowerCase().includes(categoriaNuevoProducto.toLowerCase())) {
            await option.click();
            categoriaEncontrada = true;
            break;
          }
        }
      }
      
      if (!categoriaEncontrada && categoriaOptions.length > 0) {
        await categoriaOptions[0].click();
      }
      
      await page.waitForTimeout(1000);

      if (contableVenta && contableVenta.trim() !== "") {
        try {
          const contableVentaInput = await page.locator('#form-productoModal input[name*="ContableVenta"], #form-productoModal input[id*="ContableVenta"]').first();
          if (await contableVentaInput.count() > 0) {
            await contableVentaInput.fill(contableVenta);
            await page.waitForTimeout(500);
          }
        } catch (error) {
          console.log('No se encontró campo contableVenta');
        }
      }

      if (contableCompra && contableCompra.trim() !== "") {
        try {
          const contableCompraInput = await page.locator('#form-productoModal input[name*="ContableCompra"], #form-productoModal input[id*="ContableCompra"]').first();
          if (await contableCompraInput.count() > 0) {
            await contableCompraInput.fill(contableCompra);
            await page.waitForTimeout(500);
          }
        } catch (error) {
          console.log('No se encontró campo contableCompra');
        }
      }

      await page.locator('a').filter({ hasText: 'Peso' }).first().click();
      await page.waitForTimeout(1000);
      await page.keyboard.press('Tab');
      await page.keyboard.type(precioNuevoProducto);
      await page.keyboard.press('Enter');
      await page.getByRole('link', { name: 'Guardar' }).click();
      await page.waitForTimeout(5000);
      
      const seleccioneButtons = await page.locator('a:has-text("Seleccione...")').all();
      if (seleccioneButtons.length >= 2) {
        await seleccioneButtons[1].click();
      } else {
        await page.getByRole("link", { name: "Seleccione... " }).click();
      }
      
      await page.waitForTimeout(2000);
      
      await page.locator('.select2-input:visible').last().fill(codigoLeido);
      await page.waitForTimeout(4000);
      
      await page.waitForSelector('.select2-results li', { timeout: 10000 });
      await page.locator('.select2-results li').first().click();
      await page.waitForTimeout(2000);

      await page.keyboard.press('Tab');
      await page.keyboard.type(cantProductoNuevo);
      await page.waitForTimeout(1000);
      await page.keyboard.press('Tab');
      await page.keyboard.press("Tab");
      await page.keyboard.type(bonificacionProductoNuevo);
      await page.waitForTimeout(2000);
      await page.keyboard.press('Enter');
      
    } catch (error) {
      console.error('Error al crear nuevo producto:', error);
    }
  }
  
  if (productoLibreUpper === "SI") {
    await page.waitForTimeout(3000);
    
    await page.locator(
    "//input[contains(@id,'ListaProductoLibreVenta') and contains(@id,'__Nombre')]").type(descripcionProductoLibre);
    await page.waitForTimeout(2000);
    await page.keyboard.press("Tab")
    await page.keyboard.type(tipoProductoLibre)
    await page.keyboard.press("Enter")
    await page.waitForTimeout(2000);
    await page.keyboard.press("Tab")
    await page.keyboard.type(cantidadProductoLibre)
    await page.waitForTimeout(2000);
    await page.keyboard.press("Tab")
    await page.keyboard.type(precioProductoLibre)
    await page.waitForTimeout(2000);
    await page.keyboard.press("Tab")
    await page.keyboard.type(bonificacionProductoLibre)
    await page.waitForTimeout(2000);
    await page.keyboard.press("Enter")
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
    precioTotal: precioTotal || "No encontrado",
    codigoLeido: codigoLeido || "No se leyó código"
  };

  await page.waitForTimeout(5000);

  if (condicionPago && condicionPago.trim() !== "") {
    const clienteTrim = cliente ? cliente.trim() : "";
    const condicionPagoLower = condicionPago.toLowerCase().trim();
    
    if (clienteTrim === "0000") {
      if (condicionPagoLower !== "contado") {
        console.log("Cliente es '0000' - Solo se permite 'Contado' como condición de pago. Se omite el cambio.");
      } else {
        console.log("Cliente '0000' con condición 'Contado' - No se requiere cambio");
      }
    } else {
      if (condicionPagoLower === "contado" || condicionPagoLower === "cuenta corriente") {
        try {
          await page.locator('a')
              .filter({ hasText: 'Contado' })
              .or(page.locator('a').filter({ hasText: 'Cuenta corriente' }))
              .first()
              .click();            
          await page.waitForTimeout(2000);
          await page.keyboard.type(condicionPago);
          await page.waitForTimeout(2000);
          await page.keyboard.press('Enter');
          await page.waitForTimeout(2000);

          if (condicionPagoLower === "cuenta corriente" && cantidadCuotas && cantidadCuotas.trim() !== "") {
            await page.locator('input#CantidadCuotas').click();
            await page.locator('input#CantidadCuotas').type(cantidadCuotas);
            await page.waitForTimeout(2000);
            await page.locator('input#CantidadCuotas').press('Enter');           
            await page.waitForTimeout(2000);
          }
        } catch (error) {
          console.log('Error al seleccionar condición de pago:', error);
        }
      } else {
        console.log(`Condición de pago '${condicionPago}' no reconocida. Debe ser 'Contado' o 'Cuenta corriente'`);
      }
    }
  }
  
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
  
  await page.waitForTimeout(2000);

  try {
    const abrirCajaVisible = await page.locator('span#TituloAbrirCaja:has-text("Abrir Caja - General")').isVisible({ timeout: 3000 });
    
    if (abrirCajaVisible) {
      console.log('Se detectó la ventana de "Abrir Caja". Cerrando ventana...');
      await page.waitForTimeout(2000);
      
    try {
      await page.locator('a[onclick="AbrirCajaPost()"]').click({ force: true });
      console.log('Botón Guardar de Abrir Caja clickeado');
    } catch (error) {
      console.log('No se pudo hacer clic en el botón Guardar de Abrir Caja, presionando Escape...');
      await page.keyboard.press('Escape');
    }
          
      await page.waitForTimeout(2000);
    }
  } catch (error) {
    
  }
  
  return resultado;
}

app.post("/login-basic", async (req, res) => {
  const { correo, contraseña, cliente, listaPrecio, producto, cantProducto, 
          valorBonificacion, porcentajeIVA, nuevoProducto, nombreNuevoProducto, 
          categoriaNuevoProducto, tipoNuevoProducto, ivaNuevoProducto, contableVenta, contableCompra, codigoProveedor, codigoBarra, productoLibre, 
          descripcionProductoLibre, cantidadProductoLibre, precioProductoLibre, 
          bonificacionProductoLibre, productoNormal, precioNuevoProducto, cantProductoNuevo, tipoProductoLibre, bonificacionProductoNuevo, condicionPago, cantidadCuotas } = req.body;

  if (!correo || !contraseña) {
    return res.status(400).json({ 
      ok: false, 
      error: "Faltan datos básicos." 
    });
  }

  const nuevoProductoUpper = nuevoProducto ? nuevoProducto.trim().toUpperCase() : "NO";
  const productoLibreUpper = productoLibre ? productoLibre.trim().toUpperCase() : "NO";
  const productoNormalUpper = productoNormal ? productoNormal.trim().toUpperCase() : "SI";

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
    if (!precioNuevoProducto) {
      return res.status(400).json({ 
        ok: false, 
        error: "Cuando nuevoProducto es 'SI', el campo precioNuevoProducto es obligatorio." 
      });
    }
    if (!cantProductoNuevo) {
      return res.status(400).json({ 
        ok: false, 
        error: "Cuando nuevoProducto es 'SI', el campo cantProductoNuevo es obligatorio." 
      });
    }
     if (!bonificacionProductoNuevo) {
      return res.status(400).json({ 
        ok: false, 
        error: "Cuando nuevoProducto es 'SI', el campo bonificacionProductoNuevo es obligatorio." 
      });
    }
  }
  
  if (nuevoProductoUpper !== "SI" && nuevoProductoUpper !== "NO") {
    return res.status(400).json({ 
      ok: false, 
      error: "El campo nuevoProducto debe ser 'SI' o 'NO'." 
    });
  }

  if (productoLibreUpper === "SI") {
    if (!descripcionProductoLibre) {
      return res.status(400).json({
        ok: false,
        error: "Cuando productoLibre es 'SI', el campo descripcionProductoLibre es obligatorio."
      });
    }
    if (!tipoProductoLibre) {
      return res.status(400).json({
        ok: false,
        error: "Cuando productoLibre es 'SI', el campo tipoProductoLibre es obligatorio."
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

  if (productoNormalUpper !== "SI" && productoNormalUpper !== "NO") {
    return res.status(400).json({ 
      ok: false, 
      error: "El campo productoNormal debe ser 'SI' o 'NO'." 
    });
  }

  if (condicionPago && condicionPago.trim() !== "") {
    const condicionPagoLower = condicionPago.toLowerCase().trim();
    const clienteTrim = cliente ? cliente.trim() : "";
    
    if (clienteTrim === "0000" && condicionPagoLower !== "contado") {
      return res.status(400).json({ 
        ok: false, 
        error: "Cuando el cliente es '0000', solo se permite 'Contado' como condición de pago." 
      });
    }
    
    if (condicionPagoLower !== "contado" && condicionPagoLower !== "cuenta corriente") {
      return res.status(400).json({ 
        ok: false, 
        error: "El campo condicionPago debe ser 'Contado' o 'Cuenta Corriente'." 
      });
    }
    
    if (condicionPagoLower === "cuenta corriente") {
      if (cantidadCuotas && cantidadCuotas.trim() !== "") {
        const cuotasNum = parseInt(cantidadCuotas);
        if (isNaN(cuotasNum) || cuotasNum <= 0) {
          return res.status(400).json({ 
            ok: false, 
            error: "Si se especifica cantidadCuotas, debe ser un número mayor a 0." 
          });
        }
      }
    }
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
              nombreNuevoProducto || "", tipoNuevoProducto || "", ivaNuevoProducto || "", 
              contableVenta || "", contableCompra || "", categoriaNuevoProducto || "", 
              codigoProveedor || '', codigoBarra || '', productoLibreUpper, 
              descripcionProductoLibre || "", cantidadProductoLibre || "", 
              precioProductoLibre || "", bonificacionProductoLibre || "", productoNormalUpper, precioNuevoProducto || "", cantProductoNuevo || "", tipoProductoLibre || "", bonificacionProductoNuevo || "", condicionPago || "", cantidadCuotas || "");
    res.json({ 
      ok: true, 
      message: "COMPLETADO",
      precioTotal: resultado.precioTotal,
      codigoLeido: resultado.codigoLeido
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