import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AdminModeContextType {
  isAdminMode: boolean;
  toggleAdminMode: () => void;
}

const AdminModeContext = createContext<AdminModeContextType | undefined>(undefined);

export const AdminModeProvider = ({ children }: { children: ReactNode }) => {
  const [isAdminMode, setIsAdminMode] = useState(() => {
    const saved = localStorage.getItem('adminMode');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('adminMode', JSON.stringify(isAdminMode));
  }, [isAdminMode]);

  const toggleAdminMode = () => {
    setIsAdminMode(!isAdminMode);
  };

  return (
    <AdminModeContext.Provider value={{ isAdminMode, toggleAdminMode }}>
      {children}
    </AdminModeContext.Provider>
  );
};

export const useAdminMode = () => {
  const context = useContext(AdminModeContext);
  if (context === undefined) {
    throw new Error('useAdminMode must be used within an AdminModeProvider');
  }
  return context;
};
