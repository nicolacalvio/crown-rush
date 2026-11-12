#!/usr/bin/env bash
# Read-only reconnaissance for the authorized orarioo.it deployment.
set -eu
printf 'HOST: '
hostname
printf 'WEB SERVER BINARIES:\n'
for binary in nginx apache2 httpd caddy docker python3; do
  command -v "$binary" || true
done
printf 'WEB ROOTS:\n'
for directory in /var/www /srv/www /etc/nginx/sites-enabled /etc/apache2/sites-enabled; do
  if [ -d "$directory" ]; then ls -ld "$directory" "$directory"/* 2>/dev/null || true; fi
done
if command -v nginx >/dev/null && command -v python3 >/dev/null; then
  python3 - <<'PY'
import re,subprocess
result=subprocess.run(['nginx','-T'],text=True,capture_output=True)
print('NGINX CONFIGURATION CHECK:', 'OK' if result.returncode==0 else 'FAILED')
# Print routing structure only; never print headers, credentials, or arbitrary config.
for line in result.stdout.splitlines():
    value=line.strip()
    if value.startswith('# configuration file '):
        print(value)
    elif re.match(r'^(server\s*\{|listen\s|server_name\s|root\s|alias\s|location\s|try_files\s|index\s|include\s|\})',value):
        print(value)
    elif re.match(r'^(proxy_pass|fastcgi_pass)\s',value):
        print(value.split()[0], '[upstream configured]')
PY
fi
