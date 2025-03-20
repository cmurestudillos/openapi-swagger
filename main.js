const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
// Usamos el servidor proxy alternativo que no depende de http-proxy-middleware
const { startProxyServer } = require('./proxy-server');

// Variable para almacenar la ventana principal
let mainWindow;

// Ruta del archivo actualmente abierto
let currentFilePath = null;

// Puerto del servidor proxy
let proxyPort = 9000;

// Historial de archivos recientes (máximo 10)
let recentFiles = [];
const MAX_RECENT_FILES = 10;

// Lista de archivos favoritos
let favoriteFiles = [];

// Directorio de datos de la aplicación para configuraciones
const appDataPath = app.getPath('userData');
const configPath = path.join(appDataPath, 'config.json');
const tempSavePath = path.join(appDataPath, 'temp-autosave.json');

// Cargar configuración
function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.recentFiles && Array.isArray(config.recentFiles)) {
        recentFiles = config.recentFiles.filter(file => fs.existsSync(file));
      }
      if (config.favoriteFiles && Array.isArray(config.favoriteFiles)) {
        favoriteFiles = config.favoriteFiles.filter(file => fs.existsSync(file));
      }
      return config;
    }
  } catch (error) {
    console.error('Error al cargar la configuración:', error);
  }
  return { recentFiles: [], favoriteFiles: [] };
}

// Guardar configuración
function saveConfig() {
  try {
    const config = {
      recentFiles: recentFiles,
      favoriteFiles: favoriteFiles,
    };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('Error al guardar la configuración:', error);
  }
}

// Añadir un archivo al historial de recientes
function addRecentFile(filePath) {
  // Eliminar el archivo de la lista si ya existe
  recentFiles = recentFiles.filter(file => file !== filePath);

  // Añadir el archivo al principio de la lista
  recentFiles.unshift(filePath);

  // Limitar la lista al máximo de archivos
  if (recentFiles.length > MAX_RECENT_FILES) {
    recentFiles = recentFiles.slice(0, MAX_RECENT_FILES);
  }

  // Guardar la configuración actualizada
  saveConfig();

  // Actualizar el menú
  updateRecentFilesMenu();
}

// Añadir un archivo a favoritos
function addToFavorites(filePath) {
  // Verificar si el archivo ya está en favoritos
  if (!favoriteFiles.includes(filePath)) {
    favoriteFiles.push(filePath);
    saveConfig();
    updateRecentFilesMenu();
    return true;
  }
  return false;
}

// Eliminar un archivo de favoritos
function removeFromFavorites(filePath) {
  const index = favoriteFiles.indexOf(filePath);
  if (index !== -1) {
    favoriteFiles.splice(index, 1);
    saveConfig();
    updateRecentFilesMenu();
    return true;
  }
  return false;
}

// Verificar si un archivo está en favoritos
function isInFavorites(filePath) {
  return favoriteFiles.includes(filePath);
}

// Actualizar el menú de archivos recientes
function updateRecentFilesMenu() {
  if (!mainWindow) return;

  const template = buildMenuTemplate();
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Construir la plantilla del menú
function buildMenuTemplate() {
  // Construir el submenú de archivos recientes
  const recentFilesSubmenu = recentFiles.map((file, index) => {
    return {
      label: `${index + 1}: ${path.basename(file)}`,
      click: () => openSpecificFile(file),
    };
  });

  // Si no hay archivos recientes, añadir un elemento deshabilitado
  if (recentFilesSubmenu.length === 0) {
    recentFilesSubmenu.push({
      label: '(No hay archivos recientes)',
      enabled: false,
    });
  } else {
    // Añadir un separador y una opción para limpiar
    recentFilesSubmenu.push(
      { type: 'separator' },
      {
        label: 'Limpiar archivos recientes',
        click: () => {
          recentFiles = [];
          saveConfig();
          updateRecentFilesMenu();
        },
      }
    );
  }

  // Construir el submenú de favoritos
  const favoritesSubmenu = favoriteFiles.map(file => {
    return {
      label: path.basename(file),
      click: () => openSpecificFile(file),
    };
  });

  // Si no hay favoritos, añadir un elemento deshabilitado
  if (favoritesSubmenu.length === 0) {
    favoritesSubmenu.push({
      label: '(No hay favoritos)',
      enabled: false,
    });
  }

  return [
    {
      label: 'Archivo',
      submenu: [
        {
          label: 'Nuevo',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('new-file');
            currentFilePath = null;
          },
        },
        {
          label: 'Abrir',
          accelerator: 'CmdOrCtrl+O',
          click: () => openFile(),
        },
        {
          label: 'Archivos recientes',
          submenu: recentFilesSubmenu,
        },
        {
          label: 'Favoritos',
          submenu: favoritesSubmenu,
        },
        { type: 'separator' },
        {
          label: 'Guardar',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            if (currentFilePath) {
              mainWindow.webContents.send('save-file', currentFilePath);
            } else {
              saveFileAs();
            }
          },
        },
        {
          label: 'Guardar como',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => saveFileAs(),
        },
        { type: 'separator' },
        {
          label: 'Salir',
          accelerator: 'CmdOrCtrl+Q',
          click: () => app.quit(),
        },
      ],
    },
    {
      label: 'Editar',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
      ],
    },
    {
      label: 'Vista',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'OpenAPI',
      submenu: [
        {
          label: 'Validar',
          click: () => {
            mainWindow.webContents.send('validate-openapi');
          },
        },
        {
          label: 'Convertir JSON a YAML',
          click: () => {
            mainWindow.webContents.send('convert-to-yaml');
          },
        },
        {
          label: 'Convertir YAML a JSON',
          click: () => {
            mainWindow.webContents.send('convert-to-json');
          },
        },
      ],
    },
    {
      label: 'Favoritos',
      submenu: [
        {
          label: currentFilePath
            ? isInFavorites(currentFilePath)
              ? 'Quitar de favoritos'
              : 'Añadir a favoritos'
            : 'Añadir a favoritos',
          enabled: currentFilePath !== null,
          click: () => {
            if (currentFilePath) {
              if (isInFavorites(currentFilePath)) {
                removeFromFavorites(currentFilePath);
                mainWindow.webContents.send('favorite-status', false);
              } else {
                addToFavorites(currentFilePath);
                mainWindow.webContents.send('favorite-status', true);
              }
            }
          },
        },
      ],
    },
  ];
}

function createWindow() {
  // Crear la ventana del navegador
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false, // Deshabilitar la seguridad web para permitir peticiones CORS
    },
  });

  // Permitir CORS
  mainWindow.webContents.session.webRequest.onBeforeSendHeaders((details, callback) => {
    callback({
      requestHeaders: {
        ...details.requestHeaders,
        Origin: '*',
      },
    });
  });

  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Access-Control-Allow-Origin': ['*'],
        'Access-Control-Allow-Methods': ['GET, POST, PUT, DELETE, OPTIONS'],
        'Access-Control-Allow-Headers': ['Content-Type, Authorization'],
      },
    });
  });

  // Cargar el archivo HTML principal
  mainWindow.loadFile('index.html');

  // Configurar el menú de la aplicación
  const template = buildMenuTemplate();
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Función para abrir un archivo específico
function openSpecificFile(filePath) {
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      dialog.showErrorBox('Error al abrir el archivo', err.message);
      return;
    }
    currentFilePath = filePath;
    mainWindow.webContents.send('file-opened', { filePath, content: data });
    // Notificar al renderer si está en favoritos
    mainWindow.webContents.send('favorite-status', isInFavorites(filePath));
    addRecentFile(filePath);
  });
}

// Función para abrir un archivo
function openFile() {
  dialog
    .showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'OpenAPI Files', extensions: ['json', 'yaml', 'yml'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    })
    .then(result => {
      if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        openSpecificFile(filePath);
      }
    })
    .catch(err => {
      dialog.showErrorBox('Error al abrir el archivo', err.message);
    });
}

// Función para guardar un archivo con diálogo "Guardar como"
function saveFileAs() {
  dialog
    .showSaveDialog(mainWindow, {
      filters: [
        { name: 'JSON', extensions: ['json'] },
        { name: 'YAML', extensions: ['yaml', 'yml'] },
      ],
    })
    .then(result => {
      if (!result.canceled) {
        currentFilePath = result.filePath;
        mainWindow.webContents.send('save-file', result.filePath);
        addRecentFile(result.filePath);
      }
    })
    .catch(err => {
      dialog.showErrorBox('Error al guardar el archivo', err.message);
    });
}

// Manejar el evento de guardar archivo desde el renderer
ipcMain.on('save-file-content', (event, { filePath, content }) => {
  fs.writeFile(filePath, content, err => {
    if (err) {
      dialog.showErrorBox('Error al guardar el archivo', err.message);
      return;
    }
    // Añadir a archivos recientes
    addRecentFile(filePath);
    // Mostrar una notificación de que se guardó correctamente
    mainWindow.webContents.send('file-saved', filePath);
  });
});

// Manejar el evento de mostrar errores en la validación
ipcMain.on('validation-error', (event, errorMessage) => {
  dialog.showErrorBox('Error de validación', errorMessage);
});

// Manejar el evento de exportar Swagger
ipcMain.on('export-swagger', (event, options) => {
  dialog
    .showSaveDialog(mainWindow, options)
    .then(result => {
      if (!result.canceled) {
        mainWindow.webContents.send('export-path', result.filePath);
      }
    })
    .catch(err => {
      dialog.showErrorBox('Error al exportar', err.message);
    });
});

// Manejar el autoguardado temporal
ipcMain.on('auto-save-temp', (event, content) => {
  try {
    // Guardar el contenido en un archivo temporal
    fs.writeFileSync(
      tempSavePath,
      JSON.stringify({
        timestamp: new Date().toISOString(),
        content: content,
      })
    );
  } catch (error) {
    console.error('Error en autoguardado temporal:', error);
  }
});

// Manejar el toggle de favorito
ipcMain.on('toggle-favorite', event => {
  if (currentFilePath) {
    if (isInFavorites(currentFilePath)) {
      removeFromFavorites(currentFilePath);
      mainWindow.webContents.send('favorite-status', false);
    } else {
      addToFavorites(currentFilePath);
      mainWindow.webContents.send('favorite-status', true);
    }
  }
});

// Comprobar si hay un autoguardado temporal al iniciar
function checkForTempSave() {
  try {
    if (fs.existsSync(tempSavePath)) {
      const tempData = JSON.parse(fs.readFileSync(tempSavePath, 'utf8'));
      // Enviar datos al renderer
      mainWindow.webContents.send('temp-save-found', tempData);
    }
  } catch (error) {
    console.error('Error al comprobar autoguardado temporal:', error);
  }
}

// Cargar la configuración al inicio
loadConfig();

// Cuando la aplicación esté lista
app.whenReady().then(async () => {
  try {
    // Iniciar el servidor proxy
    const { port, addresses } = await startProxyServer();
    proxyPort = port;

    // Enviar el puerto del proxy al proceso de renderizado
    createWindow();

    // Verificar si hay autoguardados temporales
    mainWindow.webContents.on('did-finish-load', () => {
      // Enviar el puerto y las direcciones disponibles
      mainWindow.webContents.send('proxy-info', { port, addresses });
      checkForTempSave();
    });
  } catch (error) {
    console.error('Error al iniciar el servidor proxy:', error);
    createWindow();
  }

  app.on('activate', function () {
    // En macOS es común volver a crear una ventana cuando
    // se hace clic en el icono del dock y no hay otras ventanas abiertas.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Salir cuando todas las ventanas estén cerradas, excepto en macOS
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
