import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

import fetchWithAuth from "../utils/fetchWithAuth";
import getBackendUrl from "../utils/getBackendUrl";
import "../css/DashboardPage.css";
import missingImage from "../assets/missing-image.jpg";

// TODO: Display joined cruises on this page
export default function DashboardPage() {
  const [joinedCruisesData, setJoinedCruisesData] = useState<{cruiseId: number, departureDate: string, shipName: string}[]>([]);

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

  return (
    <div className='dashboard-page__container'>
      <Link to={'/dashboard/join-cruise'}> Join Cruise </Link>
      <p>Cruises</p>
      {joinedCruisesData.map(c => { return (
        <Link key={c.cruiseId} to='/dashboard/cruise-feed' state={{cruiseId: c.cruiseId}}> 
          <img src={missingImage} />
          <p>{c.shipName}</p>
          <p>{c.departureDate.split('T')[0]}</p>
        </Link>
        )}
      )}
    </div>
  );
}
