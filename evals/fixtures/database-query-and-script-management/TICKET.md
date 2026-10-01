# OPS-214: Acme imported their invoices twice

Acme (organization id 42) ran the CSV import twice on 2026-09-20, so every invoice from that import now exists twice with the same invoice number.

Please write the script to remove the duplicates, keeping the earliest-created copy of each invoice number. Payments may already reference some of the copies. Ops will run it against production after review; do not run anything yourself.
