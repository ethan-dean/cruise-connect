import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { differenceInYears } from 'date-fns';

import fetchWithAuth from "../utils/fetchWithAuth";
import getBackendUrl from "../utils/getBackendUrl";
import "../css/CruiseFeedPage.css";


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
  const [userProfilesData, setUserProfilesData] = useState<UserProfileType[]>([]);

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

  return (
    <div className='cruise-feed-page__container'>
      <p>Cruise Feed</p>
      {userProfilesData.map((u, index) => { return (
        <div key={index}> 
          <img src={`${getBackendUrl()}/profilePictureDb/${u.imageId}.webp`} />
          <p>{`Name: ${u.firstName} ${u.lastName}`}</p>
          <p>{`Bio: ${u.bio}`}</p>
          <p>{differenceInYears(new Date(), new Date(u.birthDate))} years old</p>
          <p>{(u.instagram) ? `Instagram: ${u.instagram}` : ''}</p>
          <p>{(u.snapchat) ? `Snapchat: ${u.snapchat}` : ''}</p>
          <p>{(u.tiktok) ? `Tiktok: ${u.tiktok}` : ''}</p>
          <p>{(u.twitter) ? `Twitter: ${u.twitter}` : ''}</p>
          <p>{(u.facebook) ? `Facebook: ${u.facebook}` : ''}</p>
        </div>
        )}
      )}
    </div>
  );
}
