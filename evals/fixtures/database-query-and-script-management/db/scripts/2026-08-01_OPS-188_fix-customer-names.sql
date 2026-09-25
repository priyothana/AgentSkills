-- Trim whitespace from customer names for organization 17.
UPDATE invoices SET customer_name = trim(customer_name) WHERE organization_id = 17;
