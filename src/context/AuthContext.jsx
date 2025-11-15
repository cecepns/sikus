import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  useEffect(() => {
    // Load token from localStorage on mount
    const savedToken = localStorage.getItem('authToken');
    if (savedToken) {
      setToken(savedToken);
      checkAuth(savedToken);
    } else {
      setLoading(false);
    }
  }, []);

  const checkAuth = async (authToken) => {
    try {
      const tokenToUse = authToken || token;
      if (!tokenToUse) {
        setLoading(false);
        return;
      }

      const response = await fetch('https://api-inventory.isavralabel.com/sikus/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${tokenToUse}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        // Token is invalid, clear it
        localStorage.removeItem('authToken');
        setToken(null);
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await fetch('https://api-inventory.isavralabel.com/sikus/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (response.ok) {
      // Save token to localStorage
      localStorage.setItem('authToken', data.token);
      setToken(data.token);
      setUser(data.user);
      return { success: true, message: data.message };
    } else {
      return { success: false, error: data.error };
    }
  };

  const logout = async () => {
    try {
      await fetch('https://api-inventory.isavralabel.com/sikus/api/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      // Clear token and user
      localStorage.removeItem('authToken');
      setToken(null);
      setUser(null);
    }
  };

  const register = async (userData) => {
    const response = await fetch('https://api-inventory.isavralabel.com/sikus/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json();

    if (response.ok) {
      return { success: true, message: data.message };
    } else {
      return { success: false, error: data.error };
    }
  };

  const value = {
    user,
    loading,
    token,
    login,
    logout,
    register,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};