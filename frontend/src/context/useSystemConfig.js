import { createContext, useContext } from 'react';

export const SystemConfigContext = createContext(null);

export function useSystemConfig() {
  const context = useContext(SystemConfigContext);
  if (!context) {
    throw new Error(
      'useSystemConfig must be used within a SystemConfigProvider'
    );
  }
  return context;
}
