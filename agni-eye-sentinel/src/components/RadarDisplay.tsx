
const RadarDisplay = () => {
  return (
    <div className="fixed top-4 right-4 z-10 opacity-30 pointer-events-none">
      <div className="relative w-24 h-24">
        {/* Radar rings */}
        <div className="radar-ring w-full h-full" />
        <div className="radar-ring w-3/4 h-3/4 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
        <div className="radar-ring w-1/2 h-1/2 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
        <div className="radar-ring w-1/4 h-1/4 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
        
        {/* Center dot */}
        <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-defense-green rounded-full transform -translate-x-1/2 -translate-y-1/2" />
        
        {/* Radar sweep */}
        <div className="absolute top-1/2 left-1/2 w-12 h-0.5 bg-defense-green origin-left transform -translate-y-1/2 animate-spin" />
        
        {/* Threat indicators */}
        <div className="absolute top-1/4 right-1/4 w-1 h-1 bg-defense-red rounded-full animate-pulse" />
        <div className="absolute bottom-1/3 left-1/3 w-1 h-1 bg-defense-orange rounded-full animate-pulse" />
      </div>
    </div>
  );
};

export default RadarDisplay;
