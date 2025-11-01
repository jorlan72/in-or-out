import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface DailyMessageVisibilityContextType {
  isVisible: boolean;
  toggleVisibility: () => void;
}

const DailyMessageVisibilityContext = createContext<DailyMessageVisibilityContextType | undefined>(undefined);

export const DailyMessageVisibilityProvider = ({ children }: { children: ReactNode }) => {
  const [isVisible, setIsVisible] = useState(() => {
    const saved = localStorage.getItem('dailyMessageVisible');
    return saved ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem('dailyMessageVisible', JSON.stringify(isVisible));
  }, [isVisible]);

  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  return (
    <DailyMessageVisibilityContext.Provider value={{ isVisible, toggleVisibility }}>
      {children}
    </DailyMessageVisibilityContext.Provider>
  );
};

export const useDailyMessageVisibility = () => {
  const context = useContext(DailyMessageVisibilityContext);
  if (context === undefined) {
    throw new Error('useDailyMessageVisibility must be used within a DailyMessageVisibilityProvider');
  }
  return context;
};
