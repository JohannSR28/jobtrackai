export default function Hero() {
  return (
    <div className="flex flex-col xl:flex-row min-h-screen w-full relative z-10 pt-16">
      {/* Left Section */}
      <div className="flex-1 flex items-center p-[30px] sm:p-[40px] md:p-[60px] xl:p-[80px] xl:pr-[60px]">
        <div>
          <h1 className="text-[42px] sm:text-[56px] xl:text-[65px] font-bold leading-[0.92] mb-[30px] tracking-[-2px] xl:tracking-[-3.5px] max-w-full xl:max-w-[580px] text-black">
            ALL YOUR JOB APPLICATIONS IN ONE PLACE
          </h1>

          <p className="text-[16px] sm:text-[18px] xl:text-[20px] text-[#333] mb-[40px] max-w-[480px] leading-[1.6]">
            Automatically track your applications from start to finish on one
            simple platform.
          </p>

          <div className="flex flex-col sm:flex-row gap-[12px] sm:gap-[20px] items-start sm:items-center">
            <button className="px-6 py-4 text-[13px] sm:text-base font-semibold rounded-full border-none cursor-pointer transition-all duration-300 bg-brand-orange text-black hover:bg-brand-orange-hover hover:-translate-y-0.5 shadow-lg shadow-orange-500/20">
              START NOW FOR FREE
            </button>

            <a
              href="#"
              className="inline-flex items-center justify-center px-6 py-4 text-[13px] sm:text-base font-semibold rounded-full cursor-pointer transition-all duration-300 bg-transparent text-black border-2 border-black hover:bg-black hover:text-white group"
            >
              Learn more
              <span className="ml-[5px] group-hover:translate-x-1 transition-transform">
                →
              </span>
            </a>
          </div>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex-1 flex items-center justify-center p-[30px] xl:p-[30px] xl:pl-[10px] w-full">
        <div className="w-full max-w-[825px] xl:max-w-[1100px] aspect-[4/3] bg-[#e8e8e8] rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.1)]"></div>
      </div>
    </div>
  );
}