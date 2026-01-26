import React from 'react';

interface SubtitleProps {
  text: string;
}

const Subtitle: React.FC<SubtitleProps> = ({ text }) => {
  // Always render a container to prevent layout shifts, even if text is empty
  // But strictly, if text is empty, we just return null or empty div.
  if (!text) return null;

  return (
    <div className="absolute bottom-[10%] left-0 right-0 z-40 flex justify-center pointer-events-none px-12">
      <p 
        className="text-white text-3xl md:text-5xl font-sans text-center font-bold leading-tight text-stroke-black drop-shadow-md max-w-4xl"
        style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
      >
        {text}
      </p>
    </div>
  );
};

export default Subtitle;