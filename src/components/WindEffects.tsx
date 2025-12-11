import React from 'react';

const WindEffects = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-10 overflow-hidden">
      {/* Lá xanh bay */}
      {[...Array(6)].map((_, i) => (
        <div
          key={`leaf-${i}`}
          className="absolute text-2xl"
          style={{
            left: `${10 + i * 15}%`,
            animation: `leaf-fall-1 ${12 + i * 3}s linear infinite`,
            animationDelay: `${i * 2}s`,
          }}
        >
          🍃
        </div>
      ))}
      
      {/* Lá vàng bay */}
      {[...Array(4)].map((_, i) => (
        <div
          key={`leaf2-${i}`}
          className="absolute text-xl"
          style={{
            left: `${5 + i * 25}%`,
            animation: `leaf-fall-2 ${15 + i * 4}s linear infinite`,
            animationDelay: `${i * 3 + 1}s`,
          }}
        >
          🍂
        </div>
      ))}
      
      {/* Cánh hoa hồng bay */}
      {[...Array(8)].map((_, i) => (
        <div
          key={`petal-${i}`}
          className="absolute text-lg opacity-80"
          style={{
            left: `${i * 12}%`,
            animation: `petal-float ${10 + i * 2}s ease-in-out infinite`,
            animationDelay: `${i * 1.5}s`,
          }}
        >
          🌸
        </div>
      ))}
      
      {/* Hoa nhỏ bay */}
      {[...Array(5)].map((_, i) => (
        <div
          key={`flower-${i}`}
          className="absolute text-sm"
          style={{
            left: `${20 + i * 18}%`,
            animation: `petal-float ${14 + i * 3}s ease-in-out infinite`,
            animationDelay: `${i * 2.5 + 2}s`,
          }}
        >
          🌺
        </div>
      ))}
    </div>
  );
};

export default WindEffects;
