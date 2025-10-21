import { Heart, Upload, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

// Set base URL
axios.defaults.baseURL = import.meta.env.VITE_BASE_URL;

const Community = () => {
  const [creations, setCreations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageDescription, setImageDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [likedCreations, setLikedCreations] = useState(new Set());
  const { user } = useUser();
  const { getToken } = useAuth();

  const fetchCreations = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const { data } = await axios.get('/api/user/get-published-creations', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (data.success) {
        setCreations(data.creations);
        // Initialize liked creations based on is_liked field from backend
        const likedSet = new Set();
        data.creations.forEach(creation => {
          if (creation.is_liked) {
            likedSet.add(creation.id);
          }
        });
        setLikedCreations(likedSet);
      } else {
        console.error('Failed to fetch creations:', data.message);
        setCreations([]);
      }
    } catch (error) {
      console.error('Error fetching creations:', error);
      setCreations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCreations();
    }
  }, [user]);

  const handleLike = async (creationId) => {
    try {
      const token = await getToken();
      const { data } = await axios.post(
        '/api/user/toggle-like-creations',
        { creationId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (data.success) {
        // Update local state
        const newLikedCreations = new Set(likedCreations);
        if (data.liked) {
          newLikedCreations.add(creationId);
        } else {
          newLikedCreations.delete(creationId);
        }
        setLikedCreations(newLikedCreations);

        // Update the creation's like count in the list
        setCreations(prevCreations => 
          prevCreations.map(creation => {
            if (creation.id === creationId) {
              return {
                ...creation,
                like_count: data.liked 
                  ? (creation.like_count || 0) + 1
                  : Math.max((creation.like_count || 0) - 1, 0),
                is_liked: data.liked
              };
            }
            return creation;
          })
        );

        toast.success(data.message);
      } else {
        toast.error(data.message || 'Failed to like/unlike creation');
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Failed to like/unlike creation');
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size should be less than 10MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      setSelectedImage(file);
    }
  };

  const handlePostImage = async () => {
    if (!selectedImage) {
      toast.error('Please select an image');
      return;
    }

    if (!imageDescription.trim()) {
      toast.error('Please add a description');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('image', selectedImage);
      formData.append('description', imageDescription.trim());

      const token = await getToken();
      const { data } = await axios.post(
        '/api/community/post-image',
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (data.success) {
        toast.success('Image posted successfully!');
        setShowUploadModal(false);
        setSelectedImage(null);
        setImageDescription('');
        // Refresh the creations list
        fetchCreations();
      } else {
        toast.error(data.message || 'Failed to post image');
      }
    } catch (error) {
      console.error('Error posting image:', error);
      const errorMessage = error.response?.data?.message || 'Failed to post image. Please try again.';
      toast.error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className='flex-1 h-full flex flex-col gap-4 p-6'>
             <div className='flex justify-between items-center'>
         <h1 className='text-2xl font-bold text-gray-800'>Community Creations</h1>
       </div>
      
      <div className='bg-white h-full w-full rounded-xl overflow-y-scroll p-4'>
        {loading ? (
          <div className='flex justify-center items-center py-10'>
            <div className='text-gray-400'>Loading creations...</div>
          </div>
        ) : creations.length === 0 ? (
          <p className='text-center text-gray-400 py-10'>No public creations yet. Be the first to share!</p>
        ) : (
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
            {creations.map((creation) => (
              <div key={creation.id} className='relative group bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow'>
                {/* Image */}
                <div className='aspect-square overflow-hidden'>
                  <img 
                    src={creation.content} 
                    alt={creation.prompt || 'Community creation'} 
                    className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-200'
                  />
                </div>
                
                {/* Overlay with prompt and like button */}
                <div className='absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity duration-200'>
                  <div className='absolute bottom-0 left-0 right-0 p-3'>
                    {/* Prompt */}
                    <p className='text-white text-sm mb-2 line-clamp-2'>
                      {creation.prompt}
                    </p>

                    {/* Creator info and like button */}
                    <div className='flex items-center justify-between'>
                      <div className='text-white text-xs'>
                        {creation.first_name && creation.last_name
                          ? `${creation.first_name} ${creation.last_name}`
                          : 'Anonymous'
                        }
                      </div>

                      {/* Like button */}
                      <button
                        onClick={() => handleLike(creation.id)}
                        className='flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-full px-2 py-1 hover:bg-white/30 transition-colors'
                      >
                        <Heart
                          className={`w-4 h-4 ${
                            likedCreations.has(creation.id)
                              ? 'fill-red-500 text-red-500'
                              : 'text-white'
                          }`}
                        />
                        <span className='text-white text-xs'>
                          {creation.like_count || 0}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
                
                
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Image Upload Modal */}
      {showUploadModal && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-white rounded-lg p-6 w-full max-w-md mx-4'>
            <div className='flex justify-between items-center mb-4'>
              <h2 className='text-xl font-semibold'>Post Image to Community</h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className='text-gray-500 hover:text-gray-700'
              >
                <X className='w-5 h-5' />
              </button>
            </div>
            
            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Select Image
                </label>
                <input
                  type='file'
                  accept='image/*'
                  onChange={handleImageUpload}
                  className='w-full p-2 border border-gray-300 rounded-lg'
                />
              </div>
              
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Description
                </label>
                <textarea
                  value={imageDescription}
                  onChange={(e) => setImageDescription(e.target.value)}
                  placeholder='Describe your creation...'
                  rows={3}
                  className='w-full p-2 border border-gray-300 rounded-lg resize-none'
                />
              </div>
              
              {selectedImage && (
                <div className='flex justify-center'>
                  <img
                    src={URL.createObjectURL(selectedImage)}
                    alt='Preview'
                    className='max-w-full max-h-48 rounded-lg'
                  />
                </div>
              )}
              
              <div className='flex gap-3'>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className='flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50'
                >
                  Cancel
                </button>
                <button
                  onClick={handlePostImage}
                  disabled={uploading || !selectedImage || !imageDescription.trim()}
                  className={`flex-1 px-4 py-2 rounded-lg text-white ${
                    uploading || !selectedImage || !imageDescription.trim()
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
                  }`}
                >
                  {uploading ? 'Posting...' : 'Post Image'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Community;
