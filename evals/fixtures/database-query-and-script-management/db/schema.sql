-- PostgreSQL schema (excerpt)

CREATE TABLE organizations (
  id          bigint PRIMARY KEY,
  name        text NOT NULL
);

CREATE TABLE invoices (
  id              bigserial PRIMARY KEY,
  organization_id bigint NOT NULL REFERENCES organizations(id),
  number          text NOT NULL,
  customer_name   text NOT NULL,
  amount_cents    bigint NOT NULL,
  import_batch    text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX invoices_org_created_idx ON invoices (organization_id, created_at);

CREATE TABLE payments (
  id           bigserial PRIMARY KEY,
  invoice_id   bigint NOT NULL REFERENCES invoices(id),
  amount_cents bigint NOT NULL,
  paid_at      timestamptz NOT NULL
);
CREATE INDEX payments_invoice_idx ON payments (invoice_id);
