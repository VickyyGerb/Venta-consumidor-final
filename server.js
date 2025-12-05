import express from "express";
import { chromium } from "playwright";

const PORT = 3000;
const HEADLESS_MODE = false;

const app = express();
app.use(express.json());

async function basic(page, correo, contraseña, cliente, listaPrecio, producto, cantProducto, valorBonificacion, porcentajeIVA, nuevoProduc) {
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

  const dropdownLocator = page.locator("#ListaDePreciosVentaId_chosen");
  if (await dropdownLocator.isVisible()) {
    await dropdownLocator.click();
    await page.waitForTimeout(1000);
    
    const selectors = [".chosen-search input", ".chosen-drop input", ".search-field input"];
    let inputFound = false;
    
    for (const selector of selectors) {
      try {
        const input = page.locator(selector);
        await input.fill(listaPrecio);
        await page.waitForTimeout(1000);
        await input.press("Enter");
        inputFound = true;
        break;
      } catch (e) {
        continue;
      }
    }
    
    if (!inputFound) {
      await page.keyboard.type(listaPrecio);
      await page.waitForTimeout(1000);
      await page.keyboard.press("Enter");
    }
  }

  await page.waitForTimeout(10000);
  
  const codigoProducto = producto.split(' ')[0];
  await page.getByRole("link", { name: "Seleccione... " }).click();
  await page.waitForTimeout(2000);

  const inputBusqueda = page.locator('.select2-input:visible').last();
  await inputBusqueda.fill(codigoProducto);
  await page.waitForTimeout(8000);

  const primerResultado = page.locator('.select2-results li').first();
  await primerResultado.click();
  await page.waitForTimeout(2000);

  console.log(`Ingresando cantidad: ${cantProducto}`);
  
  let cantidadInput = null;
  
  const selectoresCantidad = [
    'input[type="text"][id*="Cantidad"]:visible',
    'input.numeroConComa:visible',
    'input[placeholder*="Cant"]:visible',
    'td input[type="text"]:visible',
    'td input[type="number"]:visible'
  ];
  
  for (const selector of selectoresCantidad) {
    const elementos = page.locator(selector);
    const count = await elementos.count();
    if (count > 0) {
      cantidadInput = elementos.first();
      console.log(`Encontrado campo de cantidad con selector: ${selector}`);
      break;
    }
  }
  
  if (!cantidadInput) {
    console.log("Buscando campo de cantidad en la tabla...");
    
    const filaProducto = page.locator('tbody tr').filter({ hasText: codigoProducto }).or(page.locator('tbody tr').filter({ hasText: producto }));
    const countFilas = await filaProducto.count();
    
    if (countFilas > 0) {
      console.log(`Encontrada fila del producto`);
      
      const inputsFila = filaProducto.locator('input[type="text"], input[type="number"]');
      const countInputs = await inputsFila.count();
      
      if (countInputs > 0) {
        cantidadInput = inputsFila.first();
        console.log(`Encontrado ${countInputs} input(s) en la fila del producto`);
      }
    }
  }
  
  if (cantidadInput && await cantidadInput.isVisible()) {
    try {
      await cantidadInput.click();
      await cantidadInput.fill('');
      await cantidadInput.fill(cantProducto);
      await cantidadInput.press('Tab');
      console.log(`Cantidad ${cantProducto} ingresada`);
    } catch (error) {
      console.log(`Error al llenar cantidad: ${error.message}`);
    }
  } else {
    console.log("Usando JavaScript para buscar campo de cantidad...");
    
    const resultado = await page.evaluate(async (cantidad, codigo) => {
      const filas = document.querySelectorAll('tbody tr');
      let inputCantidad = null;
      
      for (const fila of filas) {
        if (fila.textContent.includes(codigo)) {
          const inputs = fila.querySelectorAll('input[type="text"], input[type="number"]');
          for (const input of inputs) {
            if (input.offsetParent !== null && window.getComputedStyle(input).display !== 'none') {
              inputCantidad = input;
              break;
            }
          }
          if (inputCantidad) break;
        }
      }
      
      if (!inputCantidad) {
        const inputs = document.querySelectorAll('input[type="text"], input[type="number"]');
        for (const input of inputs) {
          if (input.offsetParent !== null && 
              window.getComputedStyle(input).display !== 'none' &&
              !input.value && 
              !input.id.includes('ProductosLibres')) { 
            inputCantidad = input;
            break;
          }
        }
      }
      
      if (inputCantidad) {
        inputCantidad.value = cantidad;
        inputCantidad.dispatchEvent(new Event('input', { bubbles: true }));
        inputCantidad.dispatchEvent(new Event('change', { bubbles: true }));
        return { success: true, id: inputCantidad.id };
      }
      
      return { success: false };
      
    }, cantProducto, codigoProducto);
    
    if (resultado.success) {
      console.log(`Cantidad ${cantProducto} ingresada via JavaScript`);
    } else {
      console.log(`No se pudo encontrar campo de cantidad`);
    }
  }

      await page.waitForTimeout(3000);
  console.log(`Ingresando bonificación: ${valorBonificacion}`);
  
  const bonificacionInput = page.locator('input[id^="ListaProductoVenta_"][id*="_Bonificacion"]');
  const count = await bonificacionInput.count();
  
  if (count > 0) {
    console.log(`Encontrado input de bonificación: ${count} elementos`);
    
    for (let i = 0; i < count; i++) {
      const input = bonificacionInput.nth(i);
      const isVisible = await input.isVisible();
      const id = await input.getAttribute('id');
      
      console.log(`Input ${i}: id="${id}", visible=${isVisible}`);
      
      if (isVisible) {
        await input.click();
        await input.fill('');
        await input.fill(valorBonificacion);
        await input.press('Tab');
        
        await page.waitForTimeout(500);
        
        const valorActual = await input.inputValue();
        console.log(`Valor ingresado: ${valorActual}, esperado: ${valorBonificacion}`);
        
        if (valorActual === valorBonificacion) {
          console.log(`Bonificación ${valorBonificacion} ingresada correctamente`);
          break;
        }
      }
    }
  }
  
  console.log("Usando método JavaScript...");
  
  const resultado = await page.evaluate(async (valor) => {
    const selector = 'input[id^="ListaProductoVenta_"][id*="_Bonificacion"]';
    const input = document.querySelector(selector);
    
    if (input && input.offsetParent !== null) {
      console.log(`Input encontrado: ${input.id}`);
      
      const valorAnterior = input.value;
      input.value = valor;
      
      input.dispatchEvent(new Event('focus', { bubbles: true }));
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.dispatchEvent(new Event('blur', { bubbles: true }));
      
      console.log(`Cambiado de ${valorAnterior} a ${valor}`);
      return { success: true, id: input.id, valorAnterior: valorAnterior };
    }
    
    const inputsClase = document.querySelectorAll('input.numeroConComa');
    for (const inputClase of inputsClase) {
      const id = inputClase.id || '';
      if (id.includes('Bonificacion') && inputClase.offsetParent !== null) {
        console.log(`Input por clase encontrado: ${id}`);
        
        const valorAnterior = inputClase.value;
        inputClase.value = valor;
        
        inputClase.dispatchEvent(new Event('focus', { bubbles: true }));
        inputClase.dispatchEvent(new Event('input', { bubbles: true }));
        inputClase.dispatchEvent(new Event('change', { bubbles: true }));
        inputClase.dispatchEvent(new Event('blur', { bubbles: true }));
        
        console.log(`Cambiado de ${valorAnterior} a ${valor}`);
        return { success: true, id: id, valorAnterior: valorAnterior };
      }
    }
    
    return { success: false };
    
  }, valorBonificacion);
  
  if (resultado.success) {
    console.log(`Bonificación ${valorBonificacion} ingresada via JavaScript`);
  } else {
    console.log(`No se pudo encontrar campo de bonificación`);
    
    const debug = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input');
      const info = [];
      for (const input of inputs) {
        const id = input.id || '';
        if (id.includes('Bonificacion') || id.includes('ListaProductoVenta_')) {
          info.push({
            id: id,
            value: input.value,
            visible: input.offsetParent !== null,
            type: input.type,
            className: input.className
          });
        }
      }
      return info;
    });
    
    console.log("Inputs encontrados:", debug);
  }

  await page.waitForTimeout(1000);
  console.log("Seleccionando porcentaje de IVA...");
  
  const resultadoIVA = await page.evaluate(async (porcentaje) => {
    console.log(`Buscando select de IVA para valor: ${porcentaje}`);
    
    const todosSelects = document.querySelectorAll('select');
    
    for (const select of todosSelects) {
      const opciones = Array.from(select.options);
      
      const tienePorcentajes = opciones.some(opt => 
        opt.text.includes('%') || 
        opt.text.includes('Exento') || 
        opt.text.includes('No Grav')
      );
      
      if (tienePorcentajes) {
        console.log(`Select con porcentajes encontrado: ${select.name || select.id}`);
        console.log(`Opciones disponibles: ${opciones.map(o => o.text).join(', ')}`);
        
        for (const option of opciones) {
          const texto = option.text.trim();
          
          if (porcentaje === "10" && (texto.includes("10,5") || texto.includes("10.5"))) {
            select.value = option.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            console.log(`Seleccionado: ${texto} para porcentaje ${porcentaje}`);
            return { success: true, valor: texto, selectId: select.id };
          }
          if (porcentaje === "21" && texto.includes("21")) {
            select.value = option.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            console.log(`Seleccionado: ${texto} para porcentaje ${porcentaje}`);
            return { success: true, valor: texto, selectId: select.id };
          }
          if (porcentaje === "27" && texto.includes("27")) {
            select.value = option.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            console.log(`Seleccionado: ${texto} para porcentaje ${porcentaje}`);
            return { success: true, valor: texto, selectId: select.id };
          }
          if (porcentaje === "5" && texto.includes("5")) {
            select.value = option.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            console.log(`Seleccionado: ${texto} para porcentaje ${porcentaje}`);
            return { success: true, valor: texto, selectId: select.id };
          }
          if (porcentaje === "2.5" && (texto.includes("2,5") || texto.includes("2.5"))) {
            select.value = option.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            console.log(`Seleccionado: ${texto} para porcentaje ${porcentaje}`);
            return { success: true, valor: texto, selectId: select.id };
          }
          if (porcentaje === "0" && texto.includes("0%")) {
            select.value = option.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            console.log(`Seleccionado: ${texto} para porcentaje ${porcentaje}`);
            return { success: true, valor: texto, selectId: select.id };
          }
          if (porcentaje === "Exento" && texto.includes("Exento")) {
            select.value = option.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            console.log(`Seleccionado: ${texto} para porcentaje ${porcentaje}`);
            return { success: true, valor: texto, selectId: select.id };
          }
          if ((porcentaje === "No Grav" || porcentaje === "No Grav.") && texto.includes("No Grav")) {
            select.value = option.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            console.log(`Seleccionado: ${texto} para porcentaje ${porcentaje}`);
            return { success: true, valor: texto, selectId: select.id };
          }
        }
      }
    }
    
    const chosenContainers = document.querySelectorAll('.chosen-container');
    console.log(`Chosen containers encontrados: ${chosenContainers.length}`);
    
    for (let i = 0; i < chosenContainers.length; i++) {
      const container = chosenContainers[i];
      const selectHidden = container.previousElementSibling;
      
      if (selectHidden && selectHidden.tagName === 'SELECT') {
        const opciones = Array.from(selectHidden.options);
        const tienePorcentajes = opciones.some(opt => 
          opt.text.includes('%') || 
          opt.text.includes('Exento') || 
          opt.text.includes('No Grav')
        );
        
        if (tienePorcentajes) {
          console.log(`Chosen #${i} tiene opciones de porcentaje`);
          
          for (const option of opciones) {
            const texto = option.text.trim();
            
            if (porcentaje === "10" && (texto.includes("10,5") || texto.includes("10.5"))) {
              selectHidden.value = option.value;
              selectHidden.dispatchEvent(new Event('change', { bubbles: true }));
              
              const chosenSingle = container.querySelector('.chosen-single span');
              if (chosenSingle) {
                chosenSingle.textContent = option.text;
              }
              
              console.log(`Seleccionado en chosen #${i}: ${texto}`);
              return { success: true, valor: texto, selectId: selectHidden.id, chosenIndex: i };
            }
            if (porcentaje === "21" && texto.includes("21")) {
              selectHidden.value = option.value;
              selectHidden.dispatchEvent(new Event('change', { bubbles: true }));
              
              const chosenSingle = container.querySelector('.chosen-single span');
              if (chosenSingle) {
                chosenSingle.textContent = option.text;
              }
              
              console.log(`Seleccionado en chosen #${i}: ${texto}`);
              return { success: true, valor: texto, selectId: selectHidden.id, chosenIndex: i };
            }
          }
        }
      }
    }
    
    const elementosIVA = document.querySelectorAll('[id*="IVA"], [name*="IVA"], [class*="IVA"]');
    console.log(`Elementos con IVA: ${elementosIVA.length}`);
    
    for (const elemento of elementosIVA) {
      console.log(`Elemento IVA: ${elemento.tagName} ${elemento.id || elemento.name || ''}`);
    }
    
    return { success: false };
    
  }, porcentajeIVA);
  
  if (resultadoIVA.success) {
    console.log(`IVA seleccionado: ${resultadoIVA.valor}`);
  } else {
    console.log("No se pudo seleccionar IVA automáticamente");
    
    const chosenSingles = page.locator('.chosen-single');
    const countChosen = await chosenSingles.count();
    
    console.log(`Chosen singles encontrados: ${countChosen}`);
    
    if (countChosen > 1) {
      const segundoChosen = chosenSingles.nth(1);
      const isVisible = await segundoChosen.isVisible();
      
      if (isVisible) {
        try {
          await segundoChosen.click();
          await page.waitForTimeout(500);
          
          const searchInput = page.locator('.chosen-search input');
          const countSearch = await searchInput.count();
          
          if (countSearch > 1) {
            const segundoSearch = searchInput.nth(1);
            await segundoSearch.fill(porcentajeIVA === "10" ? "10,5" : porcentajeIVA);
            await page.waitForTimeout(1000);
            await segundoSearch.press("Enter");
            console.log(`IVA ${porcentajeIVA} seleccionado manualmente`);
          }
        } catch (error) {
          console.log(`Error al seleccionar IVA manualmente: ${error.message}`);
        }
      } else {
        console.log("El segundo chosen-single no está visible");
      }
    }
  }

     if (nuevoProduc === "SI") {
    console.log("Agregando nuevo producto libre...");
    
    try {
      const linkCrear = page.getByRole("link", { name: "Crear Producto/Servicio" });
      
      if (await linkCrear.isVisible()) {
        await linkCrear.click();
        console.log("Link 'Crear Producto/Servicio' encontrado y clickeado");
        await page.waitForTimeout(2000);
      } else {
        console.log("Link no visible, buscando por texto...");
        throw new Error("No visible");
      }
    } catch (error) {
      try {
        const links = page.locator('a').filter({ hasText: /Crear Producto|Crear Servicio|Producto\/Servicio/ });
        const count = await links.count();
        
        if (count > 0) {
          console.log(`Encontrados ${count} links relacionados`);
          
          for (let i = 0; i < count; i++) {
            const link = links.nth(i);
            const texto = await link.textContent();
            const isVisible = await link.isVisible();
            
            console.log(`Link ${i}: "${texto?.trim()}", visible: ${isVisible}`);
            
            if (isVisible && texto) {
              await link.click();
              console.log(`Click en link: "${texto.trim()}"`);
              await page.waitForTimeout(2000);
              break;
            }
          }
        } else {
          console.log("No se encontraron links específicos, buscando cualquier link con 'Crear'...");
          
          const todosLinks = page.locator('a');
          const countTodos = await todosLinks.count();
          
          console.log(`Total de links en la página: ${countTodos}`);
          
          for (let i = 0; i < countTodos; i++) {
            const link = todosLinks.nth(i);
            const texto = await link.textContent();
            
            if (texto && (texto.includes("Crear") || texto.includes("crear"))) {
              const isVisible = await link.isVisible();
              console.log(`Link ${i}: "${texto.trim()}", visible: ${isVisible}`);
              
              if (isVisible) {
                await link.click();
                console.log(`Click en link con 'Crear': "${texto.trim()}"`);
                await page.waitForTimeout(2000);
                break;
              }
            }
          }
        }
      } catch (error2) {
        console.log("Error buscando links, usando JavaScript...");
        
        const resultado = await page.evaluate(() => {
          const links = document.querySelectorAll('a');
          
          for (const link of links) {
            const texto = link.textContent?.trim() || '';
            
            if (texto === "Crear Producto/Servicio" || 
                texto.includes("Crear Producto") || 
                texto.includes("Producto/Servicio")) {
              
              if (link.offsetParent !== null && window.getComputedStyle(link).display !== 'none') {
                console.log(`Link encontrado: "${texto}"`);
                link.click();
                return { success: true, texto: texto, tipo: 'exacto' };
              }
            }
          }
          
          for (const link of links) {
            const texto = link.textContent?.trim() || '';
            
            if (texto.includes("Crear") && link.offsetParent !== null) {
              console.log(`Link con 'Crear' encontrado: "${texto}"`);
              link.click();
              return { success: true, texto: texto, tipo: 'parcial' };
            }
          }
          
          const selectores = [
            'a[href*="CrearProducto"]',
            'a[href*="crearproducto"]',
            'a[href*="NuevoProducto"]',
            'a[href*="nuevoproducto"]',
            'a.crear-producto',
            'a.nuevo-producto'
          ];
          
          for (const selector of selectores) {
            const link = document.querySelector(selector);
            if (link && link.offsetParent !== null) {
              console.log(`Link encontrado por selector: ${selector}`);
              link.click();
              return { success: true, texto: link.textContent?.trim(), tipo: 'selector' };
            }
          }
          
          return { success: false };
        });
        
        if (resultado.success) {
          console.log(`Link clickeado via JavaScript: "${resultado.texto}" (tipo: ${resultado.tipo})`);
          await page.waitForTimeout(2000);
        } else {
          console.log("No se pudo encontrar el link para crear producto");
          
          const debugLinks = await page.evaluate(() => {
            const links = document.querySelectorAll('a');
            const info = [];
            
            for (const link of links) {
              const texto = link.textContent?.trim() || '';
              const href = link.getAttribute('href') || '';
              const visible = link.offsetParent !== null && window.getComputedStyle(link).display !== 'none';
              
              if (texto || href) {
                info.push({
                  texto: texto,
                  href: href.substring(0, 50), 
                  visible: visible,
                  className: link.className
                });
              }
            }
            
            return info;
          });
          
          console.log("Todos los links en la página:");
          debugLinks.forEach((link, i) => {
            if (link.texto.includes("Crear") || link.texto.includes("Producto") || link.texto.includes("Servicio")) {
              console.log(`[${i}] Texto: "${link.texto}", Href: "${link.href}", Visible: ${link.visible}, Clase: "${link.className}"`);
            }
          });
        }
      }
    }
    
    await page.waitForTimeout(3000);
    
    const tieneFormulario = await page.locator('input[placeholder*="Descripción"], input[placeholder*="Producto"], input[name*="Descripcion"]').count();
    
    if (tieneFormulario > 0) {
      console.log("Formulario de nuevo producto detectado");
    } else {
      console.log("No se detectó formulario de nuevo producto");
    }
  }
  
  await page.pause();
  console.log("Proceso completado.");
}

app.post("/login-basic", async (req, res) => {
  const { correo, contraseña, cliente, listaPrecio, producto, cantProducto, valorBonificacion, porcentajeIVA, nuevoProduc } = req.body;

  if (!correo || !contraseña || !cliente || !listaPrecio || !producto || !cantProducto || !valorBonificacion || !porcentajeIVA || !nuevoProduc) {
    return res.status(400).json({
      ok: false,
      error: "Faltan datos: correo, contraseña, cliente, producto, cantProducto, listaPrecio, porcentajeIVA, nuevoProduc y valorBonificacion son requeridos."
    });
  }

  const browser = await chromium.launch({ 
    headless: HEADLESS_MODE, 
    slowMo: 200 
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await basic(page, correo, contraseña, cliente, listaPrecio, producto, cantProducto, valorBonificacion, porcentajeIVA, nuevoProduc);

    res.json({
      ok: true,
      message: "COMPLETADO EXITOSAMENTE"
    });

  } catch (error) {
    console.error("Error en login-basic:", error);
    res.status(500).json({
      ok: false,
      error: error.message
    });

  } finally {
    await browser.close();
  }
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});