import { Shield, Radar, Target } from 'lucide-react';

const Header = () => {
  return (
    <header className="relative w-full py-6 px-8 bg-gradient-to-r from-defense-navy via-defense-card to-defense-navy border-b border-defense-blue/30 shadow-defense-card">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Shield className="w-12 h-12 text-defense-blue" />
              <div className="absolute inset-0 w-12 h-12 border-2 border-defense-blue rounded-full animate-radar-pulse opacity-30" />
            </div>
            <div>
              <h1 className="text-3xl font-orbitron font-bold text-defense-blue">
                BHARAT RAKSHA
              </h1>
              <p className="text-defense-gray text-sm font-rajdhani">
                Advanced Threat Detection System
              </p>
            </div>
          </div>
          
          {/* Status Indicators */}
          <div className="flex items-center space-x-6">
            <div className="status-indicator">
              <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-defense-green/20 border border-defense-green/30">
                <Radar className="w-5 h-5 text-defense-green animate-spin" />
                <span className="text-defense-green font-rajdhani font-semibold">ACTIVE</span>
              </div>
            </div>
            
            <div className="status-indicator">
              <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-defense-orange/20 border border-defense-orange/30">
                <Target className="w-5 h-5 text-defense-orange" />
                <span className="text-defense-orange font-rajdhani font-semibold">READY</span>
              </div>
            </div>
            
            <div className="status-indicator">
              <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-defense-blue/20 border border-defense-blue/30">
                <div className="w-3 h-3 bg-defense-blue rounded-full animate-pulse" />
                <span className="text-defense-blue font-rajdhani font-semibold">SECURED</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Decorative cyber elements */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-defense-blue via-defense-blue/50 to-defense-blue opacity-60" />
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-defense-blue/50 via-defense-blue to-defense-blue/50 opacity-40" />
      
      {/* Subtle grid pattern overlay */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `
          linear-gradient(rgba(0, 212, 255, 0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 212, 255, 0.1) 1px, transparent 1px)
        `,
        backgroundSize: '20px 20px'
      }} />
    </header>
  );
};

export default Header;