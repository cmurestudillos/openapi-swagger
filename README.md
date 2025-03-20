# Swagger Editor Electron

Una aplicación de escritorio para editar, visualizar y validar especificaciones OpenAPI/Swagger.

![Swagger Editor Electron](https://via.placeholder.com/800x450?text=Swagger+Editor+Electron)

## Características

- **Editor con resaltado de sintaxis** para YAML y JSON
- **Previsualización en tiempo real** utilizando Swagger UI
- **Validación de especificaciones OpenAPI** instantánea y en tiempo real
- **Conversión entre formatos** (YAML ↔ JSON)
- **Proxy CORS integrado** para probar endpoints directamente desde la interfaz
- **Sistema de favoritos** para acceso rápido a tus APIs frecuentes
- **Historial de archivos recientes** para retomar tu trabajo fácilmente
- **Autoguardado** para evitar pérdida de datos
- **Diseño de interfaz dividida** con editor y previsualización lado a lado
- **Exportación de documentación** en diferentes formatos (HTML, JSON, YAML)

## Instalación

### Requisitos previos

- [Node.js](https://nodejs.org/) (v14 o superior)
- [npm](https://www.npmjs.com/) (suele venir con Node.js)

### Pasos de instalación

1. Clona el repositorio:
   ```
   git clone https://github.com/tuusuario/swagger-electron-editor.git
   cd swagger-electron-editor
   ```

2. Instala las dependencias:
   ```
   npm install
   ```

3. Inicia la aplicación:
   ```
   npm start
   ```

## Uso

### Creación y edición

- **Nuevo documento**: Crea una nueva especificación OpenAPI en blanco
- **Abrir archivo**: Abre una especificación existente (JSON o YAML)
- **Guardar/Guardar como**: Guarda tu trabajo en el sistema de archivos

### Validación

- **Validación en tiempo real**: Muestra errores mientras escribes
- **Validación manual**: Verifica toda la especificación con un clic
- **Resaltado de errores**: Localiza fácilmente problemas en el editor

### Visualización y pruebas

- **Previsualización interactiva**: Interfaz Swagger UI completa
- **Prueba de endpoints**: Realiza peticiones directamente desde la aplicación
- **Generación de documentación**: Exporta documentación lista para publicar

### Productividad

- **Favoritos**: Marca tus APIs más utilizadas para acceso rápido
- **Historial reciente**: Accede a tus últimos archivos editados
- **Autoguardado**: Protección contra pérdida de datos (cada 10 minutos)

## Personalización

Puedes personalizar diversos aspectos de la aplicación:

- **Intervalo de autoguardado**: Modifica `autoSaveDelay` en `renderer.js`
- **Plantilla por defecto**: Edita `defaultOpenAPI` en `renderer.js`
- **Temas del editor**: Modifica `editor.setTheme` en `renderer.js`

## Contribución

Las contribuciones son bienvenidas. Por favor, sigue estos pasos:

1. Fork el repositorio
2. Crea una rama para tu característica (`git checkout -b feature/amazing-feature`)
3. Haz commit de tus cambios (`git commit -m 'Add some amazing feature'`)
4. Push a la rama (`git push origin feature/amazing-feature`)
5. Abre un Pull Request

## Tecnologías utilizadas

- [Electron](https://www.electronjs.org/) - Framework para aplicaciones de escritorio
- [Ace Editor](https://ace.c9.io/) - Editor de código para la web
- [Swagger UI](https://swagger.io/tools/swagger-ui/) - Interfaz para visualizar APIs
- [js-yaml](https://github.com/nodeca/js-yaml) - Conversión YAML ↔ JSON
- [Express](https://expressjs.com/) - Servidor para el proxy CORS

## Licencia

Este proyecto está licenciado bajo la licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## Contacto

Tu Nombre - [@tuusuario](https://twitter.com/tuusuario) - email@ejemplo.com

URL del Proyecto: [https://github.com/tuusuario/swagger-electron-editor](https://github.com/tuusuario/swagger-electron-editor)