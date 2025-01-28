import { createBrowserRouter } from 'react-router-dom'

// Layout Imports
import HeaderLayout from './layouts/HeaderLayout'
import AuthProtectedRoutesLayout from './layouts/AuthProtectedRoutesLayout'

// Page Imports
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import SendPasswordResetPage from './pages/SendPasswordResetPage'
import ValidatePasswordResetPage from './pages/ValidatePasswordResetPage'
import DashboardPage from './pages/DashboardPage'
import ProfileCreatePage from './pages/ProfileCreatePage'
import JoinCruisePage from './pages/JoinCruisePage'
import CruiseFeedPage from './pages/CruiseFeedPage'
import ProfilePage from './pages/ProfilePage'
import NotFoundPage from './pages/NotFoundPage'

// CSS Imports
import './index.css'

export default function createRouter() {
  return createBrowserRouter(
    [
      {
        path: '/',
        element: <HeaderLayout />,
        children: [
          { path: '', element: <HomePage /> },
          { path: 'login', element: <LoginPage /> },
          { path: 'register', element: <RegisterPage /> },
          { path: 'verify-email', element: <VerifyEmailPage /> },
          { path: 'send-password-reset', element: <SendPasswordResetPage /> },
          { path: 'validate-password-reset', element: <ValidatePasswordResetPage /> },
          {
            element: <AuthProtectedRoutesLayout />,
            path: 'dashboard',
            children: [
              { path: '', element: <DashboardPage /> },
              { path: 'create-profile', element: <ProfileCreatePage /> },
              { path: 'join-cruise', element: <JoinCruisePage /> },
              { path: 'cruise-feed', element: <CruiseFeedPage /> },
              { path: 'profile', element: <ProfilePage /> },
            ]
          },
          { path: '*', element: <NotFoundPage />},
        ]
      }
    ]
  );
};
