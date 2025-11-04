import { useRouteError } from "react-router-dom";
import { useNavigate, Link } from "react-router-dom";

export default function ErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();

  console.error("Caught error:", error);

  return (
    <div className='min-w-screen min-h-screen bg-gradient-to-b from-blue-50 to-white'>
      <header className='fixed top-0 w-screen z-[45] flex justify-between items-center h-[8%] bg-white shadow-md'>
        <div className = 'flex pl-4'>
          <Link className='text-lg font-semibold' to='/'>
            <img className='w-30 rounded-md' src='/wordmark-logo-lightmode.webp'/>
          </Link>
        </div>
      </header>

      <div className='flex flex-col min-h-[100vh]'>
        <main className='mt-[8vh] w-[92vw] mx-auto m-0 p-0 grow flex justify-center'>
          <div className='mt-10 text-center'>
            <h1 className='text-4xl font-bold'>Oops! Something went wrong.</h1>
            <p className='mt-2 text-xl'>Report the error and refresh the page to try again.</p>
            <p className='text-xl'>If that does not work, come back soon once it has been fixed!</p>
            <button className='mt-5 w-auto px-4 py-2 bg-blue-800 hover:bg-blue-700 active:bg-blue-600 cursor-pointer font-semibold text-white rounded-full text-2xl' onClick={() => navigate('/')}>Go Home</button>
          </div>
        </main>

        <footer className='mt-10 w-screen py-5 flex flex-col justify-between items-center'>
          <div className='w-[70vw] flex flex-wrap justify-center'>
            <a className='px-2 text-gray-600 text-sm underline' href='mailto:bugs@ethandean.dev'>Report an Issue?</a>
            <a className='px-2 text-gray-600 text-sm underline' href='mailto:help@ethandean.dev'>Contact Us</a>
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
