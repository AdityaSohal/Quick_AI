import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { assets } from '../assets/assets';
import { ArrowRight } from 'lucide-react';
import { useClerk, UserButton, useUser } from '@clerk/clerk-react';
import { useGenerateImage } from '../contexts/GenerateImageContext';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  const { openSignIn } = useClerk();
  const { publish, setPublish } = useGenerateImage();

  const isGenerateImagesPage = location.pathname === '/ai/generate-images';

  return (
    <div className="fixed z-5 w-full backdrop-blur-2xl flex justify-between items-center py-3 px-4 sm:px-20 xl:px-32">
      <img
        src={assets.logo}
        alt="logo"
        className="w-24 sm:w-44 cursor-pointer"
        onClick={() => navigate('/')}
      />
      <div className="flex items-center gap-4">
        {isGenerateImagesPage && user && (
          <div className="flex items-center gap-2 sm:hidden">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
              <div className="relative">
                <input
                  type="checkbox"
                  onChange={(e) => setPublish(e.target.checked)}
                  checked={publish}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-300 rounded-full peer-checked:bg-green-500 transition"></div>
                <span className="absolute left-1 top-0.5 w-4 h-4 bg-white rounded-full transition peer-checked:translate-x-5"></span>
              </div>
              <span className="text-xs">Public</span>
            </label>
          </div>
        )}
        {user ? (
          <UserButton className="hidden sm:block" />
        ) : (
          <button
            onClick={openSignIn}
            className="hidden sm:flex items-center gap-2 rounded-full text-sm cursor-pointer bg-primary text-white px-10 py-2.5"
          >
            Get Started
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default Navbar;
