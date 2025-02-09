import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DateCalendar, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { format } from "date-fns";

import fetchWithAuth from "../utils/fetchWithAuth";
import getBackendUrl from "../utils/getBackendUrl";
import Loading from "../modules/loadingModule/Loading";
import missingImage from "../assets/missing-image.jpg";


// TODO: Add ability to go back in steps...
export default function JoinCruisePage() {
  const [companyName, setCompanyName] = useState<String>('');
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
    <div className='mt-5'>
      <h1 className='text-center text-2xl font-bold'>Find Your Cruise!</h1>

      {showCompanies && (
        <div>
          <h2 className='mt-6 text-center text-xl font-semibold'>Who are you cruising with?</h2>
          <div className='mt-4 w-[340px] mx-auto flex flex-wrap gap-5'>
            {!companyData ? <Loading/> : companyData.map(c => (
              <button 
                key={c.companyId}
                className='p-2 rounded-md shadow-md bg-white' 
                onClick={() => { setCompanyName(c.companyName); getShipData(c.companyId); setShowCompanies(false); setShowShips(true); } }
              > 
                <img className='w-36 rounded-md' src={`../company-${c.companyId}.webp`} onError={(e) => { e.currentTarget.src = missingImage; }} />
                <p className='w-36 font-semibold'>{c.companyName}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {showShips && (
        <div>
          <h2 className='mt-6 text-center text-xl font-semibold'>What ship are you cruising on?</h2>
          <div className='mt-4 w-[340px] mx-auto flex flex-wrap gap-5'>
            {!shipData ? <Loading /> : shipData.map(s => (
              <button
                key={s.shipId}
                className='p-2 rounded-md shadow-md bg-white' 
                onClick={() => { setShipId(s.shipId); setShipName(s.shipName); setShowShips(false); setShowCalendar(true); } }
              >
                <img className='w-36 rounded-md' src={`../ship-${s.shipId}.webp`} onError={(e) => { e.currentTarget.src = missingImage; }} />
                <p className='w-36 font-semibold'>{s.shipName}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {showCalendar && (
        <div className='flex flex-col items-center'>
          <h2 className='mt-6 mb-2 text-center text-xl font-semibold'>When is your cruise departing?</h2>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DateCalendar
              value={selectedDate}
              onChange={(date) => setSelectedDate(date)}
            />
          </LocalizationProvider>
          <button
            className='w-30 px-3 py-1.5 bg-blue-400 rounded-md text-lg font-semibold text-white' 
            onClick={() => { setShowCalendar(false); setShowSummary(true); } }
          >
            Find Cruise
          </button>
        </div>
      )}

      {showSummary && (
        <div className='flex flex-col items-center'>
          <h2 className='mt-6 text-center text-xl font-semibold'>Summary</h2>
          <img className='mt-3 w-60 rounded-md' src={`../ship-${shipId}.webp`} onError={(e) => { e.currentTarget.src = missingImage; }} />
          <div className='w-60'>
            <p className='text-xl font-bold'>{shipName}</p>
            <p>{companyName}</p>
            <p>{format((selectedDate!), "MMMM do, yyyy")}</p>
          </div>
          <button
            className='mt-5 w-30 px-3 py-1.5 bg-blue-400 rounded-md text-lg font-semibold text-white' 
            onClick={() => joinCruise() }
          >
            Join Cruise
          </button>
        </div>
      )}
    </div>
  );
}
