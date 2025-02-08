import { useState, useEffect, useContext } from "react";
import { differenceInYears, parseISO } from "date-fns";
import { useNavigate } from "react-router-dom";

import { AuthContext } from "../contexts/AuthContext";
import fetchWithAuth from "../utils/fetchWithAuth";
import getBackendUrl from "../utils/getBackendUrl";
import getTitleCase from "../utils/getTitleCase";
import filterProfanity from "../utils/filterProfanity";
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
  const [showConfirm, setShowConfirm] = useState<boolean>(false);
  const [imageCacheBuster, setImageCacheBuster] = useState<number>(Date.now());

  const navigate = useNavigate();
  const { logout } = useContext(AuthContext);

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
      // Don't need to get the processed image as a blob just 
      // cache bust with the url for the profile picture 
      setImageCacheBuster(Date.now());
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

  const logoutAccount = async () => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/v1/users/logout`, {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        logout();
        navigate('/');
      } else {
        const data = await response.json();

        console.log(data.message || 'Server connection error, try again later...');
      }
    } catch (error) {
      console.log('Server connection error, try again later...');
    }
  }

  const deleteAccount = async () => {
    try {
      const response = await fetchWithAuth(`${getBackendUrl()}/api/v1/users/delete-user`, {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        logout();
        navigate('/');
      } else {
        const data = await response.json();
        console.log(data.message || 'Server connection error, try again later...');
      }
    } catch (error) {
      console.log('Server connection error, try again later...');
    }
  };

  return !userData ? (null) : (
    <div className='mt-5'>
      <input className='peer/accountMenu fixed top-[calc(8vh+24px)] right-2 w-6 h-6 z-[100] opacity-0' type='checkbox' />
      <div className='invisible peer-checked/accountMenu:visible fixed top-[calc(8vh+24px)] right-2 w-50 flex flex-col items-start bg-white p-2 border-2 border-gray-300 rounded-md'>
        <button className='w-45 mt-1 px-2 text-left text-lg font-semibold' onClick={logoutAccount}>Log out</button>
        <button className='w-45 mt-1 pt-2 px-2 border-t-2 border-t-gray-300 text-left text-lg text-red-700 font-semibold' onClick={() => setShowConfirm(true)}>Delete Account</button>
      </div>
      <svg className='invisible peer-checked/accountMenu:visible fixed top-[calc(8vh+32px)] right-4' xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#000000"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg>

      <div className='mx-2 flex justify-between items-center'>
        <h1 className='text-2xl font-bold'>Account</h1>
        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#000000"><path d="M480-160q-33 0-56.5-23.5T400-240q0-33 23.5-56.5T480-320q33 0 56.5 23.5T560-240q0 33-23.5 56.5T480-160Zm0-240q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Zm0-240q-33 0-56.5-23.5T400-720q0-33 23.5-56.5T480-800q33 0 56.5 23.5T560-720q0 33-23.5 56.5T480-640Z"/></svg>
      </div>
      <p className='mx-2'>Email: {userData.email}</p>

      {showConfirm && (
        <div className="overlay">
          <div className="confirm-popup">
            <p>Are you sure you want to delete your account? This action cannot be undone.</p>
            <button className="confirm-popup__yes" onClick={deleteAccount}>Yes</button>
            <button className="confirm-popup__no" onClick={() => setShowConfirm(false)}>No</button>
          </div>
        </div>
      )}

      <input id='profileMenu' className='peer/profileMenu fixed top-[calc(8vh+100px)] right-2 w-6 h-6 z-[100] opacity-0' type='checkbox' />
      <div className='invisible peer-checked/profileMenu:visible fixed top-[calc(8vh+100px)] right-2 w-50 flex flex-col items-start bg-white p-2 border-2 border-gray-300 rounded-md'>
        <button className='w-45 px-2 text-left text-lg font-semibold' onClick={() => { 
          setShowEditMode(true); 
          const checkbox = document.getElementById('profileMenu') as HTMLInputElement;
          if (checkbox) {
            checkbox.checked = false;
          }
        }}>
          Edit
        </button>
      </div>
      <svg className='invisible peer-checked/profileMenu:visible fixed top-[calc(8vh+108px)] right-4' xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#000000"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg>

      <div className='mt-5 mx-2 flex justify-between items-center'>
        <h1 className='text-2xl font-bold'>Profile</h1>
        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#000000"><path d="M480-160q-33 0-56.5-23.5T400-240q0-33 23.5-56.5T480-320q33 0 56.5 23.5T560-240q0 33-23.5 56.5T480-160Zm0-240q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Zm0-240q-33 0-56.5-23.5T400-720q0-33 23.5-56.5T480-800q33 0 56.5 23.5T560-720q0 33-23.5 56.5T480-640Z"/></svg>
      </div>

      <button className='mt-1 mx-2 w-[calc(100vw-16px)]' onClick={() => setShowImagePopup(true)}>
        <img className='rounded-md' src={`${getBackendUrl()}/profilePictureDb/${userData.imageId}.webp?cache=${imageCacheBuster}`} />
      </button>
      <div className='mx-2 flex justify-between'>
        <p className='text-2xl font-semibold'>{`${userData.firstName} ${userData.lastName}`}</p>
        <p className='text-2xl font-semibold'>{differenceInYears(new Date(), parseISO(userData.birthDate))}</p>
      </div>
      <div>
        {!showEditMode ? (
          <>
            <p className='mx-2 text-xl'>{bio}</p> 
            <div className='mx-1 flex flex-wrap'>
              {socialSites.map((s, idx) => { 
                if (!!socialHandles[s]) {
                  return (
                    <p className='m-1 w-fit px-[6px] py-[2px] border-2 border-solid border-black rounded-full' key={idx}>
                      {getTitleCase(s)}: {socialHandles[s] || ''} 
                    </p>
                  );
                }
                return null;
              })}
            </div>
          </>
        ) : (
          <>
            <div className='mx-2 flex items-start'>
              <div className='w-[calc(80vw-16px)]'>
                <div className='text-xl'>
                  <textarea
                    className='w-full border-2 border-blue-400 rounded-md hover:border-blue-700'
                    value={bio}
                    onChange={(e) => {
                      setBio(e.target.value);
                      setBioError(validateBio(e.target.value));
                    }}
                  />
                  {bioError && <p className='profile-create-page__error'>{bioError}</p>}
                </div>

                <div className=''>
                  {socialSites.map((s, idx) => (
                    <div key={idx} className='mt-1 w-fit px-[6px] py-[2px] border-2 border-solid border-black rounded-full'>
                      {getTitleCase(s)}:
                      <input
                        className='border-2 border-blue-400 rounded-md hover:border-blue-700'
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
              </div>

              <div className='w-[calc(20vw)]'>
                <button
                  className='mx-2 py-1 px-2 bg-blue-400 rounded-full text-lg text-white font-semibold' 
                  onClick={() => { updateProfile(); setShowEditMode(false); } }
                >
                  Save
                </button>
              </div>
            </div>

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
