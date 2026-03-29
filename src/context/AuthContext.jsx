import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44, COLLECTIONS } from '../api/base44Client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPartDistributor, setIsPartDistributor] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [username, setUsername] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if we have a stored session
    const storedAuth = localStorage.getItem('moeum_auth_v2');
    const storedSuperAuth = localStorage.getItem('superAdminAuth');

    if (storedSuperAuth) {
        try {
            const superAuthData = JSON.parse(storedSuperAuth);
            if (superAuthData.is_super_admin) {
                setIsSuperAdmin(true);
                setUsername(superAuthData.username || 'top');
            }
        } catch (e) {
            console.error("Failed to parse super admin auth", e);
        }
    }

    if (storedAuth) {
        try {
            const authData = JSON.parse(storedAuth);
            const userRole = authData.role;
            const userNickname = authData.username;

            if (userRole === 'admin') {
                setIsAdmin(true);
                setUsername(userNickname || 'admin'); // Fallback for existing sessions
            } else if (userRole === 'part_distributor') {
                setIsPartDistributor(true);
                setUsername(userNickname || 'part');
            } else if (storedAuth === 'true') {
                 // Fallback for very old generic sessions
                 setIsAdmin(true);
                 setUsername('admin');
            }
        } catch (e) {
            if (storedAuth === 'true') {
                 setIsAdmin(true);
                 setUsername('admin');
            }
        }
    }
    setLoading(false);
  }, []);

  const login = async (inputUsername, password) => {
    try {
      const items = await base44.entities.AdminUser.filter({ username: inputUsername, password });

      if (items && items.length > 0) {
          const user = items[0];
          // Determine role carefully. 
          let role = user.role;
          if (!role) {
              if (inputUsername === 'part') role = 'part_distributor';
              else role = 'admin'; // Default to admin for legacy accounts
          }
          
          if(role === 'admin') setIsAdmin(true);
          else if(role === 'part_distributor') setIsPartDistributor(true);
          
          setUsername(inputUsername);
          localStorage.setItem('moeum_auth_v2', JSON.stringify({ role, username: inputUsername }));

          // Super admin check
          if (inputUsername === 'top') {
              setIsSuperAdmin(true);
              localStorage.setItem('superAdminAuth', JSON.stringify({ is_super_admin: true, username: 'top' }));
          }

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
    setIsSuperAdmin(false);
    setUsername(null);
    localStorage.removeItem('moeum_auth_v2');
    localStorage.removeItem('superAdminAuth');
  };

  return (
    <AuthContext.Provider value={{ isAdmin, isPartDistributor, isSuperAdmin, username, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
