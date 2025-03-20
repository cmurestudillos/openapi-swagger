// Función para realizar validación en tiempo real
function performLiveValidation() {
  try {
    const content = editor.getValue();
    const contentType = detectContentType(content);

    let spec;
    if (contentType === 'yaml') {
      spec = jsyaml.load(content);
    } else {
      spec = JSON.parse(content);
    }

    // Limpiar marcadores de error anteriores
    clearErrorMarkers();

    // Validar la especificación
    // Asegurarse de que SwaggerParser está disponible
    if (typeof window.SwaggerParser === 'undefined') {
      console.error('SwaggerParser no está definido');
      setStatus('Validación no disponible: SwaggerParser no está cargado', true);
      return;
    }

    window.SwaggerParser.validate(spec)
      .then(() => {
        // Validación exitosa
        setEditorValidState(true);
      })
      .catch(err => {
        // Error en la validación
        setEditorValidState(false, err);
        highlightError(err);
      });
  } catch (error) {
    // Error al parsear
    setEditorValidState(false, error);
    highlightSyntaxError(error);
  }
}

// Función para limpiar los marcadores de error
function clearErrorMarkers() {
  // Limpiar marcadores de error anteriores
  const session = editor.getSession();
  if (session.$backMarkers) {
    const markerIds = Object.keys(session.$backMarkers);
    markerIds.forEach(id => {
      if (session.$backMarkers[id].clazz === 'error-line') {
        session.removeMarker(id);
      }
    });
  }
}

// Función para establecer el estado visual del editor
function setEditorValidState(isValid, error = null) {
  if (isValid) {
    // Si es válido, mostrar un indicador sutil
    statusElement.textContent = 'Validación en tiempo real: ✓ Válido';
    statusElement.style.color = 'green';
  } else {
    // Si no es válido, mostrar el error
    statusElement.textContent = `Validación en tiempo real: ✗ Error - ${error.message}`;
    statusElement.style.color = 'red';
  }
}

// Función para resaltar errores de sintaxis
function highlightSyntaxError(error) {
  // Intentar extraer información de línea y columna del mensaje de error
  const lineMatch = error.message.match(/line (\d+)/i);
  if (lineMatch && lineMatch[1]) {
    const lineNumber = parseInt(lineMatch[1]) - 1; // Las líneas en ACE son 0-indexed
    highlightLine(lineNumber);
  }
}

// Función para resaltar errores de validación
function highlightError(error) {
  // Si el error contiene una ruta de swagger, intentar localizar la posición
  if (error.path && error.path.length > 0) {
    // Aquí la lógica depende de la estructura del archivo
    // y puede ser más compleja según cómo se formatee
    try {
      // Como aproximación, podemos buscar la cadena en el documento
      const content = editor.getValue();
      const pathStr = error.path.join('.');
      const searchStr = error.path[error.path.length - 1];

      // Buscar líneas que contengan la cadena
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(searchStr)) {
          highlightLine(i);
          break;
        }
      }
    } catch (e) {
      console.error('Error al resaltar error:', e);
    }
  }
}

// Función para resaltar una línea
function highlightLine(lineNumber) {
  const session = editor.getSession();
  const Range = ace.require('ace/range').Range;

  // Crear un marcador que resalte toda la línea
  const marker = session.addMarker(new Range(lineNumber, 0, lineNumber, Infinity), 'error-line', 'fullLine', false);

  // Establecer anotación de error
  const annotations = session.getAnnotations();
  annotations.push({
    row: lineNumber,
    type: 'error',
    text: 'Error en la especificación OpenAPI',
  });
  session.setAnnotations(annotations);
} // Variables para el autoguardado
let auto; // Elementos del DOM
const editorElement = document.getElementById('editor');
const swaggerUIElement = document.getElementById('swagger-ui');
const statusElement = document.getElementById('status');
const currentFileElement = document.getElementById('currentFile');
const btnNew = document.getElementById('btnNew');
const btnValidate = document.getElementById('btnValidate');
const btnToJSON = document.getElementById('btnToJSON');
const btnToYAML = document.getElementById('btnToYAML');
const btnExport = document.getElementById('btnExport');
const btnFavorite = document.getElementById('btnFavorite');

// Inicializar el editor ACE
const editor = ace.edit(editorElement);
editor.setTheme('ace/theme/monokai');
editor.session.setMode('ace/mode/yaml');
editor.setShowPrintMargin(false);
editor.setOptions({
  enableBasicAutocompletion: true,
  enableLiveAutocompletion: true,
  enableSnippets: true,
});

// Plantilla OpenAPI básica
const defaultOpenAPI = `openapi: 3.0.0
info:
  title: Mi API
  description: Descripción de mi API
  version: 1.0.0
servers:
  - url: http://api.example.com/v1
    description: Servidor de producción
paths:
  /ejemplo:
    get:
      summary: Endpoint de ejemplo
      responses:
        '200':
          description: Operación exitosa
          content:
            application/json:
              schema:
                type: object
                properties:
                  mensaje:
                    type: string
`;

// Inicializar el editor con la plantilla
editor.setValue(defaultOpenAPI, -1);

// Variable para controlar el tiempo de actualización
let updateTimeout = null;

// Variables para el autoguardado
let autoSaveInterval = null;
let autoSaveEnabled = true;
let autoSaveDelay = 600000; // 10 minutos (600,000 ms)

// Variable para la validación en tiempo real
let liveValidationTimeout = null;
let liveValidationEnabled = true;
let liveValidationDelay = 2000; // 2 segundos

// Variable para almacenar el puerto del proxy
let proxyPort = 9000;
let proxyAddresses = ['localhost'];

// Escuchar al evento del puerto del proxy
window.electronAPI.onProxyPort(port => {
  proxyPort = port;
  console.log(`Servidor proxy disponible en puerto ${port}`);
  // Actualizar la previsualización con el nuevo puerto
  updatePreview();
});

// Escuchar al evento con información completa del proxy
window.electronAPI.onProxyInfo(info => {
  proxyPort = info.port;
  proxyAddresses = info.addresses || ['localhost'];
  console.log(`Servidor proxy disponible en puerto ${proxyPort}`);
  console.log(`Direcciones disponibles: ${proxyAddresses.join(', ')}`);
  // Actualizar la previsualización con el nuevo puerto
  updatePreview();
});

// Función para enrutar peticiones a través del proxy
function routeThroughProxy(url) {
  // Usar la primera dirección disponible (generalmente localhost)
  const proxyAddress = proxyAddresses[0];
  return `http://${proxyAddress}:${proxyPort}/proxy?url=${encodeURIComponent(url)}`;
}

// Inicializar Swagger UI
let swaggerUI;
// Función para inicializar o actualizar Swagger UI
function initSwaggerUI(spec) {
  swaggerUI = SwaggerUIBundle({
    dom_id: '#swagger-ui',
    layout: 'BaseLayout',
    presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
    spec: spec,
    docExpansion: 'list',
    deepLinking: true,
    maxDisplayedTags: null,
    filter: false,
    supportedSubmitMethods: ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'],
    requestInterceptor: req => {
      // Redirigir todas las peticiones a través del proxy
      if (req.url && (req.url.startsWith('http://') || req.url.startsWith('https://'))) {
        console.log(`Interceptando petición a: ${req.url}`);
        req.url = routeThroughProxy(req.url);
      }
      return req;
    },
    responseInterceptor: res => {
      console.log('Respuesta de API:', res.status);
      return res;
    },
    onComplete: () => {
      console.log('Swagger UI inicializado correctamente');
    },
  });
  return swaggerUI;
}

// Función para actualizar la previsualización
function updatePreview() {
  try {
    const content = editor.getValue();
    const contentType = detectContentType(content);

    let spec;
    if (contentType === 'yaml') {
      spec = jsyaml.load(content);
    } else {
      spec = JSON.parse(content);
    }

    // Modificar los servers para usar el proxy si es necesario
    if (spec.servers && Array.isArray(spec.servers)) {
      spec.servers = spec.servers.map(server => {
        return { ...server };
      });
    }

    // Inicializar o actualizar Swagger UI
    if (!swaggerUI) {
      swaggerUI = initSwaggerUI(spec);
    } else {
      swaggerUI.specActions.updateSpec(JSON.stringify(spec));
    }

    setStatus('Previsualización actualizada');
  } catch (error) {
    setStatus(`Error: ${error.message}`, true);
  }
}

// Detectar si el contenido es JSON o YAML
function detectContentType(content) {
  try {
    // Si se puede parsear como JSON, es JSON
    JSON.parse(content);
    return 'json';
  } catch (e) {
    // Si no, asumimos que es YAML
    return 'yaml';
  }
}

// Función para establecer el modo del editor
function setEditorMode(mode) {
  if (mode === 'json') {
    editor.session.setMode('ace/mode/json');
  } else {
    editor.session.setMode('ace/mode/yaml');
  }
}

// Función para validar la especificación OpenAPI
function validateOpenAPI() {
  try {
    const content = editor.getValue();
    const contentType = detectContentType(content);

    let spec;
    if (contentType === 'yaml') {
      spec = jsyaml.load(content);
    } else {
      spec = JSON.parse(content);
    }

    // Verificar que SwaggerParser esté disponible
    if (typeof window.SwaggerParser === 'undefined') {
      console.error('SwaggerParser no está definido');
      setStatus(
        'Error: SwaggerParser no está disponible. Verifica que swagger-parser esté instalado correctamente',
        true
      );
      return;
    }

    // Usar SwaggerParser para validar
    window.SwaggerParser.validate(spec)
      .then(() => {
        setStatus('La especificación OpenAPI es válida');
      })
      .catch(err => {
        setStatus(`Error de validación: ${err.message}`, true);
        window.electronAPI.reportValidationError(err.message);
      });
  } catch (error) {
    setStatus(`Error de validación: ${error.message}`, true);
    window.electronAPI.reportValidationError(error.message);
  }
}

// Convertir de YAML a JSON
function convertToJSON() {
  try {
    const content = editor.getValue();
    const contentType = detectContentType(content);

    if (contentType === 'yaml') {
      const spec = jsyaml.load(content);
      const jsonString = JSON.stringify(spec, null, 2);
      editor.setValue(jsonString, -1);
      setEditorMode('json');
      setStatus('Convertido a JSON');
    } else {
      setStatus('El contenido ya está en formato JSON');
    }
  } catch (error) {
    setStatus(`Error en la conversión: ${error.message}`, true);
  }
}

// Convertir de JSON a YAML
function convertToYAML() {
  try {
    const content = editor.getValue();
    const contentType = detectContentType(content);

    if (contentType === 'json') {
      const spec = JSON.parse(content);
      const yamlString = jsyaml.dump(spec);
      editor.setValue(yamlString, -1);
      setEditorMode('yaml');
      setStatus('Convertido a YAML');
    } else {
      setStatus('El contenido ya está en formato YAML');
    }
  } catch (error) {
    setStatus(`Error en la conversión: ${error.message}`, true);
  }
}

// Función para el autoguardado
function setupAutoSave() {
  // Limpiar el intervalo existente si hay uno
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval);
  }

  if (autoSaveEnabled) {
    autoSaveInterval = setInterval(() => {
      // Solo guardar si hay un archivo abierto o guardado previamente
      if (currentFileElement.textContent !== 'Nuevo documento') {
        const filePath = currentFileElement.textContent;
        const content = editor.getValue();
        window.electronAPI.saveFileContent(filePath, content);
        setStatus(`Autoguardado: ${filePath}`, false, true);
      } else {
        // Guardar en un archivo temporal si es un documento nuevo
        window.electronAPI.autoSaveTemp(editor.getValue());
      }
    }, autoSaveDelay);
  }
}

// Función para establecer el estado
function setStatus(message, isError = false, isAutoSave = false) {
  statusElement.textContent = message;
  if (isError) {
    statusElement.style.color = 'red';
  } else if (isAutoSave) {
    statusElement.style.color = 'green';
    // Restablecer el color después de un tiempo
    setTimeout(() => {
      statusElement.style.color = '';
    }, 2000);
  } else {
    statusElement.style.color = '';
  }
}

// Eventos del editor
editor.session.on('change', function () {
  // Debounce para no actualizar constantemente la vista previa
  clearTimeout(updateTimeout);
  updateTimeout = setTimeout(updatePreview, 500);

  // Debounce para validación en tiempo real
  if (liveValidationEnabled) {
    clearTimeout(liveValidationTimeout);
    liveValidationTimeout = setTimeout(performLiveValidation, liveValidationDelay);
  }
});

// Función para crear un nuevo documento
function createNewDocument() {
  editor.setValue(defaultOpenAPI, -1);
  setEditorMode('yaml');
  currentFileElement.textContent = 'Nuevo documento';
  setStatus('Nuevo documento creado');
  updatePreview();
}

// Función para exportar la documentación
function exportSwagger() {
  try {
    const content = editor.getValue();
    const contentType = detectContentType(content);

    let spec;
    if (contentType === 'yaml') {
      spec = jsyaml.load(content);
    } else {
      spec = JSON.parse(content);
    }

    // Crear opciones para el diálogo de guardado
    const options = {
      filters: [
        { name: 'HTML', extensions: ['html'] },
        { name: 'JSON', extensions: ['json'] },
        { name: 'YAML', extensions: ['yaml', 'yml'] },
      ],
    };

    // Enviar evento a main para mostrar diálogo de guardado
    window.electronAPI.exportSwagger(options);
  } catch (error) {
    setStatus(`Error al exportar: ${error.message}`, true);
  }
}

// Eventos de botones
btnNew.addEventListener('click', createNewDocument);
btnValidate.addEventListener('click', validateOpenAPI);
btnToJSON.addEventListener('click', convertToJSON);
btnToYAML.addEventListener('click', convertToYAML);
btnExport.addEventListener('click', exportSwagger);
btnFavorite.addEventListener('click', () => {
  window.electronAPI.toggleFavorite();
});

// Escuchar el evento de autoguardado temporal encontrado
window.electronAPI.onTempSaveFound(data => {
  if (data && data.content) {
    // Preguntar al usuario si quiere recuperar el autoguardado
    const timestamp = new Date(data.timestamp).toLocaleString();
    const recover = confirm(`Se encontró un autoguardado del ${timestamp}. ¿Desea recuperarlo?`);

    if (recover) {
      editor.setValue(data.content, -1);
      const contentType = detectContentType(data.content);
      setEditorMode(contentType);
      updatePreview();
      setStatus('Autoguardado recuperado');
    }
  }
});

// Integración con Electron API
window.electronAPI.newFile(() => {
  createNewDocument();
});

window.electronAPI.onFileOpened(data => {
  editor.setValue(data.content, -1);

  // Detectar y establecer el modo del editor
  const contentType = detectContentType(data.content);
  setEditorMode(contentType);

  // Actualizar la información del archivo
  currentFileElement.textContent = data.filePath;
  setStatus(`Archivo abierto: ${data.filePath}`);

  // Actualizar la previsualización
  updatePreview();
});

window.electronAPI.saveFile(filePath => {
  const content = editor.getValue();
  window.electronAPI.saveFileContent(filePath, content);
});

window.electronAPI.onFileSaved(filePath => {
  currentFileElement.textContent = filePath;
  setStatus(`Archivo guardado: ${filePath}`);
});

// Recibir estado de favorito
window.electronAPI.onFavoriteStatus(isFavorite => {
  if (isFavorite) {
    btnFavorite.classList.add('active');
    btnFavorite.title = 'Quitar de favoritos';
  } else {
    btnFavorite.classList.remove('active');
    btnFavorite.title = 'Añadir a favoritos';
  }
});

window.electronAPI.onExportPath(filePath => {
  try {
    const content = editor.getValue();
    const contentType = detectContentType(content);
    let exportContent = '';
    const fileExt = filePath.split('.').pop().toLowerCase();

    // Obtener la especificación como objeto
    let spec;
    if (contentType === 'yaml') {
      spec = jsyaml.load(content);
    } else {
      spec = JSON.parse(content);
    }

    // Generar el contenido según el tipo de archivo
    if (fileExt === 'html') {
      // Crear HTML con Swagger UI embebido
      exportContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Documentación API</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.10.0/swagger-ui.min.css" />
  <style>
    body { margin: 0; padding: 0; }
    #swagger-ui { max-width: 1200px; margin: 0 auto; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.10.0/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        spec: ${JSON.stringify(spec)},
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout"
      });
    }
  </script>
</body>
</html>`;
    } else if (fileExt === 'json') {
      exportContent = JSON.stringify(spec, null, 2);
    } else if (fileExt === 'yaml' || fileExt === 'yml') {
      exportContent = jsyaml.dump(spec);
    }

    // Guardar el contenido en el archivo
    window.electronAPI.saveFileContent(filePath, exportContent);
    setStatus(`Exportado a: ${filePath}`);
  } catch (error) {
    setStatus(`Error al exportar: ${error.message}`, true);
  }
});

window.electronAPI.validateOpenAPI(() => {
  validateOpenAPI();
});

window.electronAPI.convertToYAML(() => {
  convertToYAML();
});

window.electronAPI.convertToJSON(() => {
  convertToJSON();
});

// Manejador para ajustar tamaños cuando cambia la ventana
window.addEventListener('resize', function () {
  // Dar tiempo a la UI para actualizarse
  setTimeout(function () {
    // Forzar un reflow del contenedor de Swagger
    const previewContainer = document.querySelector('.preview-container');
    if (previewContainer) {
      previewContainer.style.display = 'none';
      previewContainer.offsetHeight; // Forzar un reflow
      previewContainer.style.display = '';
    }
  }, 100);
});

// Iniciar el autoguardado
setupAutoSave();

// Actualizar la previsualización al iniciar
updatePreview();
