import { AsyncLocalStorage } from "async_hooks";

type TenantContext = {
  tenantId: string | null;
};

const storage = new AsyncLocalStorage<TenantContext>();

export function runWithTenant<T>(tenantId: string | null, fn: () => Promise<T>) {
  return storage.run({ tenantId }, fn);
}

export function getTenantContext(): TenantContext {
  return storage.getStore() || { tenantId: null };
}
