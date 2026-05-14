const { contextBridge, ipcRenderer } = require('electron');

const on = (channel, fn) => {
  ipcRenderer.removeAllListeners(channel);
  ipcRenderer.on(channel, fn);
};

contextBridge.exposeInMainWorld('electronAPI', {
  // Funciones de archivo
  newFile: callback => on('new-file', () => callback()),
  onFileOpened: callback => on('file-opened', (_, data) => callback(data)),
  saveFile: callback => on('save-file', (_, filePath) => callback(filePath)),
  saveFileContent: (filePath, content) => ipcRenderer.send('save-file-content', { filePath, content }),
  onFileSaved: callback => on('file-saved', (_, filePath) => callback(filePath)),

  // Funciones de OpenAPI
  validateOpenAPI: callback => on('validate-openapi', () => callback()),
  convertToYAML: callback => on('convert-to-yaml', () => callback()),
  convertToJSON: callback => on('convert-to-json', () => callback()),

  // Funciones de validación
  reportValidationError: errorMessage => ipcRenderer.send('validation-error', errorMessage),

  // Función para exportar Swagger
  exportSwagger: options => ipcRenderer.send('export-swagger', options),
  onExportPath: callback => on('export-path', (_, filePath) => callback(filePath)),

  // Proxy CORS
  onProxyPort: callback => on('proxy-port', (_, port) => callback(port)),
  onProxyInfo: callback => on('proxy-info', (_, info) => callback(info)),

  // Autoguardado
  autoSaveTemp: content => ipcRenderer.send('auto-save-temp', content),
  onTempSaveFound: callback => on('temp-save-found', (_, data) => callback(data)),

  // Favoritos
  onFavoriteStatus: callback => on('favorite-status', (_, status) => callback(status)),
  toggleFavorite: () => ipcRenderer.send('toggle-favorite'),
});
