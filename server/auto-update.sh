#!/usr/bin/env bash
# Henter nye versjoner av musikksiden fra GitHub. Kjøres hvert 5. minutt av housemasterf-update.timer,
# som brukeren «housemasterf» (ingen root): den kan bare endre filene i /srv/housemasterf.
# Caddy-oppsettet (server/housemasterf.caddy) tas IKKE i bruk herfra – da må deploy.sh kjøres som root.
set -euo pipefail
cd /srv/housemasterf
git fetch --quiet origin main
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] && exit 0
git reset --quiet --hard origin/main
echo "Oppdatert til $(git log -1 --format='%h – %s')"
if ! cmp -s server/housemasterf.caddy /etc/caddy/sites/housemasterf.caddy; then
  echo "NB: Caddy-oppsettet er endret i repoet. Kjør som root: bash /srv/housemasterf/server/deploy.sh"
fi
