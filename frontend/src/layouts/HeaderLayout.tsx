import { Link, Outlet } from 'react-router-dom';
import { useContext } from 'react';

import { AuthContext } from '../contexts/AuthContext';

export default function HeaderLayout() {
  const { isAuthenticated } = useContext(AuthContext);

  return (
    <div>
      <header className='header-container'>
        <div className = 'header-logo-container'>
          <Link className='header-logo' to={isAuthenticated ? '/dashboard' : '/'}>TypeCode</Link>
        </div>
        <div className='header-options-container'>
          <Link className='header-about' to='/about'>About</Link>
          { isAuthenticated ?
              (<>
                <Link className='header-dashboard' to='/dashboard'>Dashboard</Link>
                <Link className='header-profile' to='/dashboard/profile'>Profile</Link>
              </>)
            :
              (<>
                <Link className='header-sign-in' to='/sign-in'>Sign-In</Link>
                <Link className='header-sign-up' to='/sign-up'>Sign-Up</Link>
              </>)
          }
        </div>
      </header>

      <main className='main'>
        <Outlet />
      </main>
    </div>
  );
}
