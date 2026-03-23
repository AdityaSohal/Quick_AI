import React, { useState } from 'react';
import Markdown from 'react-markdown'

const CreationItems = ({ item }) => {
  const [expanded, setExpanded] = useState(false);
  const isImage = item.type === 'image';

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      className='p-4 max-w-5xl text-sm bg-white border border-gray-200 rounded-lg cursor-pointer'
    >
      <div className='flex justify-between items-center gap-4'>
        <div>
          <h2>{item.prompt}</h2>
          <p className='text-gray-500'>
            {item.type} - {new Date(item.created_at).toLocaleDateString()}
          </p>
        </div>
        <button
          className='bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E40AF] px-4 py-1 rounded-full shrink-0'
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
        >
          {item.type}
        </button>
      </div>

      {expanded && (
        <div className='mt-3'>
          {isImage ? (
            <img
              src={item.content}
              alt='generated'
              className='w-full max-w-md rounded'
            />
          ) : (
            <div className='max-h-64 overflow-y-auto text-sm text-slate-700'>
              <div className='reset-tw'>
                <Markdown>{item.content}</Markdown>
              </div>
            </div>
          )}
        </div>
      )}

      {!expanded && !isImage && (
        <div className='mt-3 max-h-40 overflow-y-auto text-sm text-slate-700'>
          <div className='reset-tw'>
            <Markdown>{item.content}</Markdown>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreationItems;