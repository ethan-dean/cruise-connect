import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { format, parseISO, differenceInYears } from 'date-fns';

import fetchWithAuth from "../utils/fetchWithAuth";
import getBackendUrl from "../utils/getBackendUrl";
import Loading from "../modules/loadingModule/Loading";
import missingImage from "../assets/missing-image.jpg";


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

  const [numImagesLoaded, setNumImagesLoaded] = useState<number>(0);
  const [numImages, setNumImages] = useState<number>(1);

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
    getJoinedCruisesData()
  }, []);

  const shareUrl = "https://thecruiseconnect.com/join-cruise";
  const shareText = `Join My Cruise on Cruise Connect! 🚢\nFind me on the ${location.state.shipName || 'ship'} on ${format(parseISO(location.state.departureDate), "MMMM do, yyyy")}!\n`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareText,
          url: shareUrl,
        });
      } catch (err) {
        console.error("Error sharing:", err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
        alert("✅ Link copied! Share it with your friends.");
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    }
  };

  const handleSMSShare = () => {
    const message = encodeURIComponent(`${shareText}\n${shareUrl}`);
    window.location.href = `sms:?body=${message}`;
  };

  return !userProfilesData ? <Loading/> : (
    <div className=''>
      {numImagesLoaded < numImages && <Loading />}

      <div className={`${numImagesLoaded < numImages ? 'hidden' : 'block'}`}>
        {userProfilesData.map((u, index) => { return (
          <div className='mt-2' key={index}> 
            <img className='mx-2 w-[calc(100vw-16px)] rounded-md' 
                 src={`${getBackendUrl()}/profilePictureDb/${u.imageId}.webp`}
                 onError={(e) => e.currentTarget.src = missingImage } 
                 onLoad={() => setNumImagesLoaded(prev => prev + 1) }
            />
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
            <hr className='w-[calc(100vw-16px)] mx-auto mt-2 bg-gray-100' />
          </div>
          )}
        )}
      </div>

      {(userProfilesData.length < 1) && (
        <div className='mt-2'>
          <h1 className='mt-4 w-[92vw] mx-auto text-xl font-semibold text-center'>No one else has joined this cruise yet.</h1>
          <h1 className='mt-8 w-[92vw] mx-auto text-xl font-semibold text-center'>Be the first to invite others!</h1>
        </div>
      )}
      
      <div className={`mb-8 ${userProfilesData.length >= 1 ? 'mt-6' : 'mt-2'}`}>
        <p className='mt-2 w-[92vw] mx-auto text-lg text-center'>Share with the link below:</p>
        <div
          className="mt-2 w-[92vw] max-w-100 mx-auto bg-white rounded-2xl shadow-lg cursor-pointer hover:shadow-xl transition p-2 py-4 flex items-center gap-2"
          onClick={handleShare}
        >
          <img
            className="w-16 h-16 rounded-lg object-cover"
            src="/letterform-logo.webp"
          />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Share My Cruise!</h3>
            <p className="text-sm text-gray-600">See who else is coming and invite your friends!</p>
          </div>
          <button
            className="ml-auto bg-blue-500 text-white px-2 py-1 rounded-lg text-sm hover:bg-blue-600"
            onClick={(e) => {
              e.stopPropagation(); // Prevents triggering main share event
              handleSMSShare();
            }}
          >
            <span className="text-3xl">📱</span> SMS
          </button>
          <button
            className="ml-auto bg-blue-500 text-white px-2 py-1 rounded-lg text-sm hover:bg-blue-600"
            onClick={(e) => {
              e.stopPropagation(); // Prevents triggering main share event
              handleShare();
            }}
          >
            <span className="text-3xl">📋</span> Share
          </button>
        </div>
      </div>
    </div>
  );
}
