import { Image, Download } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import { useGenerateImage } from '../contexts/GenerateImageContext';

// Set base URL
axios.defaults.baseURL = import.meta.env.VITE_BASE_URL;

const GenerateImages = () => {
  const imageStyle = [
    'Realistic', 'Ghibli style', 'Anime style', 'Cartoon style', 'Fantasy Style', '3D style', 'Portrait style', 'Photorealistic'
  ];

  const [selectedStyle, setSelectedStyle] = useState('Realistic');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState('');
  const { getToken } = useAuth();
  const { publish, setPublish } = useGenerateImage();

  const onSubmitHandler = async (e) => {
    e.preventDefault();

    if (!input.trim()) {
      toast.error('Please describe the image you want to generate');
      return;
    }

    try {
      setLoading(true);
      const prompt = `${input} in ${selectedStyle} style`;

      const token = await getToken();
      const { data } = await axios.post(
        '/api/ai/generate-images',
        {
          prompt,
          publish: publish, // Send the publish status to backend
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (data.success) {
        setGeneratedImage(data.content);
        toast.success('Image generated successfully!');
        // Show additional message if image is public
        if (publish) {
          toast.success('Image has been made public and will appear in the community!');
        }
      } else {
        toast.error(data.message || 'Failed to generate image');
      }
    } catch (error) {
      console.error('Error generating image:', error);
      const errorMessage = error.response?.data?.message || 'Failed to generate image. Please try again later.';
      toast.error(errorMessage);
      setGeneratedImage('');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadImage = async () => {
    try {
      const response = await fetch(generatedImage);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-generated-image-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Image downloaded successfully!');
    } catch (error) {
      console.error('Error downloading image:', error);
      toast.error('Failed to download image');
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
          <Image className='w-6 text-[#00AD25]' />
          <h1 className='text-xl font-semibold'>AI Image Generator</h1>
        </div>

        <p className='mt-6 text-sm font-medium'>Describe Your Image</p>
        <textarea
          rows={4}
          onChange={(e) => setInput(e.target.value)}
          value={input}
          className='w-full p-2 px-3 mt-2 outline-none text-sm rounded-md border border-gray-300'
          placeholder='Describe What You Want To See In The Image'
          required
        />

        <p className='mt-4 text-sm font-medium'>Style</p>
        <div className='mt-3 flex gap-3 flex-wrap'>
          {imageStyle.map((item) => (
            <span
              key={item}
              onClick={() => setSelectedStyle(item)}
              className={`text-xs px-4 py-1 border rounded-full cursor-pointer ${
                selectedStyle === item
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'text-gray-500 border-gray-300'
              }`}
            >
              {item}
            </span>
          ))}
        </div>

        {/* Toggle public image */}
        <div className='mt-6 flex items-center gap-3'>
          <label className='flex items-center gap-2 cursor-pointer text-sm text-slate-700'>
            <div className='relative'>
              <input
                type='checkbox'
                onChange={(e) => setPublish(e.target.checked)}
                checked={publish}
                className='sr-only peer'
              />
              <div className='w-10 h-5 bg-slate-300 rounded-full peer-checked:bg-green-500 transition'></div>
              <span className='absolute left-1 top-0.5 w-4 h-4 bg-white rounded-full transition peer-checked:translate-x-5'></span>
            </div>
            <span>Make this image public</span>
          </label>
        </div>

        <button
          type='submit'
          disabled={loading}
          className={`w-full flex justify-center items-center gap-2 ${
            loading
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-gradient-to-r from-[#00AD25] to-[#04FF50] cursor-pointer'
          } text-white px-4 py-2 mt-6 text-sm rounded-lg`}
        >
          <Image className='w-5' />
          {loading ? 'Generating...' : 'Generate Image'}
        </button>
      </form>

      {/* right col */}
      <div className='w-full max-w-lg p-4 bg-white rounded-lg flex flex-col border border-gray-200 min-h-96'>
        <div className='flex items-center gap-3 mb-4'>
          <Image className='w-5 h-5 text-[#00AD25]' />
          <h1 className='text-xl font-semibold'>Generated Image</h1>
        </div>

        {generatedImage ? (
          <div className='flex-1 flex flex-col'>
            <div className='flex-1 flex justify-center items-center mb-4'>
              <img 
                src={generatedImage} 
                alt="Generated AI Image" 
                className='max-w-full max-h-80 object-contain rounded-lg shadow-lg'
              />
            </div>
            
            {/* Download button */}
            <button
              onClick={handleDownloadImage}
              className='w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors'
            >
              <Download className='w-4 h-4' />
              Download Image
            </button>
          </div>
        ) : (
          <div className='flex-1 flex justify-center items-center'>
            <div className='text-sm flex flex-col items-center gap-5 text-gray-400'>
              <Image className='w-9 h-9' />
              <p>Describe your image and click on "Generate Image" to get started.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GenerateImages;
