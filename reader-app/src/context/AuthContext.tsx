import React, { createContext, useContext, useState, ReactNode } from 'react';

export type Role = 'reader' | 'author';

type AuthState = {
  userId: string | null;
  readerId: string | null;
  role: Role | null;
};

type AuthContextValue = AuthState & {
  setAuth: (value: AuthState) => void;
  clearAuth: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AuthState>({
    userId: null,
    readerId: null,
    role: null,
  });

  const setAuth = (value: AuthState) => setState(value);
  const clearAuth = () =>
    setState({
      userId: null,
      readerId: null,
      role: null,
    });

  return (
    <AuthContext.Provider value={{ ...state, setAuth, clearAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};