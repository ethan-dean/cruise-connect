import { useState, useContext } from "react";
import { Navigate } from "react-router-dom";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { differenceInYears, isFuture, isValid } from "date-fns";

import { ProfileDoneContext } from '../contexts/ProfileDoneContext';
import fetchWithAuth from "../utils/fetchWithAuth";
import getBackendUrl from "../utils/getBackendUrl";
import filterProfanity from "../utils/filterProfanity";


const socialSites = [ 'instagram', 'snapchat', 'tiktok', 'twitter', 'facebook' ];

export default function ProfileCreatePage() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [bio, setBio] = useState<string>('');
  const [socialHandles, setSocialHandles] = useState<Record<string, string>>({});
  const [previewImage, setPreviewImage] = useState<string | null>(null);

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
      if (filterProfanity(handle) !== handle) return "No accounts with profane usernames...";
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
    <div className='profile-create-page__container'>
      <h1 className='profile-create-page__title'>Create Profile</h1>

      {showCalendar && (
        <div>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              value={selectedDate}
              onChange={(date) => {
                setSelectedDate(date);
                setCalendarError(validateCalendar(date));
              }}
            />
          </LocalizationProvider>
          {calendarError && <p className='profile-create-page__error'>{calendarError}</p>}

          <button
            className='profile-create-page__next-button' 
            onClick={() => { setShowCalendar(false); setShowBio(true); } }
            disabled={!!calendarError || !selectedDate}
          >
            Next
          </button>
        </div>
      )}

      {showBio && (
        <div>
          <textarea
            value={bio}
            onChange={(e) => {
              setBio(e.target.value);
              setBioError(validateBio(e.target.value));
            }}
          />
          {bioError && <p className='profile-create-page__error'>{bioError}</p>}

          <button
            className='profile-create-page__previous-button' 
            onClick={() => { setShowBio(false); setShowCalendar(true); } }
          >
            Previous
          </button>
          <button
            className='profile-create-page__next-button' 
            onClick={() => { setShowBio(false); setShowHandles(true); } }
            disabled={!!bioError || !bio}
          >
            Next
          </button>
        </div>
      )}

      {showHandles && (
        <div>
          {socialSites.map((s, idx) => (
            <div
              key={idx}
              className='profile-create-page__handle-container'
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}:
              <input
                type='text'
                value={socialHandles[s] || ''}
                onChange={(e) => { 
                  handleSocialChange(s, e.target.value);
                  setSocialErrors((prev) => ({ ...prev, [s]: validateHandle(e.target.value) }));
                }}
              />
              {socialErrors[s] && <p className='profile-create-page__error'>{socialErrors[s]}</p>}
            </div>
          ))}

          <button
            className='profile-create-page__previous-button' 
            onClick={() => { setShowHandles(false); setShowBio(true); } }
          >
            Previous
          </button>
          <button
              className='profile-create-page__next-button' 
              onClick={() => { setShowHandles(false); setShowPictureSelector(true); } }
              disabled={Object.values(socialErrors).some(e => !!e) ||
                        Object.values(socialHandles).every(h => !h || h.length === 0) ||
                        Object.entries(socialHandles).length === 0}
          >
            Next
          </button>
        </div>
      )}

      {showPictureSelector && (
        <div>
          <h2>Upload Profile Picture</h2>
          <input type="file" accept="image/*" onChange={handleFileChange} />
          {imageError && <p className='profile-create-page__error'>{imageError}</p>}

          {previewImage && (
            <>
              <h3>Processed Image Preview</h3>
              <img src={previewImage} alt="Processed Preview" width={256} />
            </>
          )}

          <button
            className='profile-create-page__previous-button' 
            onClick={() => { setShowPictureSelector(false); setShowHandles(true); } }
          >
            Previous
          </button>
          <button
            className='profile-create-page__next-button' 
            onClick={() => { setShowPictureSelector(false); setShowSummary(true); } }
            disabled={!!imageError || !previewImage}
          >
            Next
          </button>
        </div>
      )}

      {showSummary && (
        <div>
          {previewImage && (
            <>
              <p>Processed Image Preview</p>
              <img src={previewImage} alt="Processed Preview" width={256} />
            </>
          )}
          <p>{selectedDate!.toDateString()}</p>
          <p>{bio}</p>
          {Object.entries(socialHandles).map(([platform, handle], index) => { 
            return (
              <p key={index}>{platform.charAt(0).toUpperCase() + platform.slice(1)}: {handle}</p>
            )
          })}
          <button
            className='profile-create-page__previous-button' 
            onClick={() => { setShowSummary(false); setShowPictureSelector(true); } }
          >
            Previous
          </button>
          <button
            className='profile-create-page__save-button' 
            onClick={() => updateProfile() }
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
}
