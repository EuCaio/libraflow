#!/bin/sh
set -e
echo "Iniciando report-service..."
exec node dist/main.js
