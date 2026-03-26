import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null); // 'student' | 'teacher'
  const [token, setToken] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("att_user");
    const savedRole = localStorage.getItem("att_role");
    const savedToken = localStorage.getItem("att_token");
    if (savedUser && savedRole && savedToken) {
      setUser(JSON.parse(savedUser));
      setRole(savedRole);
      setToken(savedToken);
    }
  }, []);

  const login = (userData, userRole, userToken) => {
    setUser(userData);
    setRole(userRole);
    setToken(userToken);
    localStorage.setItem("att_user", JSON.stringify(userData));
    localStorage.setItem("att_role", userRole);
    localStorage.setItem("att_token", userToken);
    // Backward compat
    localStorage.setItem("student", JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setRole(null);
    setToken(null);
    localStorage.clear();
  };

  return (
    <AuthContext.Provider value={{ user, role, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);