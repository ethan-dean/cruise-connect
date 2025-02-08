import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DateCalendar, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

import fetchWithAuth from "../utils/fetchWithAuth";
import getBackendUrl from "../utils/getBackendUrl";


// TODO: Add ability to go back in steps...
export default function JoinCruisePage() {
  const [shipName, setShipName] = useState<String>('');
  const [shipId, setShipId] = useState<number>(-1);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const [companyData, setCompanyData] = useState<{companyId: number, companyName: string}[]>([]);
  const [shipData, setShipData] = useState<{shipId: number, shipName: string}[]>([]);

  const [showCompanies, setShowCompanies] = useState(true);
  const [showShips, setShowShips] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const navigate = useNavigate();

  const getCompanyData = async () => {
    try {
      const response = await fetchWithAuth(`${getBackendUrl()}/api/v1/cruises/get-companies`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setCompanyData(data);
      } else {
        const data = await response.json();
        console.log(data.message || 'Server connection error, try again later...');
      }
    } catch (error) {
      console.log('Server connection error, try again later... ');
    };
  };
  useEffect(() => {
    getCompanyData()
  }, []);

  const getShipData = async (companyId: number) => {
    try {
      const response = await fetchWithAuth(`${getBackendUrl()}/api/v1/cruises/get-ships-of-company`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ companyId })
      });

      if (response.ok) {
        const data = await response.json();
        setShipData(data);
      } else {
        const data = await response.json();
        console.log(data.message || 'Server connection error, try again later...');
      }
    } catch (error) {
      console.log('Server connection error, try again later... ');
    };
  };

  const joinCruise = async () => {
    try {
      const response = await fetchWithAuth(`${getBackendUrl()}/api/v1/cruises/join-cruise`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shipId: shipId,
          cruiseDepartureDate: selectedDate!.toISOString().split('T')[0]
        })
      });

      if (response.ok) {
        navigate('/dashboard');
      } else {
        const data = await response.json();
        console.log(data.message || 'Server connection error, try again later...');
      }
    } catch (error) {
      console.log('Server connection error, try again later...');
    }
  }

  return (
    <div className='join-cruise-page__container'>
      <h1 className='join-cruise-page__title'>Join Cruise</h1>
      {showCompanies && companyData.map(c => ( 
        <button
          key={c.companyId}
          className='join-cruise-page__company-button' 
          onClick={() => { getShipData(c.companyId); setShowCompanies(false); setShowShips(true); } }
        >
          {c.companyName}
        </button>
      ))}

      {showShips && shipData.map(s => (
        <button
          key={s.shipId}
          className='join-cruise-page__ship-button' 
          onClick={() => { setShipId(s.shipId); setShipName(s.shipName); setShowShips(false); setShowCalendar(true); } }
        >
          {s.shipName}
        </button>
      ))}

      {showCalendar && (
        <div>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DateCalendar
              value={selectedDate}
              onChange={(date) => setSelectedDate(date)}
            />
          </LocalizationProvider>
          <button
            className='join-cruise-page__next-button' 
            onClick={() => { setShowCalendar(false); setShowSummary(true); } }
          >
            Next
          </button>
        </div>
      )}

      {showSummary && (
        <div>
          <p>{shipName}</p>
          <p>{selectedDate!.toDateString()}</p>
          <button
            className='join-cruise-page__join-button' 
            onClick={() => joinCruise() }
          >
            Join!
          </button>
        </div>
      )}
    </div>
  );
}
