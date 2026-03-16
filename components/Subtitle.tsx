import React from 'react';
import { TextSegment } from '../types';

interface SubtitleProps {
  segments: TextSegment[];
}

const Subtitle: React.FC<SubtitleProps> = ({ segments }) => {
  if (!segments.length) return null;

  return (
    <div className="absolute bottom-[10%] left-0 right-0 z-40 flex justify-center pointer-events-none px-12">
      <p
        className="text-white text-4xl md:text-6xl font-sans text-center font-bold leading-tight text-stroke-black drop-shadow-md max-w-4xl"
        style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
      >
        {segments.map((seg, i) => (
          seg.isTransformed ? (
            <span key={i} style={{ color: '#FF8C00' }}>{seg.text}</span>
          ) : (
            <span key={i}>{seg.text}</span>
          )
        ))}
      </p>
    </div>
  );
};

export default Subtitle;
