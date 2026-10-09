const express = require('express');
const http = require('http');
const https = require('https');
const crypto = require('crypto');

// Token aleatorio por sesión: solo el renderer de la app lo conoce, así ninguna otra
// página o programa del equipo puede usar el proxy
const token = crypto.randomBytes(24).toString('hex');

// Crear servidor Express
const app = express();

// Configuración CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');

  // Manejar preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
});

// Middleware para registrar solicitudes
app.use((req, res, next) => {
  console.log(`Proxy: ${req.method} ${req.url}`);
  next();
});

// Ruta base para el proxy
app.use('/proxy', (req, res) => {
  // Extraer la URL objetivo del parámetro de consulta 'url'
  if (req.query.token !== token) {
    return res.status(403).send('Token de proxy no válido');
  }

  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).send('Parámetro URL requerido');
  }

  try {
    // Crear una nueva URL para validar y extraer el origen
    const parsedUrl = new URL(targetUrl);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: req.method,
      headers: {
        ...req.headers,
        host: parsedUrl.host,
        origin: parsedUrl.origin,
      },
    };

    // Eliminar headers problemáticos
    delete options.headers['host'];
    delete options.headers['connection'];

    // Elegir el protocolo adecuado
    const httpClient = parsedUrl.protocol === 'https:' ? https : http;

    // Hacer la petición al servidor de destino
    const proxyReq = httpClient.request(options, proxyRes => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);

      // Pasar la respuesta directamente
      proxyRes.pipe(res);
    });

    // Manejar errores en la petición
    proxyReq.on('error', error => {
      console.error('Error en la petición proxy:', error);
      if (!res.headersSent) {
        res.status(500).send(`Error en la conexión: ${error.message}`);
      }
    });

    // Si hay body en la petición original, enviarlo
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      req.pipe(proxyReq);
    } else {
      proxyReq.end();
    }
  } catch (error) {
    console.error('URL inválida:', error);
    res.status(400).send(`URL inválida: ${error.message}`);
  }
});

// Manejo de errores global
// Express identifica el manejador de errores por sus 4 parámetros
app.use((err, req, res, _next) => {
  console.error('Error en el servidor proxy:', err);
  res.status(500).send('Error interno del servidor proxy');
});

// Solo se escucha en loopback: el proxy no es accesible desde otros equipos de la red
const HOST = '127.0.0.1';

// Función para iniciar el servidor
function startProxyServer(port = 9000) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, HOST, () => {
      console.log(`Servidor proxy CORS iniciado en http://${HOST}:${port}`);
      resolve({ server, port, token, addresses: [HOST] });
    });

    server.on('error', error => {
      if (error.code === 'EADDRINUSE') {
        console.log(`Puerto ${port} en uso, intentando con el siguiente puerto...`);
        startProxyServer(port + 1)
          .then(resolve)
          .catch(reject);
      } else {
        reject(error);
      }
    });
  });
}

module.exports = { startProxyServer };
