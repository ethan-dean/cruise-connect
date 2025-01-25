import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

import fetchWithAuth from "../utils/fetchWithAuth";
import getBackendUrl from "../utils/getBackendUrl";
import "../css/CruiseFeedPage.css";
import missingImage from "../assets/missing-image.jpg";

type UserProfileType = {
  firstName: string;
  lastName: string;
  birthDate: string;
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
          <img src={missingImage} />
          <p>{u.firstName + ' ' + u.lastName}</p>
          <p>{u?.bio}</p>
        </div>
        )}
      )}
    </div>
  );
}
