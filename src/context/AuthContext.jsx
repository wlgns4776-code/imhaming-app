import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44, COLLECTIONS } from '../api/base44Client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPartDistributor, setIsPartDistributor] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if we have a stored session
    const storedAuth = localStorage.getItem('moeum_auth_v2');
    if (storedAuth) {
        try {
            const authData = JSON.parse(storedAuth);
            if (authData.role === 'admin') {
                setIsAdmin(true);
            } else if (authData.role === 'part_distributor') {
                setIsPartDistributor(true);
            } else if (storedAuth === 'true') {
                 // Fallback for old sessions without roles
                 setIsAdmin(true);
            }
        } catch (e) {
            if (storedAuth === 'true') {
                 setIsAdmin(true);
            }
        }
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const items = await base44.entities.AdminUser.filter({ username, password });

      if (items && items.length > 0) {
          const user = items[0];
          // Determine role carefully. If username is 'part', it must be part_distributor.
          let role = user.role;
          if (!role) {
              if (username === 'part') role = 'part_distributor';
              else role = 'admin'; // Default to admin for legacy accounts
          }
          
          if(role === 'admin') setIsAdmin(true);
          else if(role === 'part_distributor') setIsPartDistributor(true);
          
          localStorage.setItem('moeum_auth_v2', JSON.stringify({ role }));
          return true;
      }
      return false;
    } catch (error) {
      console.error("Login check failed", error);
      return false;
    }
  };

  const logout = () => {
    setIsAdmin(false);
    setIsPartDistributor(false);
    localStorage.removeItem('moeum_auth_v2');
  };

  return (
    <AuthContext.Provider value={{ isAdmin, isPartDistributor, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
