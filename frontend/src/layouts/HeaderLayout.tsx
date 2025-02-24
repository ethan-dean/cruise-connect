import { Link, Outlet } from 'react-router-dom';
import { useContext } from 'react';

import { AuthContext } from '../contexts/AuthContext';
import { ProfileDoneContext } from '../contexts/ProfileDoneContext';

export default function HeaderLayout() {
  const { isAuthenticated } = useContext(AuthContext);
  const { isProfileDone } = useContext(ProfileDoneContext);

  return (
    <div className='min-w-screen min-h-screen bg-gradient-to-b from-blue-50 to-white'>
      <header className='fixed top-0 w-screen z-[45] flex justify-between items-center h-[8%] bg-white shadow-md'>
        <div className = 'flex pl-4'>
          <Link className='text-lg font-semibold' to='/'>
            <img className='w-30 rounded-md' src='/wordmark-logo-lightmode.webp'/>
          </Link>
        </div>
        <div className='flex justify-around mr-5 sm:mr-10'>
          { isAuthenticated ?
              isProfileDone ? (<>
                <Link className='text-lg font-semibold mr-5 px-[1px] hover:font-bold hover:px-0' to='/dashboard'>Dashboard</Link>
                <Link className='text-lg font-semibold px-[1px] hover:font-bold hover:px-0' to='/dashboard/profile'>Profile</Link>
              </>)
              :
              (<>
                <Link className='text-lg font-semibold px-[1px] hover:font-bold hover:px-0' to='/dashboard/profile'>Profile</Link>
              </>)
            :
              (<>
                <Link className='text-lg font-semibold mr-5 px-[1px] hover:font-bold hover:px-0' to='/login'>Login</Link>
                <Link className='text-lg font-semibold px-[1px] hover:font-bold hover:px-0' to='/register'>Register</Link>
              </>)
          }
        </div>
      </header>

      <div className='flex flex-col min-h-[100vh]'>
       <main className='mt-[8vh] m-0 p-0 grow flex justify-center'>
         <Outlet />
       </main>

        <footer className='mt-10 w-screen py-5 flex flex-col justify-between items-center'>
          <div className='w-[70vw] flex flex-wrap justify-center'>
            <a className='px-2 text-gray-600 text-sm underline' href='mailto:bugs@thecruiseconnect.com'>Report an Issue?</a>
            <a className='px-2 text-gray-600 text-sm underline' href='mailto:help@thecruiseconnect.com'>Contact Us</a>
          </div>
          <div className='w-[70vw] flex flex-col items-center'>
            <Link className='mt-2 px-2 text-gray-600 text-sm underline' to='/terms-of-service'>Terms of Service</Link>
            <Link className='mt-2 px-2 text-gray-600 text-sm underline' to='/privacy-policy'>Privacy Policy</Link>
          </div>
          <p className='mt-2 px-2 text-gray-600 text-sm'>Copyright © {new Date().getFullYear()} Cruise Connect, LLC</p>
        </footer>
      </div>
    </div>
  );
}
