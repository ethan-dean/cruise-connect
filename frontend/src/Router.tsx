import { createBrowserRouter } from 'react-router-dom'

// Layout Imports
import HeaderLayout from './layouts/HeaderLayout'
import AuthProtectedRoutesLayout from './layouts/AuthProtectedRoutesLayout'

// Page Imports
import HomePage from './pages/HomePage'
import AboutPage from './pages/AboutPage'
import RegisterPage from './pages/RegisterPage'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
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
          { path: '/', element: <HomePage /> },
          { path: '/about', element: <AboutPage /> },
          { path: '/sign-in', element: <LoginPage /> },
          { path: '/sign-up', element: <RegisterPage /> },
          {
            element: <AuthProtectedRoutesLayout />,
            path: '/dashboard',
            children: [
              { path: '/dashboard', element: <DashboardPage /> },
              { path: '/dashboard/profile', element: <ProfilePage /> },
            ]
          },
          { path: '/*', element: <NotFoundPage />},
        ]
      }
    ]
  );
};
