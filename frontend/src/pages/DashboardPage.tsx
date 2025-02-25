import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { parseISO, format } from "date-fns";

import fetchWithAuth from "../utils/fetchWithAuth";
import getBackendUrl from "../utils/getBackendUrl";
import Loading from "../modules/loadingModule/Loading";
import missingImage from "../assets/missing-image.jpg";

export default function DashboardPage() {
  const [joinedCruisesData, setJoinedCruisesData] = useState<{cruiseId: number, departureDate: string, shipName: string, shipId: number}[] | null>(null);

  const [numImagesLoaded, setNumImagesLoaded] = useState<number>(0);
  const [numImages, setNumImages] = useState<number>(1);

  const getJoinedCruisesData = async () => {
    try {
      const response = await fetchWithAuth(`${getBackendUrl()}/api/v1/cruises/get-my-cruises`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setJoinedCruisesData(data);
        setNumImages(data.length);
      } else {
        const data = await response.json();
        console.log(data.message || 'Server connection error, try again later...');
      }
    } catch (error) {
      console.log('Server connection error, try again later... ');
    };
  };

  useEffect(() => {
    getJoinedCruisesData();
  }, []);

  const leaveCruise = async (cruiseId: number) => {
    try {
      const response = await fetchWithAuth(`${getBackendUrl()}/api/v1/cruises/leave-cruise`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cruiseId: cruiseId,
        })
      });

      if (response.ok) {
        getJoinedCruisesData();
      } else {
        const data = await response.json();
        console.log(data.message || 'Server connection error, try again later...');
      }
    } catch (error) {
      console.log('Server connection error, try again later... ');
    };
  };

  return  (
    <div className='w-screen mt-5 flex flex-col items-center'>
      <Link 
        className='mt-4 w-fit px-4 py-2 bg-blue-800 hover:bg-blue-700 active:bg-blue-600 cursor-pointer font-semibold text-white rounded-full text-2xl'
        to={'/dashboard/join-cruise'}
      > 
        Join Cruise 
      </Link>

      <p className='mt-10 text-3xl font-semibold'>My Cruises</p>
      <div className=''>
        {(!joinedCruisesData) ? <Loading/> : (
          <>
            {(numImagesLoaded < numImages) && <Loading />}
            <div className={`${numImagesLoaded < numImages ? 'hidden' : 'block'} mt-5 w-[340px] md:w-[520px] mx-auto flex flex-wrap gap-5 justify-center`} >
              {joinedCruisesData.map(c => 
                <div className="relative rounded-md shadow-md bg-white hover:shadow-xl" key={c.cruiseId}>
                  {/* Clickable Card (excluding menu) */}
                  <Link 
                    className="block p-2 rounded-md"
                    to="/dashboard/cruise-feed" 
                    state={{ cruiseId: c.cruiseId, departureDate: c.departureDate, shipName: c.shipName }}
                  > 
                    <img 
                      className="w-36 rounded-md" 
                      src={`/ship-${c.shipId}.webp`} 
                      onError={(e) => e.currentTarget.src = missingImage } 
                      onLoad={() => setNumImagesLoaded(prev => prev + 1)}
                    />
                    <p className="w-30 font-semibold">{c.shipName}</p>
                    <p className="w-36">{format(parseISO(c.departureDate), "MMMM do, yyyy")}</p>
                  </Link>

                  {/* Menu (outside of Link) */}
                  <div className="absolute top-38 right-1">
                    <input id={`menuToggle-${c.cruiseId}`} className="peer absolute w-6 h-6 opacity-0 cursor-pointer z-40" type="checkbox" onClick={e => e.stopPropagation()}/>
                    <svg className="mt-[2px] w-6 peer-hover:scale-120 peer-hover:fill-gray-500" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#000000">
                      <path d="M480-160q-33 0-56.5-23.5T400-240q0-33 23.5-56.5T480-320q33 0 56.5 23.5T560-240q0 33-23.5 56.5T480-160Zm0-240q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Zm0-240q-33 0-56.5-23.5T400-720q0-33 23.5-56.5T480-800q33 0 56.5 23.5T560-720q0 33-23.5 56.5T480-640Z"/>
                    </svg>

                    <div className="invisible peer-checked:visible absolute z-30 top-0 right-0 w-38 bg-white border-2 border-gray-300 p-2 rounded-md shadow-lg">
                      <button className="w-30 px-2 text-left text-lg text-red-700 font-semibold cursor-pointer hover:font-extrabold hover:px-[7px]" 
                        onClick={(e) => { leaveCruise(c.cruiseId); e.stopPropagation(); }}>
                        Leave
                      </button>
                    </div>
                    <svg className="invisible peer-checked:visible absolute z-30 top-0 right-0 peer-hover:scale-110 peer-hover:fill-red-700" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#000000">
                      <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/>
                    </svg>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
