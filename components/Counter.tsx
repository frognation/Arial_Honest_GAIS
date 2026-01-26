import React from 'react';

interface CounterProps {
  count: number;
}

const Counter: React.FC<CounterProps> = ({ count }) => {
  let colorClass = 'text-green-500';
  
  if (count > 100) {
    colorClass = 'text-red-600 animate-pulse';
  } else if (count > 10) {
    colorClass = 'text-yellow-400';
  }

  return (
    <div className="absolute top-8 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div 
        className={`text-8xl font-bold ${colorClass} text-stroke-black-thin transition-colors duration-300 font-sans tracking-tighter`}
      >
        {count}
      </div>
    </div>
  );
};

export default Counter;