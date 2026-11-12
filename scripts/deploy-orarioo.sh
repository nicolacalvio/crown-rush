#!/usr/bin/env bash
# Pubblica dist/ su https://orarioo.it/crown-rush/ (nginx in Docker).
# Uso, dalla radice del repo:  ./scripts/deploy-orarioo.sh utente@host
# La password SSH viene chiesta da ssh, non è salvata qui.
set -euo pipefail
TARGET="${1:?Uso: $0 utente@host}"
cd "$(dirname "$0")/.."

echo "==> Carico dist/ in /opt/crown-rush-upload"
ssh "$TARGET" 'rm -rf /opt/crown-rush-upload && mkdir -p /opt/crown-rush-upload'
scp -r dist/* "$TARGET":/opt/crown-rush-upload/

echo "==> Installo nel container nginx"
ssh "$TARGET" bash -s <<'REMOTE'
set -euo pipefail
C=$(docker ps --format '{{.Names}} {{.Image}}' | awk '/nginx/{print $1; exit}')
[ -n "$C" ] || { echo "Nessun container nginx in esecuzione"; docker ps; exit 1; }
echo "Container: $C"

# Root della location / per orarioo.it secondo la config attiva
ROOT=$(docker exec "$C" nginx -T 2>/dev/null | awk '
  /server_name/ && /orarioo\.it/ {s=1}
  s && /^[[:space:]]*root[[:space:]]/ {gsub(/;/,"",$2); print $2; exit}')
ROOT=${ROOT:-/usr/share/nginx/html}
echo "Web root nel container: $ROOT"

# Se la root è un volume, scrivo sul disco dell'host (persiste ai riavvii)
SRC=$(docker inspect "$C" --format '{{range .Mounts}}{{.Destination}}|{{.Source}}{{"\n"}}{{end}}' \
  | awk -F'|' -v r="$ROOT" 'index(r,$1)==1 && length($1)>l {l=length($1); d=$1; s=$2} END{if(s) print s substr(r,length(d)+1)}')
if [ -n "$SRC" ]; then
  echo "Volume host: $SRC/crown-rush"
  rm -rf "$SRC/crown-rush" && mkdir -p "$SRC/crown-rush"
  cp -r /opt/crown-rush-upload/. "$SRC/crown-rush/"
else
  echo "ATTENZIONE: root non montata, uso docker cp (si perde se il container viene ricreato)"
  docker exec "$C" rm -rf "$ROOT/crown-rush"
  docker cp /opt/crown-rush-upload "$C:$ROOT/crown-rush"
fi

docker exec "$C" grep -q wasm /etc/nginx/mime.types || echo "ATTENZIONE: manca application/wasm in mime.types"
docker exec "$C" nginx -t && docker exec "$C" nginx -s reload
REMOTE

echo "==> Verifica"
for f in "" game.js crown_rush.wasm; do
  printf '%s  ' "https://orarioo.it/crown-rush/$f"
  curl -s -o /dev/null -w '%{http_code} %{content_type}\n' "https://orarioo.it/crown-rush/$f"
done
