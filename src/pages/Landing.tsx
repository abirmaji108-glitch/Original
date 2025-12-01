import { Button } from "@/components/ui/button";
import { Sparkles, Zap, Shield, TrendingUp, Wand2, Code2, Palette, Smartphone, Globe, Timer, Check, Star, Users, ArrowRight } from "lucide-react";

const Landing = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Bar */}
      <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-md z-50 border-b border-gray-200">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="text-2xl font-bold text-purple-600 flex items-center gap-2">
              <Sparkles className="w-6 h-6" />
              Sento
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => window.location.href = '/#/login'}
              >
                Sign In
              </Button>
              <Button
                onClick={() => window.location.href = '/#/signup'}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                Get Started Free
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-24 bg-white relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-20 left-10 w-72 h-72 bg-purple-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-yellow-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left Column - Content */}
            <div className="space-y-8">
              {/* Badge */}
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-purple-100 to-blue-100 text-sm font-semibold text-purple-700">
                <Zap className="w-4 h-4 mr-2" />
                AI-Powered Website Generation
              </div>
              
              {/* Main Headline */}
              <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent leading-tight">
                Build Stunning Websites in Seconds
              </h1>
              
              {/* Subheadline */}
              <p className="text-xl text-gray-600 leading-relaxed">
                Just describe your vision. Our AI generates professional, responsive websites instantly. 
                No coding required. No design skills needed.
              </p>
              
              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={() => window.location.href = '/#/signup'}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-lg px-8 py-6 h-auto"
                >
                  <Zap className="mr-2 w-5 h-5" />
                  Start Building Free
                </Button>
                <Button
                  onClick={() => window.location.href = '/#/login'}
                  variant="outline"
                  className="text-lg px-8 py-6 h-auto border-2"
                >
                  <Play className="mr-2 w-5 h-5" />
                  Watch Demo
                </Button>
              </div>
              
              {/* Trust Indicators */}
              <div className="flex flex-wrap gap-8 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  <span>10,000+ websites generated</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  <span>5,000+ happy users</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span>4.9/5 average rating</span>
                </div>
              </div>
            </div>
            
            {/* Right Column - Hero Image/Preview */}
            <div className="relative">
              <div className="relative bg-gradient-to-br from-purple-50 to-blue-50 rounded-3xl p-8 shadow-2xl">
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                  <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-4 mb-4">
                    <h3 className="text-white font-semibold">Your AI-Generated Website Preview</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6 animate-pulse"></div>
                  </div>
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Responsive</span>
                      <span className="flex items-center gap-1">
                        <Check className="w-3 h-3 text-green-500" />
                        Ready to Deploy
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full opacity-20 animate-spin-slow"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gray-50 relative overflow-hidden">
        {/* Floating Gradient Orbs */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-r from-purple-200 to-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-float"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-r from-pink-200 to-orange-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-float" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="container mx-auto px-6 relative z-10">
          {/* Section Header */}
          <div className="text-center max-w-4xl mx-auto mb-20">
            <h2 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-gray-900 via-purple-900 to-blue-900 bg-clip-text text-transparent mb-6">
              Powerful Features
            </h2>
            <h3 className="text-2xl md:text-3xl font-semibold text-gray-700 mb-4">
              Everything You Need to Build Amazing Websites
            </h3>
            <p className="text-xl text-gray-600">
              Our AI-powered platform provides all the tools and features you need to create professional websites in minutes
            </p>
          </div>
          
          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Wand2 className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-2xl font-bold text-gray-900 mb-4">
                AI-Powered Generation
              </h4>
              <p className="text-gray-600 leading-relaxed">
                Describe your vision and watch our AI create professional websites with advanced layouts, styling, and functionality.
              </p>
            </div>
            
            {/* Feature 2 */}
            <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Code2 className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-2xl font-bold text-gray-900 mb-4">
                Clean, Modern Code
              </h4>
              <p className="text-gray-600 leading-relaxed">
                Get production-ready HTML, CSS, and JavaScript code that follows best practices and modern web standards.
              </p>
            </div>
            
            {/* Feature 3 */}
            <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100">
              <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-rose-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Palette className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-2xl font-bold text-gray-900 mb-4">
                Beautiful Designs
              </h4>
              <p className="text-gray-600 leading-relaxed">
                Choose from multiple design styles including modern, minimal, bold, elegant, and playful aesthetics.
              </p>
            </div>
            
            {/* Feature 4 */}
            <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Smartphone className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-2xl font-bold text-gray-900 mb-4">
                Fully Responsive
              </h4>
              <p className="text-gray-600 leading-relaxed">
                Every website is mobile-first and looks perfect on all devices - phones, tablets, and desktops.
              </p>
            </div>
            
            {/* Feature 5 */}
            <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100">
              <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Globe className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-2xl font-bold text-gray-900 mb-4">
                Ready to Deploy
              </h4>
              <p className="text-gray-600 leading-relaxed">
                Download your website as a ZIP file or open directly in CodeSandbox or StackBlitz for instant deployment.
              </p>
            </div>
            
            {/* Feature 6 */}
            <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100">
              <div className="w-16 h-16 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Timer className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-2xl font-bold text-gray-900 mb-4">
                Lightning Fast
              </h4>
              <p className="text-gray-600 leading-relaxed">
                Generate complete, professional websites in seconds. No more weeks of development time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 bg-white relative overflow-hidden">
        {/* Animated Gradient Orbs */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-r from-green-100 to-emerald-100 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="container mx-auto px-6 relative z-10">
          {/* Section Header */}
          <div className="text-center max-w-4xl mx-auto mb-20">
            <h2 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-gray-900 via-purple-900 to-blue-900 bg-clip-text text-transparent mb-6">
              Simple Pricing
            </h2>
            <h3 className="text-2xl md:text-3xl font-semibold text-gray-700 mb-4">
              Choose Your Perfect Plan
            </h3>
            <p className="text-xl text-gray-600">
              Start free and upgrade as you grow. All plans include core features.
            </p>
          </div>
          
          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Free Plan */}
            <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-200 relative">
              <div className="absolute top-0 left-0 w-full bg-gradient-to-r from-purple-50 to-blue-50 rounded-t-3xl p-4">
                <p className="text-purple-600 font-semibold">FREE</p>
              </div>
              <div className="text-center mt-4">
                <h3 className="text-3xl font-bold text-gray-900 mb-2">Free</h3>
                <p className="text-gray-600 mb-8">Perfect for trying out Sento</p>
                <div className="text-5xl font-bold text-purple-600 mb-2">$0</div>
                <p className="text-gray-500 mb-8">/month</p>
                <Button
                  onClick={() => window.location.href = '/#/signup'}
                  variant="outline"
                  className="w-full mb-6 border-2"
                >
                  Get Started Free
                </Button>
                <ul className="space-y-3 text-left">
                  <li className="flex items-center gap-3 text-gray-700">
                    <Check className="w-5 h-5 text-green-500" />
                    <span>5 website generations per month</span>
                  </li>
                  <li className="flex items-center gap-3 text-gray-700">
                    <Check className="w-5 h-5 text-green-500" />
                    <span>All design styles</span>
                  </li>
                  <li className="flex items-center gap-3 text-gray-700">
                    <Check className="w-5 h-5 text-green-500" />
                    <span>Download as ZIP</span>
                  </li>
                  <li className="flex items-center gap-3 text-gray-700">
                    <Check className="w-5 h-5 text-green-500" />
                    <span>Basic support</span>
                  </li>
                </ul>
              </div>
            </div>
            
            {/* Pro Plan - Highlighted */}
            <div className="bg-white rounded-3xl p-8 shadow-2xl border border-purple-200 relative transform -translate-y-4">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                MOST POPULAR
              </div>
              <div className="text-center mt-4">
                <h3 className="text-3xl font-bold text-gray-900 mb-2">Pro</h3>
                <p className="text-gray-600 mb-8">For professionals & creators</p>
                <div className="text-5xl font-bold text-purple-600 mb-2">$29</div>
                <p className="text-gray-500 mb-8">/month</p>
                <Button
                  onClick={() => window.location.href = '/#/signup'}
                  className="w-full mb-6 bg-white text-purple-600 hover:bg-gray-100"
                >
                  Start Pro Trial
                </Button>
                <ul className="space-y-3 text-left">
                  <li className="flex items-center gap-3 text-gray-700">
                    <Check className="w-5 h-5 text-green-500" />
                    <span>Unlimited website generations</span>
                  </li>
                  <li className="flex items-center gap-3 text-gray-700">
                    <Check className="w-5 h-5 text-green-500" />
                    <span>All design styles</span>
                  </li>
                  <li className="flex items-center gap-3 text-gray-700">
                    <Check className="w-5 h-5 text-green-500" />
                    <span>Priority AI processing</span>
                  </li>
                  <li className="flex items-center gap-3 text-gray-700">
                    <Check className="w-5 h-5 text-green-500" />
                    <span>Advanced customization</span>
                  </li>
                  <li className="flex items-center gap-3 text-gray-700">
                    <Check className="w-5 h-5 text-green-500" />
                    <span>Priority support</span>
                  </li>
                  <li className="flex items-center gap-3 text-gray-700">
                    <Check className="w-5 h-5 text-green-500" />
                    <span>Commercial license</span>
                  </li>
                </ul>
              </div>
            </div>
            
            {/* Enterprise Plan */}
            <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-200 relative">
              <div className="absolute top-0 left-0 w-full bg-gradient-to-r from-gray-50 to-gray-100 rounded-t-3xl p-4">
                <p className="text-gray-600 font-semibold">ENTERPRISE</p>
              </div>
              <div className="text-center mt-4">
                <h3 className="text-3xl font-bold text-gray-900 mb-2">Enterprise</h3>
                <p className="text-gray-600 mb-8">For teams & agencies</p>
                <div className="text-5xl font-bold text-purple-600 mb-2">$99</div>
                <p className="text-gray-500 mb-8">/month</p>
                <Button
                  onClick={() => window.location.href = '/#/signup'}
                  variant="outline"
                  className="w-full mb-6 border-2"
                >
                  Contact Sales
                </Button>
                <ul className="space-y-3 text-left">
                  <li className="flex items-center gap-3 text-gray-700">
                    <Check className="w-5 h-5 text-green-500" />
                    <span>Everything in Pro</span>
                  </li>
                  <li className="flex items-center gap-3 text-gray-700">
                    <Check className="w-5 h-5 text-green-500" />
                    <span>Team collaboration (10 seats)</span>
                  </li>
                  <li className="flex items-center gap-3 text-gray-700">
                    <Check className="w-5 h-5 text-green-500" />
                    <span>Custom AI training</span>
                  </li>
                  <li className="flex items-center gap-3 text-gray-700">
                    <Check className="w-5 h-5 text-green-500" />
                    <span>White-label options</span>
                  </li>
                  <li className="flex items-center gap-3 text-gray-700">
                    <Check className="w-5 h-5 text-green-500" />
                    <span>Dedicated support</span>
                  </li>
                  <li className="flex items-center gap-3 text-gray-700">
                    <Check className="w-5 h-5 text-green-500" />
                    <span>SLA guarantee</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          
          {/* Trust Message */}
          <div className="text-center mt-16">
            <p className="text-lg text-gray-600">
              🔒 All plans include SSL security and 99.9% uptime guarantee
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-40 left-1/4 w-64 h-64 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
          <div className="absolute bottom-40 right-1/4 w-80 h-80 bg-gradient-to-r from-pink-100 to-rose-100 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="container mx-auto px-6 relative z-10">
          {/* Section Header */}
          <div className="text-center max-w-4xl mx-auto mb-20">
            <h2 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-gray-900 via-purple-900 to-blue-900 bg-clip-text text-transparent mb-6">
              Loved by Creators
            </h2>
            <h3 className="text-2xl md:text-3xl font-semibold text-gray-700 mb-4">
              What Our Users Say
            </h3>
            <p className="text-xl text-gray-600">
              Join thousands of satisfied creators who have transformed their web presence with Sento AI
            </p>
          </div>
          
          {/* Testimonials Grid */}
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Testimonial 1 */}
            <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-blue-500"></div>
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                  S
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Sarah Johnson</h4>
                  <p className="text-gray-500 text-sm">Freelance Designer</p>
                </div>
              </div>
              <p className="text-gray-700 italic leading-relaxed mb-6">
                "Sento AI completely transformed how I build websites. What used to take me weeks now takes minutes. The AI understands exactly what I want!"
              </p>
              <div className="flex gap-1">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              </div>
            </div>
            
            {/* Testimonial 2 */}
            <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-emerald-500"></div>
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-white font-semibold">
                  M
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Michael Chen</h4>
                  <p className="text-gray-500 text-sm">Startup Founder</p>
                </div>
              </div>
              <p className="text-gray-700 italic leading-relaxed mb-6">
                "The clean code output is incredible. I can actually understand and modify what the AI generates. Perfect for my startup's landing pages!"
              </p>
              <div className="flex gap-1">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              </div>
            </div>
            
            {/* Testimonial 3 */}
            <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 to-rose-500"></div>
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full flex items-center justify-center text-white font-semibold">
                  E
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Emily Rodriguez</h4>
                  <p className="text-gray-500 text-sm">Agency Owner</p>
                </div>
              </div>
              <p className="text-gray-700 italic leading-relaxed mb-6">
                "Best investment for my agency! My team can now deliver beautiful, responsive websites to clients in record time. ROI has been amazing!"
              </p>
              <div className="flex gap-1">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              </div>
            </div>
          </div>
          
          {/* Trust indicators */}
          <div className="text-center mt-16">
            <p className="text-xl text-gray-600 mb-8">
              Trusted by over 10,000+ creators worldwide
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-8">
              <div className="flex items-center gap-2 text-gray-700">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                </div>
                <span className="font-semibold">4.9/5 Average Rating</span>
              </div>
              <div className="h-px bg-gray-200 sm:w-24"></div>
              <div className="flex items-center gap-2 text-gray-700">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <span className="font-semibold">500+ 5-Star Reviews</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-gray-50 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-1/2 left-10 w-48 h-48 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
          <div className="absolute bottom-1/2 right-10 w-56 h-56 bg-gradient-to-r from-emerald-100 to-teal-100 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="container mx-auto px-6 relative z-10">
          {/* Section Header */}
          <div className="text-center max-w-4xl mx-auto mb-20">
            <h2 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-gray-900 via-purple-900 to-blue-900 bg-clip-text text-transparent mb-6">
              Got Questions?
            </h2>
            <h3 className="text-2xl md:text-3xl font-semibold text-gray-700 mb-4">
              Frequently Asked Questions
            </h3>
            <p className="text-xl text-gray-600">
              Everything you need to know about Sento AI
            </p>
          </div>
          
          {/* FAQ Grid */}
          <div className="grid md:grid-cols-2 gap-6 max-w-6xl mx-auto">
            {/* FAQ Item 1 */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-start justify-between cursor-pointer group" onClick={() => { /* toggle logic */ }}>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-2">How does Sento AI generate websites?</h4>
                  <p className="text-gray-600 leading-relaxed">
                    Sento AI uses advanced artificial intelligence to understand your requirements and generate production-ready HTML, CSS, and JavaScript code. Simply describe what you want, and our AI creates a fully functional, responsive website following modern web standards and best practices.
                  </p>
                </div>
                <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-purple-500 transition-colors" />
              </div>
            </div>
            
            {/* FAQ Item 2 */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-start justify-between cursor-pointer group" onClick={() => { /* toggle logic */ }}>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-2">Can I customize the generated code?</h4>
                  <p className="text-gray-600 leading-relaxed">
                    Absolutely! All generated code is clean, well-structured, and fully editable. You own 100% of the code and can modify it however you like. The code follows industry best practices, making it easy to understand and customize even if you're not a coding expert.
                  </p>
                </div>
                <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-purple-500 transition-colors" />
              </div>
            </div>
            
            {/* FAQ Item 3 */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-start justify-between cursor-pointer group" onClick={() => { /* toggle logic */ }}>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-2">Are the websites mobile-friendly?</h4>
                  <p className="text-gray-600 leading-relaxed">
                    Yes! Every website generated by Sento AI is fully responsive and optimized for all devices - desktops, tablets, and smartphones. We use modern CSS frameworks and mobile-first design principles to ensure your site looks perfect on any screen size.
                  </p>
                </div>
                <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-purple-500 transition-colors" />
              </div>
            </div>
            
            {/* FAQ Item 4 */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-start justify-between cursor-pointer group" onClick={() => { /* toggle logic */ }}>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-2">How do I deploy my website?</h4>
                  <p className="text-gray-600 leading-relaxed">
                    Deploying is super easy! You can download your website as a ZIP file and upload it to any hosting provider, or deploy directly to platforms like Netlify, Vercel, or GitHub Pages. We also provide integration with CodeSandbox and StackBlitz for instant live previews.
                  </p>
                </div>
                <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-purple-500 transition-colors" />
              </div>
            </div>
            
            {/* FAQ Item 5 */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-start justify-between cursor-pointer group" onClick={() => { /* toggle logic */ }}>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-2">How long does it take to generate a website?</h4>
                  <p className="text-gray-600 leading-relaxed">
                    Most websites are generated in seconds! Simple landing pages take 10-30 seconds, while more complex multi-page websites might take 1-2 minutes. Our AI works incredibly fast while maintaining high quality and attention to detail.
                  </p>
                </div>
                <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-purple-500 transition-colors" />
              </div>
            </div>
            
            {/* FAQ Item 6 */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-start justify-between cursor-pointer group" onClick={() => { /* toggle logic */ }}>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-2">Is my data secure and private?</h4>
                  <p className="text-gray-600 leading-relaxed">
                    Absolutely! We take security seriously. All data is encrypted in transit and at rest. We never share your information with third parties, and you maintain full ownership of all generated code. You can delete your data at any time from your account settings.
                  </p>
                </div>
                <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-purple-500 transition-colors" />
              </div>
            </div>
          </div>
          
          {/* CTA at bottom */}
          <div className="text-center mt-16">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Still have questions?</h3>
            <Button
              onClick={() => window.location.href = '/#/contact'}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 px-8 py-4 text-lg"
            >
              Contact Support
            </Button>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-24 bg-gradient-to-br from-purple-600 via-blue-600 to-purple-700 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-float"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-300 rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-float" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-40 right-20 w-64 h-64 bg-blue-300 rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-float" style={{ animationDelay: '4s' }}></div>
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Icon */}
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full mb-8 animate-bounce">
              <Zap className="w-10 h-10 text-white" />
            </div>

            {/* Heading */}
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
              Ready to Build Your Dream Website?
            </h2>

            {/* Subheading */}
            <p className="text-xl md:text-2xl text-white/90 mb-8 leading-relaxed">
              Join 10,000+ creators who are building stunning websites with AI. Start your free trial today—no credit card required.
            </p>

            {/* Features List */}
            <div className="flex flex-wrap justify-center gap-6 mb-10">
              <div className="flex items-center gap-2 text-white/90">
                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <span className="font-semibold">Free 14-day trial</span>
              </div>
              <div className="flex items-center gap-2 text-white/90">
                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <span className="font-semibold">No credit card needed</span>
              </div>
              <div className="flex items-center gap-2 text-white/90">
                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <span className="font-semibold">Cancel anytime</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <Button 
                onClick={() => window.location.href = '/#/signup'}
                className="bg-white text-purple-600 hover:bg-gray-100 px-8 py-6 text-lg font-bold rounded-xl shadow-2xl hover:shadow-white/20 transition-all duration-300 hover:scale-105 group"
              >
                Start Building for Free
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
              </Button>
              <Button 
                onClick={() => window.location.href = '/#/login'}
                className="bg-white/10 backdrop-blur-sm text-white border-2 border-white/30 hover:bg-white/20 px-8 py-6 text-lg font-bold rounded-xl transition-all duration-300 hover:scale-105"
              >
                Watch Demo
                <svg className="ml-2 w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 text-white/80 text-sm">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                <span>Enterprise-grade security</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 fill-white text-white" />
                <span>4.9/5 from 500+ reviews</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                <span>10,000+ active users</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom wave decoration */}
        <div className="absolute bottom-0 left-0 w-full">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
            <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="#111827"/>
          </svg>
        </div>
      </section>

      {/* Footer Section */}
      <footer className="bg-gradient-to-t from-gray-900 to-gray-800 text-white relative overflow-hidden">
        {/* Background decorative gradient */}
        <div className="absolute top-0 left-0 w-full h-full opacity-5">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 to-blue-900/20"></div>
        </div>

        <div className="container mx-auto px-6 py-16 relative z-10">
          {/* Main Footer Content */}
          <div className="grid md:grid-cols-4 gap-8">
            {/* Column 1: Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <Sparkles className="w-8 h-8 text-purple-400" />
                <span className="text-2xl font-bold">Sento AI</span>
              </div>
              <p className="text-gray-400 leading-relaxed mb-6">
                Transform your ideas into stunning websites with the power of AI. Build faster, launch sooner.
              </p>
              {/* Social Links */}
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 bg-gray-800/50 rounded-full flex items-center justify-center hover:bg-purple-600 transition-colors">
                  <Twitter className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800/50 rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800/50 rounded-full flex items-center justify-center hover:bg-pink-600 transition-colors">
                  <Instagram className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800/50 rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors">
                  <Linkedin className="w-5 h-5" />
                </a>
              </div>
            </div>
            
            {/* Column 2: Product */}
            <div>
              <h4 className="text-lg font-semibold text-white mb-6">Product</h4>
              <ul className="space-y-3 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Templates</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Changelog</a></li>
              </ul>
            </div>
            
            {/* Column 3: Resources */}
            <div>
              <h4 className="text-lg font-semibold text-white mb-6">Resources</h4>
              <ul className="space-y-3 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Tutorials</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Community</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Support</a></li>
              </ul>
            </div>
            
            {/* Column 4: Company */}
            <div>
              <h4 className="text-lg font-semibold text-white mb-6">Company</h4>
              <ul className="space-y-3 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          
          {/* Bottom Bar */}
          <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 mb-4 md:mb-0">
              © 2024 Sento AI. All rights reserved. Built with ❤️ and AI.
            </p>
            <div className="flex gap-6 text-gray-400">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
