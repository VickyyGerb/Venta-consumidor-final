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

async function basic(page, correo, contraseña, cliente, listaPrecio, producto, cantProducto) {
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
  
  console.log("🕐 ESPERANDO 10 SEGUNDOS para que carguen productos...");
  await page.waitForTimeout(10000);

  console.log("=== SELECCIÓN DE PRODUCTO - SOLUCIÓN DEFINITIVA ===");
  
  const codigoProducto = producto.split(' ')[0];
  console.log(`Buscando producto con código: "${codigoProducto}"`);
  
  console.log("1. Abriendo dropdown de productos...");
  await page.getByRole("link", { name: "Seleccione... " }).click();
  await page.waitForTimeout(2000);
  
  await page.screenshot({ path: 'debug-dropdown-abierto.png' });
  
  console.log("2. Usando JavaScript para búsqueda precisa...");
  const busquedaExitosa = await page.evaluate(async (codigo) => {
    console.log("Iniciando búsqueda con código:", codigo);
    
    if (window.jQuery) {
      console.log("Usando jQuery...");
      
      const $inputs = $('.select2-input:visible');
      console.log("Inputs visibles encontrados:", $inputs.length);
      
      if ($inputs.length > 0) {
        const $input = $inputs.last();
        console.log("Usando último input visible");
        
        $input.focus();
        
        $input.val(codigo);
        
        $input.trigger('focus');
        $input.trigger('keydown');
        $input.trigger('keypress');
        $input.trigger('input');
        $input.trigger('keyup');
        $input.trigger('change');
        
        if ($input.data('select2')) {
          $input.trigger('input.select2');
        }
        
        console.log("Eventos jQuery disparados");
        return true;
      }
    }
    
    console.log("Usando JavaScript puro...");
    
    const inputs = document.querySelectorAll('.select2-input');
    let inputActivo = null;
    
    for (let i = inputs.length - 1; i >= 0; i--) {
      const rect = inputs[i].getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && window.getComputedStyle(inputs[i]).visibility !== 'hidden') {
        inputActivo = inputs[i];
        break;
      }
    }
    
    if (inputActivo) {
      console.log("Input activo encontrado");
      
      inputActivo.focus();
      
      inputActivo.value = codigo;
      
      const eventos = ['focus', 'click', 'keydown', 'keypress', 'input', 'keyup', 'change'];
      
      eventos.forEach((evento, index) => {
        setTimeout(() => {
          let event;
          
          if (evento.includes('key')) {
            event = new KeyboardEvent(evento, {
              bubbles: true,
              cancelable: true,
              key: codigo.slice(-1) || '0',
              code: 'Digit' + (codigo.slice(-1) || '0'),
              keyCode: codigo.charCodeAt(codigo.length - 1) || 48,
              which: codigo.charCodeAt(codigo.length - 1) || 48
            });
          } else {
            event = new Event(evento, { 
              bubbles: true, 
              cancelable: true 
            });
          }
          
          if (evento === 'input') {
            event = new InputEvent('input', {
              bubbles: true,
              cancelable: true,
              inputType: 'insertText',
              data: codigo
            });
          }
          
          inputActivo.dispatchEvent(event);
        }, index * 10);
      });
      
      console.log("Eventos JavaScript disparados");
      return true;
    }
    
    console.log("No se pudo encontrar input activo");
    return false;
    
  }, codigoProducto);
  
  if (!busquedaExitosa) {
    console.log("⚠️ No se pudo realizar la búsqueda con JavaScript");
  }
  
  console.log("3. Esperando búsqueda AJAX (8 segundos)...");
  await page.waitForTimeout(8000);
  
  console.log("4. Verificando resultados...");
  const resultados = await page.locator('.select2-results li:not(.select2-no-results)').count();
  console.log(`Resultados encontrados: ${resultados}`);
  
  if (resultados > 0) {
    const items = page.locator('.select2-results li');
    const count = await items.count();
    console.log("Resultados disponibles:");
    for (let i = 0; i < Math.min(count, 3); i++) {
      const texto = await items.nth(i).innerText();
      console.log(`  [${i}] ${texto.substring(0, 80)}...`);
    }
    
    console.log("5. Seleccionando primer resultado...");
    await items.first().click();
    console.log("✅ PRODUCTO SELECCIONADO EXITOSAMENTE");
  } else {
    console.log("⚠️ No se encontraron resultados en el dropdown");
    
    const tieneMensajeNoResults = await page.locator('.select2-no-results').isVisible();
    if (tieneMensajeNoResults) {
      const mensaje = await page.locator('.select2-no-results').innerText();
      console.log(`Mensaje del dropdown: "${mensaje}"`);
    }
    
    console.log("6. Intentando método de emergencia...");
    await page.evaluate((codigo) => {
      const allElements = document.querySelectorAll('*');
      let productoElement = null;
      
      for (const element of allElements) {
        if (element.textContent && element.textContent.includes(codigo) && 
            element.textContent.includes('Almohaditas')) {
          productoElement = element;
          break;
        }
      }
      
      if (productoElement) {
        console.log("Elemento del producto encontrado, intentando seleccionar...");
        
        productoElement.click();
        
        if (productoElement.tagName === 'OPTION' && productoElement.parentElement) {
          const select = productoElement.parentElement;
          select.value = productoElement.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
          console.log("Producto seleccionado directamente en select");
        }
        
        return true;
      }
      
      return false;
    }, codigoProducto);
    
    await page.waitForTimeout(2000);
  }
  
  await page.waitForTimeout(2000);
  console.log("✅ PROCESO DE PRODUCTO COMPLETADO");
  
  console.log("=== LLENANDO CANTIDAD DEL PRODUCTO ===");
  console.log(`Cantidad a ingresar: ${cantProducto}`);
  
  const selectoresCantidad = [
    'input[id^="ListaProductoVenta_"]',
    'input[placeholder*="Cantidad"]',
    'input[class*="numeroConCom"]',
    'input[type="text"][inputmode="numeric"]',
    'input[type="number"]',
    '.select2-container ~ input',
    'td:has-text("Almohaditas") ~ td input',
    'tr:has-text("Almohaditas") input'
  ];

  let cantidadLlenada = false;

  for (const selector of selectoresCantidad) {
    try {
      console.log(`Probando selector de cantidad: ${selector}`);
      const elementos = page.locator(selector);
      const count = await elementos.count();
      
      if (count > 0) {
        console.log(`✓ Encontrados ${count} elementos con selector: ${selector}`);
        
        for (let i = 0; i < count; i++) {
          const elemento = elementos.nth(i);
          const isVisible = await elemento.isVisible();
          const valor = await elemento.getAttribute('value') || '';
          const placeholder = await elemento.getAttribute('placeholder') || '';
          
          console.log(`  Elemento ${i}: visible=${isVisible}, value="${valor}", placeholder="${placeholder}"`);
          
          if (isVisible && (placeholder.includes('Cant') || valor === '' || i === 0)) {
            console.log(`  Llenando con "${cantProducto}"...`);
            await elemento.click();
            await elemento.fill('');
            await elemento.fill(cantProducto);
            
            await elemento.press('Tab');
            await page.waitForTimeout(500);
            
            cantidadLlenada = true;
            console.log(`✅ Cantidad ${cantProducto} llenada exitosamente con selector: ${selector}`);
            break;
          }
        }
        
        if (cantidadLlenada) break;
      }
    } catch (error) {
      console.log(`  Error con selector ${selector}:`, error.message);
    }
  }

  if (!cantidadLlenada) {
    console.log("⚠️ No se encontró input de cantidad con selectores normales, usando JavaScript...");
    await page.evaluate((cantidad) => {
      const inputs = document.querySelectorAll('input[type="text"], input[type="number"]');
      for (const input of inputs) {
        if (input.offsetParent !== null && !input.value) {
          input.value = cantidad;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          console.log(`Cantidad ${cantidad} ingresada via JavaScript`);
          return true;
        }
      }
      return false;
    }, cantProducto);
  }
  
  await page.waitForTimeout(2000);
  console.log("✅ PROCESO COMPLETADO");
}

app.post("/login-basic", async (req, res) => {
  const { correo, contraseña, cliente, listaPrecio, producto, cantProducto } = req.body;

  if (!correo || !contraseña || !cliente || !listaPrecio || !producto || !cantProducto) {
    return res.status(400).json({
      ok: false,
      error: "Faltan datos: correo, contraseña, cliente, producto, cantProducto y listaPrecio son requeridos."
    });
  }

  const browser = await chromium.launch({ 
    headless: HEADLESS_MODE, 
    slowMo: 200 
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await basic(page, correo, contraseña, cliente, listaPrecio, producto, cantProducto);

    res.json({
      ok: true,
      message: "COMPLETADO EXITOSAMENTE"
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