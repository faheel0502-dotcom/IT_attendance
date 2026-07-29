import { createContext } from 'react'

// Exported separately from AuthProvider to satisfy Vite Fast Refresh rules
// (files must export only React components OR only non-components)
export const AuthContext = createContext(null)
