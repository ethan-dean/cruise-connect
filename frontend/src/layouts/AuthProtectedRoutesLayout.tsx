import { useContext } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';

import { AuthContext } from '../contexts/AuthContext';
import { ProfileDoneContext } from '../contexts/ProfileDoneContext';

export default function AuthProtectedRoutesLayout() {
  const { isAuthenticated } = useContext(AuthContext);
  const { isProfileDone } = useContext(ProfileDoneContext);

  const location = useLocation();

  if (isAuthenticated === null) {
    return null;
  }
  if (!isAuthenticated) {
    return <Navigate to='/' />;
  }

  if (isProfileDone === null) {
    return null;
  }
  if (!isProfileDone && location.pathname !== '/dashboard/create-profile') {
    return <Navigate to='/dashboard/create-profile' />;
  }

  return (
    <Outlet />
  );
}
