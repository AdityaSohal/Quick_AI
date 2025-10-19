import { Scissors, Sparkles } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

// Set base URL
axios.defaults.baseURL = import.meta.env.VITE_BASE_URL;

const RemoveObject = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [object, setObject] = useState('');
  const [loading, setLoading] = useState(false);
  const [processedImage, setProcessedImage] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [imageLoading, setImageLoading] = useState(false);
  const { getToken } = useAuth();

  // Clear preview when a new file is selected
  useEffect(() => {
    if (selectedFile) {
      const objectUrl = URL.createObjectURL(selectedFile);
      setPreviewUrl(objectUrl);
      
      // Clean up the URL when component unmounts or file changes
      return () => URL.revokeObjectURL(objectUrl);
    }
  }, [selectedFile]);

  // Add a timestamp to Cloudinary URL to prevent caching issues
  const getUncachedUrl = (url) => {
    if (!url) return '';
    // Check if the URL is a Cloudinary URL
    if (url.includes('cloudinary.com')) {
      // For Cloudinary URLs, add the timestamp as a transformation parameter
      // Fix the double slash issue and ensure proper URL construction
      const parts = url.split('/upload/');
      if (parts.length === 2) {
        // Ensure we don't add double slashes
        return `${parts[0]}/upload/t_${Date.now()}/${parts[1].replace(/^\/+/, '')}`;
      }
    }
    // For other URLs, add as a query parameter
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${new Date().getTime()}`;
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error('File size should be less than 10MB');
        return;
      }
      setSelectedFile(file);
      setProcessedImage(''); // Clear any previous processed image
    }
  };

  const onSubmitHandler = async (e) => {
    e.preventDefault();

    if (!selectedFile) {
      toast.error('Please select an image file');
      return;
    }

    if (!object.trim()) {
      toast.error('Please describe the object to remove');
      return;
    }

    try {
      setLoading(true);
      setProcessedImage(''); // Clear any previous processed image
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('object', object.trim());

      const token = await getToken();
      const { data } = await axios.post(
        '/api/ai/remove-object',
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (data.success) {
        toast.success('Object removed successfully!');
      } else {
        alert(data.message || 'Failed to remove object');
      }
    } catch (error) {
      console.error('Error removing object:', error);
      const errorMessage =
        error.response?.data?.message || 'Failed to remove object. Please try again later.';
      toast.error(errorMessage);
      setProcessedImage('');
    } finally {
      setLoading(false);
    }
  };

  // Function to verify if an image URL is valid
  const verifyImageUrl = (url) => {
    return new Promise((resolve) => {
      if (!url) {
        resolve(false);
        return;
      }
      
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
      
      // Set a timeout in case the image takes too long to load
      setTimeout(() => resolve(false), 5000);
    });
  };

  // Debug function to analyze Cloudinary URL structure
  const debugCloudinaryUrl = (url) => {
    if (!url) {
      console.log('URL is empty');
      return;
    }
    
    console.log('Analyzing URL:', url);
    
    if (url.includes('cloudinary.com')) {
      console.log('✅ URL contains cloudinary.com');
      
      const parts = url.split('/upload/');
      console.log('URL parts after splitting by /upload/:', parts);
      
      if (parts.length === 2) {
        console.log('✅ URL has correct base structure');
        console.log('Base URL:', parts[0]);
        console.log('Transformation and public ID part:', parts[1]);
        
        // Check for double slashes
        if (parts[1].startsWith('/')) {
          console.log('⚠️ Warning: Double slash detected after /upload/');
        }
        
        // Check for transformation parameters
        if (parts[1].includes('gen_removal')) {
          console.log('✅ URL contains gen_removal transformation');
        } else {
          console.log('⚠️ Warning: gen_removal transformation not found');
        }
      } else {
        console.log('⚠️ Warning: URL does not have expected /upload/ structure');
      }
    } else {
      console.log('⚠️ Warning: URL does not contain cloudinary.com');
    }
  };

  // Function to retry loading the image if it fails
  const retryLoadImage = () => {
    if (processedImage) {
      setImageLoading(true);
      // For Cloudinary URLs, create a completely new URL with a new timestamp
      if (processedImage.includes('cloudinary.com')) {
        // Parse the URL more carefully to avoid double slashes
        const urlParts = processedImage.split('/upload/');
        if (urlParts.length === 2) {
          // Extract the transformation part and public ID correctly
          const publicIdParts = urlParts[1].split('/');
          // The last part should be the public ID
          const publicId = publicIdParts[publicIdParts.length - 1];
          // Reconstruct the URL with proper formatting
          const newUrl = `${urlParts[0]}/upload/t_${Date.now()}/e_gen_removal:${object}/f_auto,q_auto/${publicId}`;
          console.log('Retrying with URL:', newUrl);
          setProcessedImage(newUrl);
          return;
        }
      }
      // Fallback for non-Cloudinary URLs
      const newUrl = getUncachedUrl(processedImage.split('?')[0]);
      console.log('Retrying with URL:', newUrl);
      setProcessedImage(newUrl);
    }
  };

  return (
    <div className='h-full overflow-y-scroll p-6 flex items-start flex-wrap gap-4 text-slate-700'>
      {/* left col */}
      <form
        onSubmit={onSubmitHandler}
        className='w-full max-w-lg p-4 bg-white rounded-lg border border-gray-200'
      >
        <div className='flex items-center gap-3 mb-4'>
          <Sparkles className='w-6 text-[#4A7AFF]' />
          <h1 className='text-xl font-semibold'>AI Object Removal</h1>
        </div>

        <p className='mt-6 text-sm font-medium'>Describe Object Name To Remove</p>
        <textarea
          rows={4}
          onChange={(e) => setObject(e.target.value)}
          value={object}
          className='w-full p-2 px-3 mt-2 outline-none text-sm rounded-md border border-gray-300'
          placeholder='e.g., watch or spoon, Only single object name'
          required
        />

        <p className='mt-4 text-sm font-medium'>Upload Image</p>
        <input
          onChange={handleFileChange}
          accept='image/*'
          type='file'
          className='w-full p-2 px-3 mt-2 outline-none text-sm rounded-md border border-gray-300 text-gray-600'
          required
        />
        <p className='text-xs text-gray-500 font-light mt-1'>Supports jpeg, png and other image formats (Max 10MB)</p>

        {previewUrl && (
          <div className='mt-4'>
            <p className='text-sm font-medium mb-2'>Preview:</p>
            <img 
              src={previewUrl} 
              alt="Preview" 
              className='max-w-full max-h-60 object-contain rounded-lg border border-gray-200' 
            />
          </div>
        )}

        <button
          type='submit'
          disabled={loading || !selectedFile || !object.trim()}
          className={`w-full flex justify-center items-center gap-2 ${
            loading || !selectedFile || !object.trim()
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-gradient-to-r from-[#417DF6] to-[#8E37EB] cursor-pointer'
          } text-white px-4 py-2 mt-6 text-sm rounded-lg`}
        >
          <Scissors className='w-5' />
          {loading ? 'Processing...' : 'Remove Object'}
        </button>
      </form>

      {/* right col */}
      <div className='w-full max-w-lg p-4 bg-white rounded-lg flex flex-col border border-gray-200 min-h-96'>
        <div className='flex items-center gap-3 mb-4'>
          <Scissors className='w-5 h-5 text-[#4A7AFF]' />
          <h1 className='text-xl font-semibold'>Processed Image</h1>
        </div>

        {processedImage ? (
          <div className='flex-1 flex justify-center items-center flex-col'>
            {imageLoading && (
              <div className='mb-4 text-sm text-gray-500'>Loading processed image...</div>
            )}
            <img
              src={processedImage}
              alt="Processed Image"
              className='max-w-full max-h-80 object-contain rounded-lg shadow-lg'
              onLoad={() => setImageLoading(false)}
              onError={(e) => {
                console.error('Image failed to load:', processedImage);
                setImageLoading(false);
                e.target.onerror = null;
                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjZjVmNWY1Ii8+PHRleHQgeD0iMTIiIHk9IjEyIiBmb250LXNpemU9IjEyIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBhbGlnbm1lbnQtYmFzZWxpbmU9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmaWxsPSIjYWFhYWFhIj5JbWFnZSBFcnJvcjwvdGV4dD48L3N2Zz4=';
                toast.error('Failed to load the processed image');
              }}
              style={{ display: imageLoading ? 'none' : 'block' }}
            />
            {!imageLoading && (
              <button 
                onClick={retryLoadImage}
                className="mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300"
              >
                Reload Image
              </button>
            )}
          </div>
        ) : (
          <div className='flex-1 flex justify-center items-center'>
            <div className='text-sm flex flex-col items-center gap-5 text-gray-400'>
              <Scissors className='w-9 h-9' />
              <p>Upload an image and click on "Remove Object" to get started.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RemoveObject;