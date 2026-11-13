#!/usr/bin/env bash
# Setter opp og oppdaterer musikksiden på serveren. Første gang (som root):
#   git clone https://github.com/Phroden/housemasterf.git /srv/housemasterf && bash /srv/housemasterf/server/deploy.sh
#
# Etterpå oppdateres siden av seg selv: housemasterf-update.timer henter main fra GitHub hvert 5. minutt
# (som brukeren «housemasterf», uten root). Kjør dette skriptet igjen bare når Caddy-oppsettet eller
# timeren er endret – eller for å oppdatere med en gang. Se loggen: journalctl -u housemasterf-update
set -euo pipefail
DIR=/srv/housemasterf
SITE=/etc/caddy/sites/housemasterf.caddy
USER_NAME=housemasterf
[ "$(id -u)" = 0 ] || { echo "Kjør som root"; exit 1; }

# Egen bruker som eier mappa og henter oppdateringer (ingen innlogging, ingen hjemmemappe)
id "$USER_NAME" >/dev/null 2>&1 || useradd --system --no-create-home --home-dir "$DIR" --shell /usr/sbin/nologin "$USER_NAME"
chown -R "$USER_NAME:$USER_NAME" "$DIR"
as_user() { runuser -u "$USER_NAME" -- "$@"; }

cd "$DIR"
as_user git fetch --quiet origin main
as_user git reset --quiet --hard origin/main
echo "Nettsiden er på $(as_user git log -1 --format='%h – %s')"
chmod -R a+rX "$DIR/public"

# Automatisk oppdatering: kopier enhetene (endres bare når dette skriptet kjøres som root)
changed=0
for u in housemasterf-update.service housemasterf-update.timer; do
  if ! cmp -s "server/$u" "/etc/systemd/system/$u"; then install -m 644 "server/$u" "/etc/systemd/system/$u"; changed=1; fi
done
[ "$changed" = 1 ] && systemctl daemon-reload
systemctl enable --now housemasterf-update.timer >/dev/null 2>&1
echo "Automatisk oppdatering er på (hvert 5. minutt)."

# Caddy leser filene direkte fra mappa; bare Caddy-oppsettet må kopieres
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
