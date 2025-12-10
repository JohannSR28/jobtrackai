'use client';

import { useEffect, useState } from "react";

export default function Footer() {
  const [time, setTime] = useState("--:--:--");

  useEffect(() => {
    const updateTime = () => {
      setTime(new Date().toLocaleTimeString("en-US", { hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <footer className="bg-gen-bg pt-20 pb-10 border-t border-gen-border">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-black rounded flex items-center justify-center text-white font-bold text-lg">
                J
              </div>
              <span className="gen-typo text-2xl tracking-[-1px]">JOBTRACKAI</span>
            </div>
            <div className="font-mono text-xs text-gray-400 bg-gray-200/50 p-3 rounded inline-block">
              <span className="w-2 h-2 bg-green-500 rounded-full inline-block mr-2 animate-pulse"></span>
              SYSTEMS OPERATIONAL • <span>{time}</span> UTC
            </div>
          </div>

          <div>
            <h4 className="font-bold mb-6 text-xs uppercase tracking-widest text-gray-400">
              PRODUIT
            </h4>
            <ul className="space-y-3 text-sm font-bold text-gray-600">
              <li><a href="#" className="hover:text-black">FONCTIONNALITÉS</a></li>
              <li><a href="#" className="hover:text-black">TARIFS</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-6 text-xs uppercase tracking-widest text-gray-400">
              LÉGAL
            </h4>
            <ul className="space-y-3 text-sm font-bold text-gray-600">
              <li><a href="#" className="hover:text-black">CONFIDENTIALITÉ</a></li>
              <li><a href="#" className="hover:text-black">CONDITIONS</a></li>
            </ul>
          </div>
        </div>
        <p className="border-t border-gray-200 pt-8 text-xs text-gray-400 font-medium text-center md:text-left">
          © 2024 JOBTRACKAI. ALL RIGHTS RESERVED.
        </p>
      </div>
    </footer>
  );
}