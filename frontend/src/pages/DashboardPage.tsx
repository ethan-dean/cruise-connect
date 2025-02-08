import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { parseISO, format } from "date-fns";

import fetchWithAuth from "../utils/fetchWithAuth";
import getBackendUrl from "../utils/getBackendUrl";
import Loading from "../modules/loadingModule/Loading";
import missingImage from "../assets/missing-image.jpg";

export default function DashboardPage() {
  const [joinedCruisesData, setJoinedCruisesData] = useState<{cruiseId: number, departureDate: string, shipName: string}[] | null>(null);

  const getJoinedCruisesData = async () => {
    try {
      const response = await fetchWithAuth(`${getBackendUrl()}/api/v1/cruises/get-my-cruises`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setJoinedCruisesData(data);
      } else {
        const data = await response.json();
        console.log(data.message || 'Server connection error, try again later...');
      }
    } catch (error) {
      console.log('Server connection error, try again later... ');
    };
  };
  useEffect(() => {
    getJoinedCruisesData()
  }, []);

  return  (
    <div className='w-screen mt-5 flex flex-col items-center'>
      <Link className='p-2 text-lg font-semibold text-white bg-blue-400 border-none rounded-full' to={'/dashboard/join-cruise'}> Join Cruise </Link>
      <p className='mt-10 text-xl font-semibold'>My Cruises</p>
      <div className='mt-5 w-[340px] mx-auto flex flex-wrap gap-5'>
        {!joinedCruisesData ? <Loading/> : joinedCruisesData.map(c => { return (
          <Link key={c.cruiseId} to='/dashboard/cruise-feed' state={{cruiseId: c.cruiseId}}> 
            <img className='w-40 rounded-md' src={missingImage} />
            <p className='w-40 font-semibold'>{c.shipName}</p>
            { 
            // <p className='w-40'>{format(parseISO(c.departureDate), "M/d/yyyy")}</p> 
            }
            <p className='w-40'>{format(parseISO(c.departureDate), "MMMM do, yyyy")}</p>
          </Link>
          )}
        )}
      </div>
    </div>
  );
}
