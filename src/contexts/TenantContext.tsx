import React, { createContext, useContext, useState, useEffect } from 'react';

interface TenantContextType {
  tenantId: string | null;
  tenantName: string | null;
  setTenant: (id: string, name: string) => void;
  clearTenant: () => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState<string | null>(null);

  useEffect(() => {
    const storedTenantId = sessionStorage.getItem('tenantId');
    const storedTenantName = sessionStorage.getItem('tenantName');
    if (storedTenantId && storedTenantName) {
      setTenantId(storedTenantId);
      setTenantName(storedTenantName);
    }
  }, []);

  const setTenant = (id: string, name: string) => {
    setTenantId(id);
    setTenantName(name);
    sessionStorage.setItem('tenantId', id);
    sessionStorage.setItem('tenantName', name);
  };

  const clearTenant = () => {
    setTenantId(null);
    setTenantName(null);
    sessionStorage.removeItem('tenantId');
    sessionStorage.removeItem('tenantName');
  };

  return (
    <TenantContext.Provider value={{ tenantId, tenantName, setTenant, clearTenant }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
