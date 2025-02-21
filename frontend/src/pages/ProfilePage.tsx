import { useState, useEffect, useContext } from "react";
import { differenceInYears, parseISO } from "date-fns";
import { useNavigate } from "react-router-dom";
import heic2any from "heic2any";

import { AuthContext } from "../contexts/AuthContext";
import fetchWithAuth from "../utils/fetchWithAuth";
import getBackendUrl from "../utils/getBackendUrl";
import getTitleCase from "../utils/getTitleCase";
import filterProfanity from "../utils/filterProfanity";
import Loading from "../modules/loadingModule/Loading";
import missingImage from "../assets/missing-image.jpg";


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
  { /* const [previewImage, setPreviewImage] = useState<string | null>(null); */ }

  const [bioError, setBioError] = useState<string | null>(null);
  const [socialErrors, setSocialErrors] = useState<Record<string, string>>({});
  const [imageError, setImageError] = useState<string | null>(null);

  const [showEditMode, setShowEditMode] = useState<boolean>(false);
  const [showImagePopup, setShowImagePopup] = useState<boolean>(false);
  const [showConfirm, setShowConfirm] = useState<boolean>(false);
  const [imageCacheBuster, setImageCacheBuster] = useState<number>(Date.now());

  const [numImagesLoaded, setNumImagesLoaded] = useState<number>(0);
  const [numImages, _setNumImages] = useState<number>(1);

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

    const file: Blob = event.target.files[0];
    const formData = new FormData();

    if (file.type === 'image/heic' || file.type === 'image/heif') {
      // Convert HEIC to PNG or JPEG using heic2any in the browser
      try {
        const convertedBlob = await heic2any({
          blob: file,
          toType: 'image/jpeg',
          quality: 0.20,
        });
        if (convertedBlob instanceof Blob) {
          const convertedFile = new File([convertedBlob], 'convertedImage.jpeg', { type: 'image/jpeg' });
          if (file.size > 8 * 1024 * 1024) {
            setImageError('File too large, must be smaller than 8 MB');
            return;
          }
          formData.append('image', convertedFile);
        } else {
          setImageError('Unexpected conversion result');
          return;
        }
      } catch (err: any) {
        setImageError('Upload image error: Error converting image to jpeg');
        return;
      }
    } else if (file.type === 'image/jpeg' || file.type === 'image/png') {
      // This needs to be set in nginx as well, to allow requests 
      // greater than the default size 1 MB.
      if (file.size > 8 * 1024 * 1024) {
        setImageError('File too large, must be smaller than 8 MB');
        return;
      }
      formData.append('image', file);
    } else {
      setImageError('File must be a JPEG, PNG, or HEIC/HEIF');
      return;
    }

    // Upload profile picture and display processed image
    try {
      const response = await fetchWithAuth(`${getBackendUrl()}/api/v1/users/upload-profile-picture`, {
          method: "POST",
          body: formData
      });

      if (!response.ok) {
        try {
          const data = await response.json();
          setImageError(data.error || "Upload failed");
        } catch (error) {
          setImageError("Upload response failed");
        }
        return;
      }

      // Get the processed image as a blob
      // const blob = await response.blob();
      // const objectURL = URL.createObjectURL(blob);
      // setPreviewImage(objectURL);
      
      // Don't need to get the processed image as a blob just 
      // cache bust with the url for the profile picture 
      setImageCacheBuster(Date.now());

      // If made it this far, upload succeeded close the profile picture popup
      setShowImagePopup(false);
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

  return !userData ? (<Loading />) : (
    <div className='sm:max-w-160 mx-auto'>
      {(numImagesLoaded < numImages) && <Loading />}
      <div className={`mt-5 relative ${(numImagesLoaded < numImages) ? 'hidden' : 'block'}`}>
        <input className='peer/accountMenu absolute top-2 right-2 w-6 h-6 z-40 opacity-0' type='checkbox' />
        <div className='invisible peer-checked/accountMenu:visible absolute top-2 right-2 w-50 flex flex-col items-start bg-white p-2 border-2 border-gray-300 rounded-md'>
          <button className='w-45 mt-1 px-2 text-left text-lg font-semibold' onClick={logoutAccount}>Log out</button>
          <button className='w-45 mt-1 pt-2 px-2 border-t-2 border-t-gray-300 text-left text-lg text-red-700 font-semibold' onClick={() => setShowConfirm(true)}>Delete Account</button>
        </div>
        <svg className='invisible peer-checked/accountMenu:visible absolute top-3 right-3' xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#000000"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg>

        <div className='mx-2 max-w-100 flex justify-between items-center'>
          <h1 className='text-2xl font-bold'>Account</h1>
          <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#000000"><path d="M480-160q-33 0-56.5-23.5T400-240q0-33 23.5-56.5T480-320q33 0 56.5 23.5T560-240q0 33-23.5 56.5T480-160Zm0-240q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Zm0-240q-33 0-56.5-23.5T400-720q0-33 23.5-56.5T480-800q33 0 56.5 23.5T560-720q0 33-23.5 56.5T480-640Z"/></svg>
        </div>
        <p className='mx-2 max-w-100'>Email: {userData.email}</p>

        {showConfirm && (
          <div className='absolute top-0 right-0 w-screen h-screen flex justify-center items-center z-50 bg-black/50'>
            <div className='w-[80vw] bg-white p-5 rounded-md text-center shadow-md'>
              <p className='mb-5 text-xl'>Are you sure you want to delete your account?<br/><br/>This action cannot be undone.</p>
              <button className='m-1 px-5 py-2 bg-red-700 text-white font-semibold text-xl rounded-md cursor-pointer' onClick={deleteAccount}>Yes</button>
              <button className='m-1 px-5 py-2 bg-gray-500 text-white font-semibold text-xl rounded-md cursor-pointer' onClick={() => setShowConfirm(false)}>No</button>
            </div>
          </div>
        )}

        <div className='mt-5 mx-2 max-w-100 flex justify-between items-center'>
          <h1 className='text-2xl font-bold'>Profile</h1>
          {!showEditMode ? (
            <button className='' onClick={() => setShowEditMode(true)}> 
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#000000"><path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"/></svg>
            </button>
          ) : (
            <span/>
          )}
        </div>

        <button className='mt-1 mx-2 w-[calc(100vw-16px)] max-w-100 relative' onClick={() => setShowImagePopup(true)}>
          <img className='w-[calc(100vw-16px)] max-w-100 rounded-md' 
               src={`${getBackendUrl()}/profilePictureDb/${userData.imageId}.webp?cache=${imageCacheBuster}`} 
               onError={(e) => e.currentTarget.src = missingImage } 
               onLoad={() => setNumImagesLoaded(prev => prev + 1) } 
          />
          {(numImagesLoaded >= numImages) && 
            <div className='absolute bottom-0 h-[calc(50vw-8px)] max-h-50 w-[calc(100vw-16px)] max-w-100 flex justify-center items-center rounded-t-[calc(50vw-8px)] rounded-b-md bg-black/60 text-white text-3xl font-semibold'>
              <p className='w-[calc(70vw-8px)] max-w-75'>
                Click to change picture.
              </p>
            </div>
          }
        </button>

        {showImagePopup && (
          <div className='fixed top-0 right-0 w-screen h-screen flex justify-center items-center z-50 bg-black/50'>
            <div className='bg-white w-[90vw] max-w-120 h-[17vh] p-5 rounded-lg'>
              <div className='flex justify-between'>
                <h2 className='text-xl font-semibold'>Update Profile Picture</h2>
                <button onClick={() => { setShowImagePopup(false); setImageError(null); } } >
                  <svg className='' xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#000000"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg>
                </button>
              </div>
              <label className='relative top-[3vh] w-40 py-1.5 px-2.5 bg-blue-400 rounded-full text-lg text-white font-semibold' htmlFor="pictureUpload">Choose New Picture</label>
              <input className='hidden' id='pictureUpload' type="file" accept="image/*" onChange={e => { setImageError(null); handleFileChange(e); } } />
              {imageError && <p className='mt-9 ml-1 text-sm text-red-700'>{imageError}</p>}

              {
              // TODO: Implement previews before saving profile picture change
              // <h3>Processed Image Preview</h3>
              // {previewImage && ( <img src={previewImage} alt="Processed Preview" /> )}
              // {!previewImage && ( <img src={missingImage} alt="Processed Preview" /> )}
              }
            </div>
          </div>
        )}

        <div className='mx-2 max-w-100 flex justify-between'>
          <p className='text-2xl font-semibold'>{`${userData.firstName} ${userData.lastName}`}</p>
          <p className='text-2xl font-semibold'>{differenceInYears(new Date(), parseISO(userData.birthDate))}</p>
        </div>
        <div className='max-w-100'>
          {!showEditMode ? (
            <>
              <p className='mx-2 text-xl'>{bio}</p> 
              <div className='mx-1 flex flex-wrap'>
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
                    {bioError && <p className='mt-1 text-sm text-red-700'>{bioError}</p>}
                  </div>

                  <div className=''>
                    {socialSites.map((s, idx) => (
                      <div key={idx} className='mt-1 w-fit px-[6px] py-[2px] border-2 border-solid border-black rounded-full'>
                        {getTitleCase(s)}: @
                        <input
                          className='border-2 border-blue-400 rounded-md hover:border-blue-700'
                          type='text'
                          value={socialHandles[s] || ''}
                          onChange={(e) => { 
                            handleSocialChange(s, e.target.value);
                            setSocialErrors((prev) => ({ ...prev, [s]: validateHandle(e.target.value) }));
                          }}
                        />
                        {socialErrors[s] && <p className='mt-1 text-sm text-red-700'>{socialErrors[s]}</p>}
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
                  { /* TODO: Add a cancel button when editing here */ }
                </div>
              </div>
              <div className='h-10'/>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
