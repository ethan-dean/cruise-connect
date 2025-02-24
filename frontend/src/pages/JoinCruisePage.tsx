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

  const [companyData, setCompanyData] = useState<{companyId: number, companyName: string}[] | null>(null);
  const [shipData, setShipData] = useState<{shipId: number, shipName: string}[] | null>(null);

  const [showCompanies, setShowCompanies] = useState(true);
  const [showShips, setShowShips] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const [numCompanyImagesLoaded, setCompanyNumImagesLoaded] = useState<number>(0);
  const [numCompanyImages, setCompanyNumImages] = useState<number>(1);
  const [numShipImagesLoaded, setShipNumImagesLoaded] = useState<number>(0);
  const [numShipImages, setShipNumImages] = useState<number>(1);

  const navigate = useNavigate();

  const getCompanyData = async () => {
    try {
      const response = await fetchWithAuth(`${getBackendUrl()}/api/v1/cruises/get-companies`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setCompanyData(data);
        setCompanyNumImages(data.length);
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
        setShipNumImages(data.length);
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
          {!companyData ? <Loading/> : (
            <>
              {numCompanyImagesLoaded < numCompanyImages && <Loading />}
              <div className={`mt-4 w-[340px] mx-auto flex flex-wrap gap-5 ${numCompanyImagesLoaded < numCompanyImages ? 'hidden' : 'block'}`}>
                {companyData.map(c => (
                  <button
                    key={c.companyId}
                    className='p-2 rounded-md shadow-md bg-white cursor-pointer hover:shadow-xl' 
                    onClick={() => { setCompanyName(c.companyName); getShipData(c.companyId); setShowCompanies(false); setShowShips(true); } }
                  > 
                    <img className='w-36 rounded-md' 
                         src={`/company-${c.companyId}.webp`} 
                         onError={(e) => e.currentTarget.src = missingImage }
                         onLoad={() => setCompanyNumImagesLoaded(prev => prev+1) }
                    />
                    <p className='w-36 font-semibold'>{c.companyName}</p>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {showShips && (
        <div>
          <h2 className='mt-6 text-center text-xl font-semibold'>What ship are you cruising on?</h2>
          {!shipData ? <Loading /> : (
            <>
              {numShipImagesLoaded < numShipImages && <Loading />}
              <div className={`mt-4 w-[340px] mx-auto flex flex-wrap gap-5 ${numShipImagesLoaded < numShipImages ? 'hidden' : 'block'}`}>
                {shipData.map(s => (
                  <button
                    key={s.shipId}
                    className='p-2 flex flex-col justify-start rounded-md shadow-md bg-white cursor-pointer hover:shadow-2xl' 
                    onClick={() => { setShipId(s.shipId); setShipName(s.shipName); setShowShips(false); setShowCalendar(true); } }
                  >
                    <img className='w-36 rounded-md' 
                         src={`/ship-${s.shipId}.webp`}
                         onError={(e) => e.currentTarget.src = missingImage }
                         onLoad={() => setShipNumImagesLoaded(prev => prev + 1) }
                    />
                    <p className='w-36 font-semibold'>{s.shipName}</p>
                  </button>
                ))}
              </div>
            </>
          )}
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
            className='mt-4 w-fit px-4 py-2 bg-blue-800 hover:bg-blue-700 active:bg-blue-600 cursor-pointer font-semibold text-white rounded-full text-2xl'
            onClick={() => { setShowCalendar(false); setShowSummary(true); } }
          >
            Find Cruise
          </button>
        </div>
      )}

      {showSummary && (
        <div className='flex flex-col items-center'>
          <h2 className='mt-6 text-center text-xl font-semibold'>Summary</h2>
          <img className='mt-3 w-60 rounded-md' src={`/ship-${shipId}.webp`} onError={(e) => { e.currentTarget.src = missingImage; }} />
          <div className='w-60'>
            <p className='text-xl font-bold'>{shipName}</p>
            <p>{companyName}</p>
            <p>{format((selectedDate!), "MMMM do, yyyy")}</p>
          </div>
          <button
            className='mt-4 w-fit px-4 py-2 bg-blue-800 hover:bg-blue-700 active:bg-blue-600 cursor-pointer font-semibold text-white rounded-full text-2xl'
            onClick={() => joinCruise() }
          >
            Join Cruise
          </button>
        </div>
      )}
    </div>
  );
}
