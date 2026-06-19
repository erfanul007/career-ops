#!/usr/bin/env sh
set -e
until pg_isready -h "${DB_HOST:-careerops-postgres}" -p 5432 -U "${POSTGRES_USER:-careerops}"; do
  echo "waiting for postgres..."; sleep 2
done
echo "postgres is ready"
