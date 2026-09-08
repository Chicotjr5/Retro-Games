#!/usr/bin/env bash
# Resume / start the arcade server (detached, survives the shell session).
# Usage: ./start.sh
cd /opt/proyectos/web || exit 1
setsid nohup node server.js > /tmp/arcade.log 2>&1 < /dev/null &
sleep 1.5
echo "Arcade server started."
echo "  Hub        : http://localhost:3000"
echo "  Connect 4  : http://localhost:3000/connect-4/"
echo "  Tailscale  : http://100.71.206.48:3000"
echo "  Funnel (any net): https://equipo10.tail7a2703.ts.net:10000"
echo "  Logs       : /tmp/arcade.log"