import { useState, useEffect, useContext } from "react";
import { Navigate } from "react-router-dom";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { differenceInYears, isFuture, isValid } from "date-fns";

import { ProfileDoneContext } from '../contexts/ProfileDoneContext';
import getTitleCase from "../utils/getTitleCase";
import fetchWithAuth from "../utils/fetchWithAuth";
import getBackendUrl from "../utils/getBackendUrl";
import filterProfanity from "../utils/filterProfanity";
import Loading from "../modules/loadingModule/Loading";


const socialSites = [ 'instagram', 'snapchat', 'tiktok', 'twitter', 'facebook' ];

export default function ProfileCreatePage() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [bio, setBio] = useState<string>('');
  const [socialHandles, setSocialHandles] = useState<Record<string, string>>({});
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [firstName, setFirstName] = useState<string | null>(null);
  const [lastName, setLastName] = useState<string | null>(null);

  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [bioError, setBioError] = useState<string | null>(null);
  const [socialErrors, setSocialErrors] = useState<Record<string, string>>({});
  const [imageError, setImageError] = useState<string | null>(null);

  const [showCalendar, setShowCalendar] = useState(true);
  const [showBio, setShowBio] = useState(false);
  const [showHandles, setShowHandles] = useState(false);
  const [showPictureSelector, setShowPictureSelector] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const { isProfileDone, checkIfProfileDone } = useContext(ProfileDoneContext);

  useEffect(() => {
    getUserProfileData();
  }, []);

  if (isProfileDone) {
    return <Navigate to='/dashboard' />;
  }

  const validateCalendar = (date: Date | null): string => {
    const minAge: number = 15;
    const maxAge: number = 120;

    if (date) {
      if (!isValid(date)) return "Birthday must be valid date";
      if (isFuture(date)) return "Birthday cannot be in the future";

      const age: number = differenceInYears(new Date(), date);
      if (age < minAge) return `Age cannot be less than ${minAge} years`;
      if (age > maxAge) return `Age cannot be over ${maxAge} years`;
    }

    return "";
  };

  const validateBio = (currentBio: string | null): string => {
    const maxLength: number = 60;

    if (currentBio) {
      if (currentBio.length < 1) return "Bio required";
      if (currentBio.length > maxLength) return `Max length ${maxLength} characters`;
      if (filterProfanity(currentBio) !== currentBio) return "Let's keep it clean...";
    }

    return "";
  };

  const validateHandle = (handle: string): string => {
   const maxLength: number = 60;

    if (handle) {
      if (handle.length > maxLength) return `Max length ${maxLength} characters`;
      if (filterProfanity(handle) !== handle) return "No profanity in usernames...";
    }

    return "";
  };

  const handleSocialChange = (platform: string, value: string) => {
    setSocialHandles((prevState) => ({
      ...prevState,
      [platform]: value,
    }));
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    // Handle file selection
    if (!event.target.files) return;

    const formData = new FormData();
    formData.append("image", event.target.files[0]);

    // Upload profile picture and display processed image
    try {
      const response = await fetchWithAuth(`${getBackendUrl()}/api/v1/users/upload-profile-picture`, {
          method: "POST",
          body: formData
      });

      if (!response.ok) {
        setImageError("Upload failed");
      }

      // Get the processed image as a blob
      const blob = await response.blob();
      const objectURL = URL.createObjectURL(blob);
      setPreviewImage(objectURL);
    } catch (error) {
      setImageError("Error uploading file");
    }
  };

  const getUserProfileData = async () => {
    try {
      const response = await fetchWithAuth(`${getBackendUrl()}/api/v1/users/get-user-profile`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        // Most values in data will be null since we are filling them out now,
        // but should have first and last from register
        setFirstName(data.firstName);
        setLastName(data.lastName);
      } else {
        const data = await response.json();
        console.log(data.message || 'Server connection error, try again later...');
      }
    } catch (error) {
      console.log('Server connection error, try again later... ');
    };
  };

  const updateProfile = async () => {
    try {
      const response = await fetchWithAuth(`${getBackendUrl()}/api/v1/users/update-user-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          birthDate: selectedDate?.toISOString().split('T')[0],
          bio: bio,
          ...socialHandles
        }),
      });

      if (response.ok) {
        // Will navigate back to dashboard since it will check off profile as being done.
        // If you use navigate here it will try to redirect to beginning of this page,
        // since it will finish before checkProfileIsDone() will.
        checkIfProfileDone();
      } else {
        const data = await response.json();
        console.log(data.message || 'Server connection error, try again later...');
      }
    } catch (error) {
      console.log('Server connection error, try again later...');
    }
  }

  return (
    <div className='mx-2'>
      <h1 className='mt-5 text-center text-2xl font-bold'>Let's Create your Profile!</h1>

      {showCalendar && (
        <div className='mt-5 flex flex-col items-center justify-center'>
          <div className='h-[20vh]'>
            <h2 className='mb-1 text-lg font-semibold'>Date of Birth:</h2>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  sx={{ 
                    width: '240px',
                    height: '80px',    
                    '& .MuiInputBase-root': {
                      height: '100%', // Ensure the input field container fills the height
                    },
                    '& .MuiInputBase-input': {
                      fontSize: '18px', // Increase font size
                    },
                    '& .MuiOutlinedInput-root': {
                      height: '100%', // Ensure the outlined variant respects the height
                      '& fieldset': {
                        borderColor: 'var(--color-gray-400)', // Default outline color to match rest
                      },
                    },
                  }}
                  value={selectedDate}
                  onChange={(date) => {
                    setSelectedDate(date);
                    setCalendarError(validateCalendar(date));
                  }}
                />
              </LocalizationProvider>
            {calendarError && <p className='mt-1 text-sm text-red-700'>{calendarError}</p>}
          </div>

          <div className='mt-4 flex justify-around gap-10'>
            <button
              className='w-25 px-3 py-1.5 bg-blue-400 rounded-md text-lg font-semibold text-white disabled:text-gray-200 disabled:bg-gray-400' 
              disabled={true}
            >
              Previous
            </button>
            <button
              className='w-25 px-3 py-1.5 bg-blue-400 rounded-md text-lg font-semibold text-white disabled:text-gray-200 disabled:bg-gray-400'
              onClick={() => { setShowCalendar(false); setShowBio(true); } }
              disabled={!!calendarError || !selectedDate}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {showBio && (
        <div className='mt-5 flex flex-col items-center justify-center'>
          <div className='w-60 h-[20vh]'>
            <h2 className='text-lg font-semibold'>Bio:</h2>
            <textarea
              className='mt-1 w-60 h-20 p-1 border-1 border-gray-400 rounded-sm'
              value={bio}
              onChange={(e) => {
                setBio(e.target.value);
                setBioError(validateBio(e.target.value));
              }}
              placeholder='Something about yourself...'
            />
            {bioError && <p className='mt-1 text-sm text-red-700'>{bioError}</p>}
          </div>

          <div className='mt-4 flex justify-around gap-10'>
            <button
              className='w-25 px-3 py-1.5 bg-blue-400 rounded-md text-lg font-semibold text-white' 
              onClick={() => { setShowBio(false); setShowCalendar(true); } }
            >
              Previous
            </button>
            <button
              className='w-25 px-3 py-1.5 bg-blue-400 rounded-md text-lg font-semibold text-white disabled:text-gray-200 disabled:bg-gray-400' 
              onClick={() => { setShowBio(false); setShowHandles(true); } }
              disabled={!!bioError || !bio}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {showHandles && (
        <div className='mt-5 flex flex-col items-center justify-center'>
          <div className='w-80'>
            <h2 className='text-lg font-semibold'>Add Social Handles:</h2>
            {socialSites.map((s, idx) => (
              <div
                key={idx}
                className='mt-1 flex'
              >
                <p className='w-25 text-lg'>{getTitleCase(s)}:</p>
                <p className='w-5 text-end'>@</p>
                <div className='flex flex-col justify-start'>
                  <input
                    className='w-50 h-[3vh] p-1 border-1 border-gray-400 rounded-sm'
                    type='text'
                    value={socialHandles[s] || ''}
                    onChange={(e) => { 
                      handleSocialChange(s, e.target.value);
                      setSocialErrors((prev) => ({ ...prev, [s]: validateHandle(e.target.value) }));
                    }}
                  />
                  {socialErrors[s] && <p className='mt-1 text-sm text-red-700'>{socialErrors[s]}</p>}
                </div>
              </div>
            ))}
          </div>

          <div className='mt-4 flex justify-around gap-10'>
            <button
              className='w-25 px-3 py-1.5 bg-blue-400 rounded-md text-lg font-semibold text-white' 
              onClick={() => { setShowHandles(false); setShowBio(true); } }
            >
              Previous
            </button>
            <button
              className='w-25 px-3 py-1.5 bg-blue-400 rounded-md text-lg font-semibold text-white disabled:text-gray-200 disabled:bg-gray-400' 
              onClick={() => { setShowHandles(false); setShowPictureSelector(true); } }
              disabled={Object.values(socialErrors).some(e => !!e) ||
                        Object.values(socialHandles).every(h => !h || h.length === 0) ||
                        Object.entries(socialHandles).length === 0}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {showPictureSelector && (
        <div className='mt-5'>
          <div className='h-[15vh]'>
            <h2 className='text-xl font-semibold w-60'>Upload Profile Picture:</h2>
            <label className='relative top-[3vh] w-40 py-1.5 px-2.5 bg-blue-400 rounded-full text-lg text-white font-semibold' htmlFor="pictureUpload">
              Choose Picture
            </label>
            <input className='hidden' id='pictureUpload' type="file" accept="image/*" onChange={e => { setImageError(null); handleFileChange(e); } } />
            {imageError && <p className='profile-create-page__error'>{imageError}</p>}
          </div>

          {previewImage && (
            <>
              <h3 className='text-xl font-semibold'>Profile Picture Preview</h3>
              <img className='w-[calc(100vw-16px)] rounded-md' src={previewImage} alt="Image Preview" />
            </>
          )}

          <div className='mt-4 mx-auto w-60 flex justify-around gap-10'>
            <button
              className='w-25 px-3 py-1.5 bg-blue-400 rounded-md text-lg font-semibold text-white' 
              onClick={() => { setShowPictureSelector(false); setShowHandles(true); } }
            >
              Previous
            </button>
            <button
              className='w-25 px-3 py-1.5 bg-blue-400 rounded-md text-lg font-semibold text-white disabled:text-gray-200 disabled:bg-gray-400' 
              onClick={() => { setShowPictureSelector(false); setShowSummary(true); } }
              disabled={!!imageError || !previewImage}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {showSummary && (!(firstName && lastName) ? (<Loading />) : (
        <div>
          {previewImage && <img className='w-[calc(100vw-16px)] rounded-md' src={previewImage} alt="Image Preview" /> }
          <div className='flex justify-between'>
            <p className='text-2xl font-semibold'>{`${firstName} ${lastName}`}</p>
            <p className='text-2xl font-semibold'>{differenceInYears(new Date(), selectedDate!)}</p>
          </div>
          <p className='text-xl'>{bio}</p> 
          <div className='-mx-1 flex flex-wrap'>
            {socialSites.map((s, idx) => { 
              if (!!socialHandles[s]) {
                return (
                  <p className='m-1 w-fit px-[6px] py-[2px] border-2 border-solid border-black rounded-full' key={idx}>
                    {getTitleCase(s)}: @{socialHandles[s] || ''} 
                  </p>
                );
              }
              return null;
            })}
          </div>

          <div className='mt-4 flex justify-around gap-10'>
            <button
              className='w-25 px-3 py-1.5 bg-blue-400 rounded-md text-lg font-semibold text-white' 
              onClick={() => { setShowSummary(false); setShowPictureSelector(true); } }
            >
              Previous
            </button>
            <button
              className='w-25 px-3 py-1.5 bg-blue-400 rounded-md text-lg font-semibold text-white disabled:text-gray-200 disabled:bg-gray-400' 
              onClick={() => updateProfile() }
            >
              Save
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
