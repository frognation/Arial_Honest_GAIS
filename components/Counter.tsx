import React from 'react';

interface CounterProps {
  count: number;
}

const Counter: React.FC<CounterProps> = ({ count }) => {
  return (
    <div className="absolute top-8 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div
        className="font-bold text-stroke-black-thin transition-colors duration-300 font-sans tracking-tighter"
        style={{ color: '#FF8C00', fontSize: '12rem' }}
      >
        {count}
      </div>
    </div>
  );
};

export default Counter;
