import { createContext, useContext, ReactNode } from 'react';
import { useMeshWorker, UseMeshWorkerReturn } from './useMeshWorker';

const MeshWorkerContext = createContext<UseMeshWorkerReturn | null>(null);

export function MeshWorkerProvider({ children }: { children: ReactNode }) {
  const meshWorker = useMeshWorker();
  
  return (
    <MeshWorkerContext.Provider value={meshWorker}>
      {children}
    </MeshWorkerContext.Provider>
  );
}

export function useMeshWorkerContext(): UseMeshWorkerReturn {
  const context = useContext(MeshWorkerContext);
  if (!context) {
    throw new Error('useMeshWorkerContext must be used within a MeshWorkerProvider');
  }
  return context;
}
