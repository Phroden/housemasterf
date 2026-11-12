#!/usr/bin/env bash
# Oppdaterer musikksiden på serveren. Første gang (som root):
#   git clone https://github.com/Phroden/housemasterf.git /srv/housemasterf && bash /srv/housemasterf/server/deploy.sh
# Senere:
#   bash /srv/housemasterf/server/deploy.sh      (henter fra GitHub, oppdaterer Caddy hvis oppsettet er endret)
set -euo pipefail
DIR=/srv/housemasterf
SITE=/etc/caddy/sites/housemasterf.caddy
[ "$(id -u)" = 0 ] || { echo "Kjør som root"; exit 1; }
cd "$DIR"
git fetch --quiet origin main
git reset --quiet --hard origin/main
echo "Nettsiden er på $(git log -1 --format='%h – %s')"
# Caddy leser filene direkte fra mappa; bare Caddy-oppsettet må kopieres
chmod -R a+rX "$DIR/public"
mkdir -p /etc/caddy/sites
if ! cmp -s server/housemasterf.caddy "$SITE"; then
  cp server/housemasterf.caddy "$SITE.new"
  mv "$SITE.new" "$SITE"
  if caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1; then
    systemctl reload caddy
    echo "Caddy er oppdatert."
  else
    echo "Caddy-oppsettet er ugyldig – fjerner det igjen:"
    caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile || true
    rm -f "$SITE"
    systemctl reload caddy || true
    exit 1
  fi
fi
grep -q '^HOUSEMASTER_HOST=' /etc/vinyl/vinyl.env 2>/dev/null || echo "NB: kjør data-update så Herah kjenner adressen (HOUSEMASTER_HOST)."
echo "Ferdig: https://housemasterf.frodewerner.no"
