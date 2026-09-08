#!/usr/bin/env bash
# Resume the OpenCode session for this Connect 4 project.
# Usage: ./resume-session.sh
cd /opt/proyectos/web

# Continue this exact session (most reliable):
opencode -s ses_fbc4290dbffefTKzlG9RaaknDN

# Alternative: continue the LAST session instead of a specific id:
#   opencode -c
