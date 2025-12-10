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

  // PRIMERO: PRODUCTO NORMAL (solo si se proporciona producto)
  if (producto && producto.trim() !== "") {
    console.log("Procesando PRODUCTO NORMAL");
    const codigoProducto = producto.split(' ')[0];
    
    await page.getByRole("link", { name: "Seleccione... " }).click();
    await page.waitForTimeout(2000);
    
    await page.locator('.select2-input:visible').last().fill(codigoProducto);
    await page.waitForTimeout(4000);
    
    await page.waitForSelector('.select2-results li', { timeout: 10000 });
    await page.locator('.select2-results li').first().click();
    await page.waitForTimeout(2000);

    // Procesar cantidad para producto normal
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
      }
    }
    
    // IVA para producto normal
    await page.waitForTimeout(1000);
    await procesarIVA(page, porcentajeIVA);
    
    await page.waitForTimeout(2000);
  }

  // DESPUÉS: PRODUCTO LIBRE (solo si se indica específicamente)
  if (productoLibre && productoLibre.toUpperCase() === "SI") {
    console.log("Procesando PRODUCTO LIBRE");
    
    // Agregar nueva línea para producto libre
    await page.waitForTimeout(2000);
    await agregarNuevaLinea(page);
    
    // Buscar y llenar el campo específico de producto libre
    await page.waitForTimeout(1000);
    const campoEncontrado = await buscarYLlenarProductoLibre(page, descripcionLibre);
    
    if (!campoEncontrado) {
      // Si no encuentra el campo específico, usar método alternativo
      await usarMetodoAlternativoProductoLibre(page, descripcionLibre);
    }
    
    // Llenar cantidad para producto libre (generalmente 1)
    await llenarCantidadProductoLibre(page);
    
    // Llenar precio libre si se proporciona
    if (precioLibre && precioLibre !== "0") {
      await llenarPrecioLibre(page, precioLibre);
    }
    
    // IVA para producto libre
    await page.waitForTimeout(1000);
    await procesarIVA(page, porcentajeIVA);
    
    await page.waitForTimeout(2000);
  }

  // BONIFICACIÓN (solo si hay producto normal y se proporciona bonificación)
  if (producto && producto.trim() !== "" && valorBonificacion && valorBonificacion !== "0") {
    console.log("Aplicando BONIFICACIÓN a producto normal");
    await aplicarBonificacion(page, valorBonificacion);
  }

  await page.waitForTimeout(2000);
}

// FUNCIONES AUXILIARES

async function agregarNuevaLinea(page) {
  // Buscar botón para agregar nueva línea
  const botonesAgregar = [
    page.getByRole('button', { name: /\+/i }),
    page.getByRole('button', { name: /Agregar/i }),
    page.getByRole('button', { name: /Nuevo/i }),
    page.locator('button:has-text("+")'),
    page.locator('a:has-text("+")'),
    page.locator('[title*="Agregar"]'),
    page.locator('[title*="agregar"]')
  ];
  
  for (const boton of botonesAgregar) {
    if (await boton.count() > 0 && await boton.isVisible()) {
      await boton.click();
      await page.waitForTimeout(2000);
      console.log("Nueva línea agregada para producto libre");
      return true;
    }
  }
  
  // Si no encuentra botón, hacer click en el último selector de producto
  const ultimoSelector = page.getByRole("link", { name: "Seleccione... " }).last();
  if (await ultimoSelector.count() > 0) {
    await ultimoSelector.click();
    await page.waitForTimeout(2000);
    console.log("Click en último selector para nueva línea");
    return true;
  }
  
  console.log("No se pudo agregar nueva línea");
  return false;
}

async function buscarYLlenarProductoLibre(page, descripcionLibre) {
  // Buscar específicamente el campo input#ListaProductoLibreVenta
  const campoEspecifico = page.locator('input#ListaProductoLibreVenta');
  
  if (await campoEspecifico.count() > 0) {
    console.log("Encontrado input#ListaProductoLibreVenta");
    await campoEspecifico.click();
    await campoEspecifico.fill('');
    await campoEspecifico.fill(descripcionLibre || "Producto Libre");
    await page.waitForTimeout(1000);
    return true;
  }
  
  // También buscar por otros selectores relacionados
  const otrosSelectores = [
    'input[name*="ProductoLibre"]',
    'input[name*="LibreVenta"]',
    'input[placeholder*="libre"]',
    'input[placeholder*="Libre"]'
  ];
  
  for (const selector of otrosSelectores) {
    const elemento = page.locator(selector);
    if (await elemento.count() > 0) {
      console.log(`Encontrado campo con selector: ${selector}`);
      await elemento.click();
      await elemento.fill('');
      await elemento.fill(descripcionLibre || "Producto Libre");
      await page.waitForTimeout(1000);
      return true;
    }
  }
  
  return false;
}

async function usarMetodoAlternativoProductoLibre(page, descripcionLibre) {
  console.log("Usando método alternativo para producto libre");
  
  // Hacer click en el selector de producto
  await page.getByRole("link", { name: "Seleccione... " }).last().click();
  await page.waitForTimeout(2000);
  
  // Buscar y escribir "LIBRE"
  const select2Inputs = page.locator('.select2-input:visible');
  const count = await select2Inputs.count();
  
  if (count > 0) {
    await select2Inputs.last().fill("LIBRE");
    await page.waitForTimeout(3000);
    
    // Seleccionar opción "LIBRE"
    const libreOption = page.locator('.select2-results li').filter({ hasText: /libre/i });
    if (await libreOption.count() > 0) {
      await libreOption.first().click();
      await page.waitForTimeout(2000);
      
      // Llenar descripción si existe campo
      if (descripcionLibre) {
        const descripcionInput = page.locator('input[placeholder*="descripcion" i], input[placeholder*="Descripción" i]').last();
        if (await descripcionInput.count() > 0) {
          await descripcionInput.fill(descripcionLibre);
        }
      }
    }
  }
}

async function llenarCantidadProductoLibre(page) {
  // Buscar el ÚLTIMO campo de cantidad (que sería el del producto libre)
  const cantidadInputs = page.locator('input[placeholder*="Cant"], input[placeholder*="cant"], input[id*="Cantidad"]');
  const cantidadCount = await cantidadInputs.count();
  
  if (cantidadCount > 0) {
    // Tomar el último campo de cantidad visible
    for (let i = cantidadCount - 1; i >= 0; i--) {
      const cantidadInput = cantidadInputs.nth(i);
      if (await cantidadInput.isVisible()) {
        await cantidadInput.click();
        await cantidadInput.fill('');
        await cantidadInput.fill("1"); // Producto libre generalmente es cantidad 1
        await cantidadInput.press('Tab');
        console.log("Cantidad 1 asignada a producto libre");
        return;
      }
    }
  }
}

async function llenarPrecioLibre(page, precioLibre) {
  // Buscar el ÚLTIMO campo de precio (que sería el del producto libre)
  const precioInputs = page.locator('input[placeholder*="Precio"], input[name*="Precio"], input.numeroConComa');
  const precioCount = await precioInputs.count();
  
  if (precioCount > 0) {
    // Tomar el último campo de precio visible
    for (let i = precioCount - 1; i >= 0; i--) {
      const precioInput = precioInputs.nth(i);
      if (await precioInput.isVisible()) {
        await precioInput.click();
        await precioInput.fill('');
        await precioInput.fill(precioLibre);
        console.log(`Precio ${precioLibre} asignado a producto libre`);
        return;
      }
    }
  }
}

async function procesarIVA(page, porcentajeIVA) {
  const allHiddenSelects = await page.$$('select[style*="display: none"]');
  
  for (const select of allHiddenSelects) {
    const selectId = await select.getAttribute('id');
    const selectName = await select.getAttribute('name');
    
    if ((selectId && selectId.includes('TipoIVA')) || (selectName && selectName.includes('TipoIVA'))) {
      const chosenDiv = await page.$(`div[id="${selectId}_chosen"]`);
      
      if (chosenDiv) {
        const chosenSingle = await chosenDiv.$('a.chosen-single');
        
        if (chosenSingle) {
          await chosenSingle.click();
          await page.waitForTimeout(1000);
          
          const inputBusqueda = await page.locator('[data-gtm-form-interact-field-id="0"]');
          
          if (await inputBusqueda.isVisible()) {
            await inputBusqueda.fill(porcentajeIVA);
            await page.waitForTimeout(800);
            
            const primeraOpcion = await page.locator('.active-result').first();
            if (await primeraOpcion.isVisible()) {
              await primeraOpcion.click();
            } else {
              await page.keyboard.press('Enter');
            }
          } else {
            await page.keyboard.type(porcentajeIVA);
            await page.waitForTimeout(500);
            await page.keyboard.press('Enter');
          }
          console.log(`IVA ${porcentajeIVA}% aplicado`);
          break;
        }
      }
    }
  }
}

async function aplicarBonificacion(page, valorBonificacion) {
  const bonificacionSelectores = [
    'input[id*="Bonificacion"]',
    'input[name*="Bonificacion"]',
    'input[placeholder*="Bonificacion"]',
    'input[placeholder*="bonificacion"]',
    'input.numeroConComa'
  ];
  
  for (const selector of bonificacionSelectores) {
    const elementos = page.locator(selector);
    const count = await elementos.count();
    
    if (count > 0) {
      // Tomar el PRIMER campo de bonificación (para producto normal)
      for (let i = 0; i < count; i++) {
        const elemento = elementos.nth(i);
        const isVisible = await elemento.isVisible();
        
        if (isVisible) {
          await elemento.click();
          await elemento.fill('');
          await elemento.fill(valorBonificacion);
          await elemento.press('Tab');
          console.log(`Bonificación ${valorBonificacion} aplicada`);
          return true;
        }
      }
    }
  }
  
  console.log("No se encontró campo de bonificación");
  return false;
}

app.post("/login-basic", async (req, res) => {
  const { correo, contraseña, cliente, listaPrecio, producto, cantProducto, valorBonificacion, porcentajeIVA, productoLibre, descripcionLibre, precioLibre } = req.body;

  if (!correo || !contraseña || !cliente || !listaPrecio || !porcentajeIVA) {
    return res.status(400).json({ ok: false, error: "Faltan datos básicos." });
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