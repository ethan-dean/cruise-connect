import { useState, useContext } from "react";
import { Navigate } from "react-router-dom";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

import { ProfileDoneContext } from '../contexts/ProfileDoneContext';
import fetchWithAuth from "../utils/fetchWithAuth";
import getBackendUrl from "../utils/getBackendUrl";
import "../css/JoinCruisePage.css";


const socialSites = [ 'instagram', 'snapchat', 'tiktok', 'twitter', 'facebook' ];

// TODO: Add ability to go back in steps...
export default function ProfileCreatePage() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [bio, setBio] = useState<string>('');
  const [socialHandles, setSocialHandles] = useState<Record<string, string>>({});

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const [showCalendar, setShowCalendar] = useState(true);
  const [showBio, setShowBio] = useState(false);
  const [showHandles, setShowHandles] = useState(false);
  const [showPictureSelector, setShowPictureSelector] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const { isProfileDone, checkIfProfileDone } = useContext(ProfileDoneContext);
  if (isProfileDone) {
    return <Navigate to='/dashboard' />;
  }

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

      if (!response.ok) throw new Error("Upload failed");

      // Get the processed image as a blob
      const blob = await response.blob();
      const objectURL = URL.createObjectURL(blob);
      setPreviewImage(objectURL);
    } catch (error) {
      setGeneralError("Error uploading file");
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
              onChange={(date) => setSelectedDate(date)}
            />
          </LocalizationProvider>
          <button
            className='profile-create-page__next-button' 
            onClick={() => { setShowCalendar(false); setShowBio(true); } }
          >
            Next
          </button>
        </div>
      )}

      {showBio && (
        <div>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
          <button
            className='profile-create-page__previous-button' 
            onClick={() => { setShowBio(false); setShowCalendar(true); } }
          >
            Previous
          </button>
          <button
            className='profile-create-page__next-button' 
            onClick={() => { setShowBio(false); setShowHandles(true); } }
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
              {s}:
              <input
                type='text'
                value={socialHandles[s] || ''}
                onChange={(e) => handleSocialChange(s, e.target.value)}
              />
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
          >
            Next
          </button>
        </div>
      )}

      {showPictureSelector && (
        <div>
          <h2>Upload Profile Picture</h2>
            <input type="file" accept="image/*" onChange={handleFileChange} />
            { 
              // <button onClick={handleUpload}>Upload</button> 
            } 

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
              <p key={index}>{platform}: {handle}</p>
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

      <p>{generalError}</p>
    </div>
  );
}
