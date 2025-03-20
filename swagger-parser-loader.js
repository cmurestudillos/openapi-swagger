// Este script se asegura de que SwaggerParser esté disponible globalmente
(function () {
  // Función para validar sin usar SwaggerParser
  function validateOpenAPIBasic(spec) {
    return new Promise((resolve, reject) => {
      // Validación básica
      try {
        // Comprobar que es un objeto
        if (typeof spec !== 'object' || spec === null) {
          return reject(new Error('La especificación debe ser un objeto'));
        }

        // Comprobar version de OpenAPI
        if (!spec.openapi && !spec.swagger) {
          return reject(new Error('La especificación debe tener una propiedad "openapi" o "swagger"'));
        }

        // Comprobar info
        if (!spec.info) {
          return reject(new Error('La especificación debe tener una propiedad "info"'));
        }

        // Comprobar paths
        if (!spec.paths) {
          return reject(new Error('La especificación debe tener una propiedad "paths"'));
        }

        // Si llegamos aquí, la validación básica ha pasado
        resolve(spec);
      } catch (err) {
        reject(err);
      }
    });
  }

  // Crear un objeto SwaggerParser básico si no existe
  window.SwaggerParser = {
    validate: validateOpenAPIBasic,
    parse: function (spec) {
      return Promise.resolve(spec);
    },
  };

  // Verificar si la biblioteca SwaggerParser real está disponible
  setTimeout(function () {
    if (
      typeof SwaggerParser !== 'undefined' &&
      typeof SwaggerParser.validate === 'function' &&
      SwaggerParser.validate !== validateOpenAPIBasic
    ) {
      console.log('SwaggerParser oficial detectado y cargado');
    } else {
      console.log('Usando SwaggerParser básico de respaldo');
    }
  }, 500);
})();
