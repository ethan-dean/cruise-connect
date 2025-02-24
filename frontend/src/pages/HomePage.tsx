import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Ship, Users, MapPin, Calendar } from 'lucide-react';

import Loading from '../modules/loadingModule/Loading';
import missingImage from '../assets/missing-image.jpg';


export default function HomePage() {
  const [numGalleryImagesLoaded, setNumGalleryImagesLoaded] = useState<number>(0);
  const galleryImageIds: number[] = [];

  const features = [
    { icon: Ship, title: "Find Your Ship", text: "Connect with passengers on your specific cruise line and sailing date" },
    { icon: Users, title: "Meet New Friends", text: "Match with travelers who share your interests and excursion plans" },
    { icon: MapPin, title: "Plan Together", text: "Organize group activities and shore excursions before you sail" },
    { icon: Calendar, title: "Cruise Events", text: "Join meetups and social gatherings organized by fellow cruisers" }
  ];

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-8 md:py-12">
        {/* Hero Section */}
        <div className="flex flex-col md:flex-row justify-center items-center gap-8">
          <img 
            className='w-full aspect-square bg-blue-800 max-w-sm md:max-w-md rounded-xl shadow-xl'
            src="/combo-logo.webp" 
            alt="Cruise Connect"
          />
          
          <div className="max-w-lg text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-bold mb-6">
              Your Cruise Adventure Starts Before You Board
            </h1>
            <p className="text-base md:text-lg text-gray-700 mb-8">
              Connect with fellow travelers, plan unforgettable experiences, and make lifelong friendships on your next cruise journey.
            </p>
            
            <Link to="/register">
              <button className="w-full md:w-auto px-4 py-2 bg-blue-800 hover:bg-blue-700 active:bg-blue-600 cursor-pointer font-semibold text-white rounded-full text-2xl">
                Join Now
              </button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-16 md:mt-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {features.map((Feature, i) => (
            <div key={i} className="bg-white shadow-lg rounded-lg px-4 pb-2 backdrop-blur-sm border-none">
              <div className="pt-6">
                <Feature.icon className="h-10 w-10 md:h-12 md:w-12 text-blue-800 mb-4" />
                <h2 className="text-lg md:text-xl font-semibold mb-2">{Feature.title}</h2>
                <p className="text-sm md:text-base text-gray-600">{Feature.text}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Image Gallery */}
        <div className="mt-16 md:mt-24">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 md:mb-12">Memories Made at Sea</h2>
          <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4">
            {numGalleryImagesLoaded < galleryImageIds.length && <Loading />}
            <div className={`${numGalleryImagesLoaded < galleryImageIds.length ? 'hidden' : 'block'}`}>
              {galleryImageIds.map((id, i) => (
                <img 
                  key={i}
                  className={`break-inside-avoid min-h-20 w-full bg-blue-400 rounded-lg shadow-lg mb-4`}
                  src={`/home-gallery-${id}.webp`}
                  onLoad={() => setNumGalleryImagesLoaded(prev => prev + 1)}
                  onError={(e) => e.currentTarget.src = missingImage } 
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
