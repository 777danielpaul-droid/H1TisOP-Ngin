#!/bin/sh
# Richtet den Cloud-Spielstand (Supabase) automatisch ein. Einfach ausführen: ./supabase-setup.sh
cd "$(dirname "$0")" && node tools/supabase-setup.mjs
