'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function GetStartedPage() {
  const router = useRouter()
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    // Start animation after component mounts
    setIsAnimating(true)
  }, [])

  const handleGetStarted = () => {
    router.push('/login')
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-sky-200 via-blue-300 to-indigo-400">
      {/* Floating decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating circles/petals */}
        <div className="absolute top-20 right-20 w-16 h-16 bg-white/30 rounded-full blur-sm animate-float-slow" />
        <div className="absolute top-40 right-40 w-12 h-12 bg-white/40 rounded-full blur-sm animate-float-medium" />
        <div className="absolute bottom-32 left-20 w-20 h-20 bg-white/25 rounded-full blur-sm animate-float-slow" />
        <div className="absolute bottom-20 right-32 w-14 h-14 bg-white/35 rounded-full blur-sm animate-float-medium" />
        <div className="absolute top-1/3 left-10 w-10 h-10 bg-white/30 rounded-full blur-sm animate-float-fast" />
        <div className="absolute top-1/2 right-16 w-8 h-8 bg-white/40 rounded-full blur-sm animate-float-fast" />
      </div>

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4">
        {/* Logo dots decoration */}
        <div className={`flex gap-2 mb-6 transition-all duration-1000 ${isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'}`}>
          <div className="w-4 h-4 bg-teal-600 rounded-full" />
          <div className="w-4 h-4 bg-teal-600 rounded-full" />
          <div className="w-4 h-4 bg-teal-600 rounded-full" />
        </div>

        {/* Company Logo */}
        <div className={`mb-4 transition-all duration-1000 delay-200 ${isAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
          <div className="w-64 h-32 bg-white/90 rounded-2xl flex items-center justify-center shadow-lg">
            <h1 className="text-4xl font-bold text-teal-600">4D BIM</h1>
          </div>
        </div>

        {/* Tagline */}
        <p className={`text-center text-gray-700 text-lg md:text-xl max-w-xl mb-12 transition-all duration-1000 delay-500 ${isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          Advanced 4D Building Information Modeling platform for seamless project management
        </p>

        {/* Feature Cards */}
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full mb-12 transition-all duration-1000 delay-700 ${isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
            <h3 className="font-semibold text-gray-800 text-lg mb-2">4D Simulation</h3>
            <p className="text-gray-600 text-sm">Visualize construction timelines with advanced 4D modeling</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
            <h3 className="font-semibold text-gray-800 text-lg mb-2">Team Collaboration</h3>
            <p className="text-gray-600 text-sm">Work together seamlessly with your project team</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
            <h3 className="font-semibold text-gray-800 text-lg mb-2">Project Management</h3>
            <p className="text-gray-600 text-sm">Manage tasks, schedules, and resources efficiently</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
            <h3 className="font-semibold text-gray-800 text-lg mb-2">Real-time Updates</h3>
            <p className="text-gray-600 text-sm">Stay updated with live project progress tracking</p>
          </div>
        </div>

        {/* Get Started Button */}
        <button
          onClick={handleGetStarted}
          className={`px-12 py-4 bg-teal-600 hover:bg-teal-700 text-white text-lg font-medium rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 ${isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
          style={{ transitionDelay: '900ms' }}
        >
          Get Started →
        </button>
      </div>
    </div>
  )
}
