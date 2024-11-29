import { Link, Outlet } from 'react-router-dom';
import { useContext } from 'react';

import { AuthContext } from '../contexts/AuthContext';

export default function HeaderLayout() {
  const { isAuthenticated } = useContext(AuthContext);

  return (
    <div>
      <header className='header-container'>
        <div className = 'header-logo-container'>
          <Link className='header-logo' to={isAuthenticated ? '/dashboard' : '/'}>Website</Link>
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
                <Link className='header-login' to='/login'>Login</Link>
                <Link className='header-register' to='/register'>Register</Link>
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
