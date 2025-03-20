const { contextBridge, ipcRenderer } = require('electron');

// Exponer funciones protegidas a la página de renderizado
contextBridge.exposeInMainWorld('electronAPI', {
  // Funciones de archivo
  newFile: callback => ipcRenderer.on('new-file', () => callback()),
  onFileOpened: callback => ipcRenderer.on('file-opened', (_, data) => callback(data)),
  saveFile: callback => ipcRenderer.on('save-file', (_, filePath) => callback(filePath)),
  saveFileContent: (filePath, content) => ipcRenderer.send('save-file-content', { filePath, content }),
  onFileSaved: callback => ipcRenderer.on('file-saved', (_, filePath) => callback(filePath)),

  // Funciones de OpenAPI
  validateOpenAPI: callback => ipcRenderer.on('validate-openapi', () => callback()),
  convertToYAML: callback => ipcRenderer.on('convert-to-yaml', () => callback()),
  convertToJSON: callback => ipcRenderer.on('convert-to-json', () => callback()),

  // Funciones de validación
  reportValidationError: errorMessage => ipcRenderer.send('validation-error', errorMessage),

  // Función para exportar Swagger
  exportSwagger: options => ipcRenderer.send('export-swagger', options),
  onExportPath: callback => ipcRenderer.on('export-path', (_, filePath) => callback(filePath)),

  // Proxy CORS
  onProxyPort: callback => ipcRenderer.on('proxy-port', (_, port) => callback(port)),
  onProxyInfo: callback => ipcRenderer.on('proxy-info', (_, info) => callback(info)),

  // Autoguardado
  autoSaveTemp: content => ipcRenderer.send('auto-save-temp', content),
  onTempSaveFound: callback => ipcRenderer.on('temp-save-found', (_, data) => callback(data)),

  // Favoritos
  onFavoriteStatus: callback => ipcRenderer.on('favorite-status', (_, status) => callback(status)),
  toggleFavorite: () => ipcRenderer.send('toggle-favorite'),
});
