"use client";

import Image from "next/image";
import React from "react";

function Dashboard() {
  return (
    <div className="flex w-full h-screen">
      {/* Sidebar container */}
      <div className="bg-[#1c1a2e] w-[220px] flex flex-col border-r-[1px] border-r-[#252240]">
        {/* Outer logo container */}
        <div className="h-[75px] flex items-center justify-center">
          {/* Inner logo container */}
          <div className="h-[32px] w-[177px]">
            
            {/* Logo */}
            <div className="flex items-center">
              <Image
                src="/assets/Icon.jpg"
                alt="ReadMeMaybe logo"
                width={32}
                height={32}
                className="h-[32px] w-[32px] rounded-[8px]"
                unoptimized
                priority
              />
              
              <span className="mx-4 text-[20px] font-mono">
                ReadMeMaybe
              </span>
            </div>
          </div>
        </div>

        {/* // Sidebar items container */}
        <div className="flex-1">

        </div>

        {/* // User profile container */}
        <div className="h-[75px]">

        </div>
      </div>

      {/* // Main content container */}
      <div className="bg-[#13111e] flex-1">

      </div>
    </div>
  );
}
export default Dashboard;
