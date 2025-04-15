const fs = require('fs');
const path = require('path');

// Ruta potencial donde tree-sitter podría estar instalado
const treeSitterPath = path.join(__dirname, 'node_modules', 'tree-sitter');

// Comprobar si existe y eliminar
if (fs.existsSync(treeSitterPath)) {
  console.log('Eliminando tree-sitter no deseado...');
  fs.rmSync(treeSitterPath, { recursive: true, force: true });
  console.log('tree-sitter eliminado con éxito');
}

console.log('Postinstall completado');
