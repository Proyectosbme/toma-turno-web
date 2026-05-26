#!/usr/bin/env bash
# Genera tomaturno-theme-prod.zip con la URL de registro de producción.
# Uso: ./keycloak-theme/deploy-prod.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../../tomaturno-api/.env.prod"
THEME_SRC="$SCRIPT_DIR/tomaturno"
OUT_ZIP="$SCRIPT_DIR/tomaturno-theme-prod.zip"
TMP_DIR="$(mktemp -d)"

# Leer KC_APP_URL del .env.prod
if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: No se encontró $ENV_FILE"; exit 1
fi
KC_APP_URL=$(grep -E '^KC_APP_URL=' "$ENV_FILE" | cut -d'=' -f2- | tr -d '\r')
if [[ -z "$KC_APP_URL" ]]; then
  echo "ERROR: Falta KC_APP_URL en .env.prod"; exit 1
fi

# Copiar tema y sobreescribir theme.properties con URL de producción
cp -r "$THEME_SRC" "$TMP_DIR/tomaturno"
cat > "$TMP_DIR/tomaturno/login/theme.properties" <<EOF
parent=keycloak
import=common/keycloak
styles=css/login.css

registroUrl=${KC_APP_URL}/auth/registro
EOF

# Empaquetar
rm -f "$OUT_ZIP"
(cd "$TMP_DIR" && zip -r "$OUT_ZIP" tomaturno) > /dev/null
rm -rf "$TMP_DIR"

echo "ZIP listo: $OUT_ZIP"
echo "Súbelo al servidor y extráelo en /opt/keycloak/themes/"
