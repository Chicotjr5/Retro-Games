#!/usr/bin/env bash
# Resume the OpenCode session for the 2048 project.
# Usage: ./resume-session.sh
cd /opt/proyectos/web

# Continue the LAST session (simplest — no ID needed):
opencode -c

# If you know the exact session ID, uncomment and replace:
#   opencode -s ses_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
