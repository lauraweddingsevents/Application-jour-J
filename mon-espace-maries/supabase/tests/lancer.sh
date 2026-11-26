#!/bin/bash
# Recrée une base de test locale, applique les migrations puis les tests de sécurité.
# Prérequis : un Postgres 16 local (variables PGHOST, PGPORT, PGUSER).
set -e
cd "$(dirname "$0")/.."
psql -qc "drop database if exists espace_maries_test" -c "create database espace_maries_test"
P="psql -d espace_maries_test -v ON_ERROR_STOP=1 -q"
$P -f tests/supabase-local.sql
for f in migrations/*.sql; do $P -f "$f" 2>&1 | grep -v "does not exist, skipping" || true; done
$P -f tests/securite.sql
