"use client";

import React from "react";

export function AnimatedAIBackground() {
  return (
    <div
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none select-none bg-gradient-to-br from-[#DCCBFF] via-[#EAE1FF] to-[#F3ECFF]"
      aria-hidden="true"
    >
      {/* Large Soft Glows */}
      <div className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] max-w-[800px] max-h-[800px] rounded-full bg-gradient-to-br from-[#6842FF]/30 to-transparent blur-[100px] animate-orb opacity-70" />
      <div
        className="absolute top-[30%] -right-[20%] w-[80vw] h-[80vw] max-w-[900px] max-h-[900px] rounded-full bg-gradient-to-tl from-[#5135F5]/25 via-[#6842FF]/10 to-transparent blur-[120px] animate-orb"
        style={{ animationDelay: "2s" }}
      />
      <div
        className="absolute -bottom-[30%] left-[20%] w-[60vw] h-[60vw] max-w-[700px] max-h-[700px] rounded-full bg-gradient-to-tr from-[#6842FF]/20 via-[#8B5CF6]/15 to-transparent blur-[90px] animate-orb"
        style={{ animationDelay: "4s" }}
      />

      {/* Floating 3D-like Spheres (simulated with CSS gradients and drop shadows) */}
      <div className="absolute top-[15%] left-[5%] w-16 h-16 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#5135F5] shadow-[0_0_30px_rgba(104,66,255,0.4)] opacity-80 animate-[float_6s_ease-in-out_infinite]" />
      <div className="absolute top-[60%] left-[15%] w-24 h-24 rounded-full bg-gradient-to-br from-[#A78BFA] to-[#6842FF] shadow-[0_0_40px_rgba(104,66,255,0.3)] opacity-60 animate-[float_8s_ease-in-out_infinite_1s]" />
      <div className="absolute bottom-[10%] right-[25%] w-32 h-32 rounded-full bg-gradient-to-tr from-[#8B5CF6] to-[#5135F5] shadow-[0_0_50px_rgba(104,66,255,0.5)] opacity-90 animate-[float_7s_ease-in-out_infinite_2s]" />
      <div className="absolute top-[20%] right-[10%] w-12 h-12 rounded-full bg-gradient-to-br from-[#C4B5FD] to-[#8B5CF6] shadow-[0_0_20px_rgba(104,66,255,0.3)] opacity-70 animate-[float_5s_ease-in-out_infinite_0.5s]" />

      {/* Elegant SVG Neural Network / Connecting Lines */}
      <svg
        className="absolute inset-0 w-full h-full opacity-60"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="lineGradPurple" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#EAE1FF" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.6" />
          </linearGradient>
        </defs>

        <g stroke="url(#lineGradPurple)" strokeWidth="1.5">
          {/* Subtle connecting lines mimicking the reference image */}
          <path d="M 0,200 Q 150,250 300,100 T 600,300" fill="none" opacity="0.3" />
          <path d="M 0,400 Q 200,350 400,500 T 800,400" fill="none" opacity="0.2" />
          <path d="M 400,0 Q 500,200 700,150 T 1200,300" fill="none" opacity="0.25" />
          
          {/* Neural dots */}
          <circle cx="150" cy="225" r="3" fill="#FFFFFF" opacity="0.8" />
          <circle cx="300" cy="100" r="4" fill="#FFFFFF" opacity="0.9" />
          <circle cx="450" cy="200" r="2.5" fill="#FFFFFF" opacity="0.7" />
          
          <circle cx="200" cy="375" r="3" fill="#FFFFFF" opacity="0.8" />
          <circle cx="400" cy="500" r="4" fill="#FFFFFF" opacity="0.9" />
          <circle cx="600" cy="450" r="3" fill="#FFFFFF" opacity="0.7" />

          <circle cx="500" cy="100" r="3" fill="#FFFFFF" opacity="0.8" />
          <circle cx="700" cy="150" r="4" fill="#FFFFFF" opacity="0.9" />
          <circle cx="950" cy="225" r="3" fill="#FFFFFF" opacity="0.7" />
        </g>
      </svg>
      
      {/* Light streaks/ribbons in the background */}
      <div className="absolute top-[40%] -left-[10%] w-[120%] h-32 bg-white/10 blur-[40px] transform -rotate-12 pointer-events-none" />
      <div className="absolute top-[60%] -left-[10%] w-[120%] h-40 bg-white/15 blur-[50px] transform rotate-6 pointer-events-none" />
    </div>
  );
}
