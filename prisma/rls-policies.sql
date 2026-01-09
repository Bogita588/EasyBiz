-- Enable row level security and policies per tenant using app.tenant_id
-- Run this once in production after confirming app.tenant_id is set via SET LOCAL per request.

ALTER TABLE "Tenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Item" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InvoiceLine" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Supplier" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PurchaseOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PurchaseOrderLine" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ActivityEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "IdempotencyKey" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

-- Helper function to check tenant match
CREATE OR REPLACE FUNCTION tenant_ok(tenant text)
RETURNS boolean LANGUAGE sql AS $$
  SELECT current_setting('app.tenant_id', true) IS NOT NULL
         AND tenant = current_setting('app.tenant_id', true);
$$;

-- Policies: allow only matching tenant rows; admins can be handled via elevated sessions if needed.
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'User','Customer','Item','Invoice','Payment','Supplier',
    'PurchaseOrder','ActivityEvent','IdempotencyKey','AuditLog'
  ]) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_tenant_isolation', t);
    EXECUTE format('CREATE POLICY %I ON %I USING (tenant_ok("tenantId"))', t || '_tenant_isolation', t);
  END LOOP;
END$$;

-- Tables without tenantId (e.g., InvoiceLine, PurchaseOrderLine) need custom policies (by joining parent) and are excluded here.
-- Tenant table is managed by admins; policies can be added separately if needed.

-- Child tables (no tenantId) enforced via parent joins
DROP POLICY IF EXISTS invoice_line_tenant ON "InvoiceLine";
CREATE POLICY invoice_line_tenant ON "InvoiceLine"
  USING (EXISTS (SELECT 1 FROM "Invoice" inv WHERE inv.id = "InvoiceLine"."invoiceId" AND tenant_ok(inv."tenantId")));

DROP POLICY IF EXISTS po_line_tenant ON "PurchaseOrderLine";
CREATE POLICY po_line_tenant ON "PurchaseOrderLine"
  USING (EXISTS (SELECT 1 FROM "PurchaseOrder" po WHERE po.id = "PurchaseOrderLine"."purchaseOrderId" AND tenant_ok(po."tenantId")));
