# 🕹️ Retro Games

Una pequeña colección de juegos retro para el navegador, con estética arcade pixelada (fuentes *Press Start 2P* y *VT323*). Todo funciona con HTML, CSS y JavaScript puro, **sin dependencias externas**.

## Juegos

| Juego | Ruta | Descripción |
|-------|------|-------------|
| **Connect 4** | [`/connect-4/`](connect-4/) | Conecta 4 fichas en línea (horizontal, vertical o diagonal). Incluye modo **local** (2 jugadores en el mismo dispositivo) y modo **online** con salas. |
| **2048** | [`/2048/`](2048/) | Desliza y fusiona fichas numéricas hasta llegar a 2048. Modos **Normal** y **Baby**, con puntuación actual y récord. |
| **Snake** | [`/snake/`](snake/) | El clásico juego de la serpiente: come, crece y no te muerdas. Puntuación, récord y pausa. |

## Requisitos

- [Node.js](https://nodejs.org/) (cualquier versión reciente)

No se necesita `npm install`: el servidor usa únicamente módulos nativos de Node (`http`, `fs`, `path`, `url`).

## Cómo ejecutar

```bash
node server.js
```

Abre en tu navegador: **http://localhost:3000**

Puedes cambiar el puerto con la variable de entorno `PORT`:

```bash
PORT=8080 node server.js
```

## Estructura del proyecto

```
.
├── index.html          # Página principal (hub de juegos)
├── server.js           # Servidor único: estáticos + API multijugador
├── css/                # Estilos del hub
├── lib/
│   └── rooms.js        # Motor compartido de salas (long-polling)
├── connect-4/          # Connect 4 (local + online)
│   ├── index.html
│   ├── css/  js/       # board.js, local.js, multiplayer.js, ui.js
│   └── server.js       # Reglas del juego y controlador de API
├── 2048/               # 2048 (un jugador)
└── snake/              # Snake (un jugador)
```

## Multijugador (Connect 4)

El servidor expone una API por juego bajo `/<juego>/api/*`, basada en **long-polling** (sin WebSockets ni dependencias):

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/connect-4/api/create` | Crea una sala (con opción de sala privada). Devuelve código de 6 caracteres. |
| `GET`  | `/connect-4/api/rooms` | Lista las salas públicas abiertas (lobby). |
| `POST` | `/connect-4/api/join` | Se une a una sala mediante su código. |
| `POST` | `/connect-4/api/move` | Envía un movimiento (columna). |
| `GET`  | `/connect-4/api/state` | Consulta el estado; la petición se mantiene abierta hasta que hay cambios (máx. 20 s). |

Las reglas del juego se validan en el servidor (copia espejo de `js/board.js`), por lo que los movimientos ilegales se rechazan.

## Cómo añadir un nuevo juego

1. Crea una carpeta con el juego (HTML/CSS/JS).
2. Regístralo en `server.js`:
   - Solo estático: `registerStaticGame("mi-juego", path.join(__dirname, "mi-juego"))`
   - Con multijugador: exporta un módulo con `{ name, root, createController() }` usando `lib/rooms.js` (mira `connect-4/server.js` como ejemplo).
3. Añade una tarjeta al hub en `index.html`.

## Probar juegos

Para poder probar los juegos, he desarrollado la siguiente página: https://marchm.net/retro-games/

## Licencia

Este proyecto está bajo la licencia **GNU GPLv3** (ver [LICENSE](LICENSE)). Puedes usarlo, modificarlo y distribuirlo libremente, siempre que las versiones modificadas se publiquen también bajo la misma licencia (código abierto y gratuito).
