import { Link, Outlet } from 'react-router-dom';
import { useContext } from 'react';

import { AuthContext } from '../contexts/AuthContext';
import { ProfileDoneContext } from '../contexts/ProfileDoneContext';

export default function HeaderLayout() {
  const { isAuthenticated } = useContext(AuthContext);
  const { isProfileDone } = useContext(ProfileDoneContext);

  return (
    <div className='w-screen h-screen'>
      <header className='fixed top-0 w-screen z-[45] flex justify-between items-center h-[8%] bg-white shadow-md'>
        <div className = 'flex pl-4'>
          <Link className='text-lg font-semibold' to='/'>Cruise Connect</Link>
        </div>
        <div className='flex justify-around pr-4'>
          { isAuthenticated ?
              isProfileDone ? (<>
                <Link className='text-lg font-semibold pr-5' to='/dashboard'>Dashboard</Link>
                <Link className='text-lg font-semibold' to='/dashboard/profile'>Profile</Link>
              </>)
              :
              (<>
                <Link className='text-lg font-semibold' to='/dashboard/profile'>Profile</Link>
              </>)
            :
              (<>
                <Link className='text-lg font-semibold pr-5' to='/login'>Login</Link>
                <Link className='text-lg font-semibold' to='/register'>Register</Link>
              </>)
          }
        </div>
      </header>

      <main className='m-0 mt-[8vh] p-0 flex justify-center h-[92%]'>
        <Outlet />
      </main>
    </div>
  );
}
