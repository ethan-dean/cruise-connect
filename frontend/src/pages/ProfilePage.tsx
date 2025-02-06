import { useState, useEffect } from "react";
import { differenceInYears, parseISO } from "date-fns";

import fetchWithAuth from "../utils/fetchWithAuth";
import getBackendUrl from "../utils/getBackendUrl";
import getTitleCase from "../utils/getTitleCase";
import filterProfanity from "../utils/filterProfanity";
import "../css/JoinCruisePage.css";
import missingImage from "../assets/missing-image.jpg"


const socialSites = [ 'instagram', 'snapchat', 'tiktok', 'twitter', 'facebook' ];

interface userProfileType {
  firstName: string;
  lastName: string;
  email: string;
  imageId: string;
  birthDate: string;
  bio: string;
  instagram: string;
  snapchat: string;
  tiktok: string;
  twitter: string;
  facebook: string;
}

export default function ProfileCreatePage() {
  const [userData, setUserData] = useState<userProfileType | null>(null);

  const [bio, setBio] = useState<string>('');
  const [socialHandles, setSocialHandles] = useState<Record<string, string>>({});
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [bioError, setBioError] = useState<string | null>(null);
  const [socialErrors, setSocialErrors] = useState<Record<string, string>>({});
  const [imageError, setImageError] = useState<string | null>(null);

  const [showEditMode, setShowEditMode] = useState<boolean>(false);
  const [showImagePopup, setShowImagePopup] = useState<boolean>(false);

  const getUserProfileData = async () => {
    try {
      const response = await fetchWithAuth(`${getBackendUrl()}/api/v1/users/get-user-profile`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setUserData(data);
        setBio(data.bio);
        Object.entries(data).forEach(([k, v]: [string, any]) => {
          if(socialSites.some((s) => k === s)) {
            setSocialHandles((prevState) => ({
              ...prevState,
              [k]: v
            }))
          }
        });
      } else {
        const data = await response.json();
        console.log(data.message || 'Server connection error, try again later...');
      }
    } catch (error) {
      console.log('Server connection error, try again later... ');
    };
  };

  useEffect(() => {
    getUserProfileData();
  }, []);

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
          bio: bio,
          ...socialHandles
        }),
      });

      if (response.ok) {
        // Do nothing... let user view changes on page.
      } else {
        const data = await response.json();
        console.log(data.message || 'Server connection error, try again later...');
      }
    } catch (error) {
      console.log('Server connection error, try again later...');
    }
  }

  return !userData ? (null) : (
    <div className='profile-create-page__container'>
      <h1 className='profile-create-page__title'>Profile</h1>

      <p>Name: {getTitleCase(userData.firstName)} {getTitleCase(userData.lastName)}</p>
      <p>Email: {userData.email}</p>
      <p>Age: {differenceInYears(new Date(), parseISO(userData.birthDate))}</p>
      <button onClick={() => setShowImagePopup(true)}>
        <img src={`${getBackendUrl()}/profilePictureDb/${userData.imageId}.webp`} />
      </button>
      <div>
        {!showEditMode ? (
          <>
            <button onClick={() => setShowEditMode(true)}>
              <img src={missingImage}/>
            </button>
            <div>
              <p>Bio:{bio}</p> 
            </div>

            <div>
              {socialSites.map((s, idx) => { 
                if (!!socialHandles[s]) {
                  return (
                    <div key={idx} className='profile-create-page__handle-container'>
                      <p>{getTitleCase(s)}: {socialHandles[s] || ''} </p>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </>
        ) : (
          <>
            <button onClick={() => setShowEditMode(false)}>
              <img src={missingImage}/>
            </button>
            <div>
              Bio: 
              <textarea
                value={bio}
                onChange={(e) => {
                  setBio(e.target.value);
                  setBioError(validateBio(e.target.value));
                }}
              />
              {bioError && <p className='profile-create-page__error'>{bioError}</p>}
            </div>

            <div>
              {socialSites.map((s, idx) => (
                <div key={idx} className='profile-create-page__handle-container'>
                  {getTitleCase(s)}:
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
            </div>

            <button
              className='profile-create-page__save-button' 
              onClick={() => { updateProfile(); setShowEditMode(false); } }
            >
              Save
            </button>
          </>
        )}
      </div>

      {showImagePopup && (
        <div>
          <button onClick={() => setShowImagePopup(false)}>
            X
          </button>
          <h2>Upload Profile Picture</h2>
          <input type="file" accept="image/*" onChange={handleFileChange} />
          {imageError && <p className='profile-create-page__error'>{imageError}</p>}

          <h3>Processed Image Preview</h3>
          {previewImage && ( <img src={previewImage} alt="Processed Preview" /> )}
          {!previewImage && ( <img src={missingImage} alt="Processed Preview" /> )}
        </div>
      )}
    </div>
  );
}
