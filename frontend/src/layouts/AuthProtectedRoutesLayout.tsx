import { useContext } from 'react';
import { Outlet, Navigate } from 'react-router-dom';

import { AuthContext } from '../contexts/AuthContext';

export default function AuthProtectedRoutesLayout() {
    const { isAuthenticated } = useContext(AuthContext);

    if (!isAuthenticated) {
      return <Navigate to='/' />;
    }

    return (
      <Outlet />
    );
}
