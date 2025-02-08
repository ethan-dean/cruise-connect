import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { differenceInYears } from 'date-fns';

import fetchWithAuth from "../utils/fetchWithAuth";
import getBackendUrl from "../utils/getBackendUrl";
import Loading from "../modules/loadingModule/Loading";


type UserProfileType = {
  firstName: string;
  lastName: string;
  birthDate: string;
  imageId: string;
  bio?: string;
  instagram?: string;
  snapchat?: string;
  tiktok?: string;
  twitter?: string;
  facebook?: string;
};

export default function CruiseFeedPage() {
  const [userProfilesData, setUserProfilesData] = useState<UserProfileType[] | null>(null);

  const location = useLocation();

  const getJoinedCruisesData = async () => {
    try {
      const cruiseId: number = location.state?.cruiseId;

      const response = await fetchWithAuth(`${getBackendUrl()}/api/v1/cruises/get-cruise-feed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cruiseId: cruiseId,
        })
      });

      if (response.ok) {
        const data = await response.json();
        setUserProfilesData(data);
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

  return !userProfilesData ? <Loading/> : (
    <div className=''>
      {userProfilesData.map((u, index) => { return (
        <div className='mt-2' key={index}> 
          <img className='mx-2 w-[calc(100vw-16px)] rounded-md' src={`${getBackendUrl()}/profilePictureDb/${u.imageId}.webp`} />
          <div className='mx-2 flex justify-between'>
            <p className='text-2xl font-semibold'>{`${u.firstName} ${u.lastName}`}</p>
            <p className='text-2xl font-semibold'>{differenceInYears(new Date(), new Date(u.birthDate))}</p>
          </div>
          <p className='mx-2 text-xl '>{`${u.bio}`}</p>
          <div className='mx-1 flex flex-wrap'>
            {u.instagram && (
              <p className='m-1 w-fit px-[6px] py-[2px] border-2 border-solid border-black rounded-full'>
                {`Instagram: @${u.instagram}`}
              </p>
            )}
            {u.snapchat && (
              <p className='m-1 w-fit px-[6px] py-[2px] border-2 border-solid border-black rounded-full'>
                {`Snapchat: @${u.snapchat}`}
              </p>
            )}
            {u.tiktok && (
              <p className='m-1 w-fit px-[6px] py-[2px] border-2 border-solid border-black rounded-full'>
                {`Tiktok: @${u.tiktok}`}
              </p>
            )}
            {u.twitter && (
              <p className='m-1 w-fit px-[6px] py-[2px] border-2 border-solid border-black rounded-full'>
                {`Twitter: @${u.twitter}`}
              </p>
            )}
            {u.facebook && (
              <p className='m-1 w-fit px-[6px] py-[2px] border-2 border-solid border-black rounded-full'>
                {`Facebook: @${u.facebook}`}
              </p>
            )}
          </div>
          {index < userProfilesData.length-1 && (
            <hr className='w-[calc(100vw-16px)] mx-auto mt-2 bg-gray-100' />
          )}
        </div>
        )}
      )}
    </div>
  );
}
