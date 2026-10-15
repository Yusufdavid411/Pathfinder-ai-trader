import { createContext, type PropsWithChildren } from 'react';

type AppContextValue = {
  appName: string;
};

export const AppContext = createContext<AppContextValue>({
  appName: 'PathFinder AI Trader',
});

export function AppProvider({ children }: PropsWithChildren) {
  return (
    <AppContext.Provider value={{ appName: 'PathFinder AI Trader' }}>
      {children}
    </AppContext.Provider>
  );
}
