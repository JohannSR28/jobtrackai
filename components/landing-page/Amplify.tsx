export default function Amplify() {
  return (
    <section className="min-h-screen flex justify-center items-start lg:items-center p-6 pt-20 lg:pt-64 pb-96 relative z-10">
      <div className="max-w-[1200px] w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 relative items-center">
        {/* Center Title */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center text-center relative order-1 lg:order-2 z-0">
          <span className="text-lg text-slate-500 mb-2 relative font-medium">
            floating
          </span>

          <h1 className="font-sans text-[50px] lg:text-[86px] font-bold leading-[0.92] mb-[30px] mt-5 lg:mt-0 tracking-[-2px] lg:tracking-[-3.5px] max-w-full lg:max-w-[580px] text-black relative z-0">
            AMPLIFY<br />
            YOUR<br />
            WORKFLOW
          </h1>
        </div>

        {/* Left Column */}
        <div className="lg:col-span-3 flex flex-col gap-4 order-2 lg:order-1 relative z-20 translate-x-0 lg:translate-x-12 w-full">
          <div className="bg-white rounded-2xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden transform -rotate-2 hover:rotate-0 transition-all duration-500 p-2 w-full">
            <div className="w-full h-64 bg-gray-200 rounded-xl"></div>
          </div>

          <div className="bg-white/65 backdrop-blur-md border border-white/50 shadow-sm rounded-xl p-3 inline-block max-w-[260px]">
            <h3 className="font-bold text-sm uppercase tracking-wide text-slate-800">
              Intelligent Automation
            </h3>
            <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
              Connect your tools and let AI handle repetitive tasks.
            </p>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-3 flex flex-col h-full justify-center order-3 lg:order-3 relative pointer-events-none gap-12 lg:gap-0 w-full">
          {/* Card 2 */}
          <div className="relative z-30 pointer-events-auto ml-0 mt-0 translate-x-0 lg:-ml-40 lg:-mt-32 lg:translate-x-4 w-full">
            <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-2 mb-2 w-full lg:w-64 transform rotate-2 hover:rotate-0 transition-transform duration-500 origin-bottom-left">
              <div className="w-full h-64 lg:h-40 bg-gray-200 rounded-lg"></div>
            </div>

            <div className="bg-white/65 backdrop-blur-md border border-white/50 shadow-sm rounded-xl p-3 inline-block max-w-[260px] ml-0 lg:ml-0">
              <h3 className="font-bold text-sm uppercase tracking-wide">
                Real-time Collab
              </h3>
              <p className="text-[10px] text-slate-500 mt-1">
                Work together seamlessly.
              </p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="relative z-20 pointer-events-auto flex flex-col items-start lg:items-start text-left lg:text-left mt-0 lg:mt-24 ml-0 lg:ml-0 w-full">
            <div className="bg-white rounded-xl shadow-2xl p-2 mb-4 w-full lg:w-[240px] transform hover:scale-105 transition-transform duration-500">
              <div className="w-full h-64 lg:h-48 bg-gray-200 rounded-lg"></div>
            </div>

            <div className="bg-white/65 backdrop-blur-md border border-white/50 shadow-sm rounded-xl p-3 inline-block max-w-[260px]">
              <h3 className="font-bold text-sm uppercase tracking-wide text-slate-900">
                Unified Analytics
              </h3>
              <p className="text-[10px] text-slate-500 mt-1">
                Comprehensive view of metrics.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}