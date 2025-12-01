import { Button } from "@/components/ui/button";
import { Sparkles, Zap, Shield, TrendingUp, Wand2, Code2, Palette, Smartphone, Globe, Timer, Check, Star } from "lucide-react";

const Landing = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 scroll-smooth">
      {/* Navigation Bar */}
      <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Sparkles className="w-8 h-8 text-purple-600" />
          <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Sento
          </span>
        </div>
        <div className="flex gap-4">
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
      </nav>
      {/* Hero Section */}
      <section className="container mx-auto px-6 pt-20 pb-32">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-medium mb-8">
            <Zap className="w-4 h-4" />
            AI-Powered Website Generation
          </div>
          {/* Main Headline */}
          <h1 className="text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 bg-clip-text text-transparent leading-tight">
            Build Stunning Websites in Seconds
          </h1>
          {/* Subheadline */}
          <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto">
            Just describe your vision. Our AI generates professional, responsive websites instantly.
            No coding required. No design skills needed.
          </p>
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button
              size="lg"
              onClick={() => window.location.href = '/#/signup'}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-lg px-8 py-6 h-auto"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Start Building Free
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => window.location.href = '/#/login'}
              className="text-lg px-8 py-6 h-auto border-2"
            >
              Watch Demo
            </Button>
          </div>
          {/* Trust Indicators */}
          <div className="flex flex-wrap justify-center gap-8 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <span><strong>10,000+</strong> websites generated</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              <span><strong>5,000+</strong> happy users</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <span><strong>4.9/5</strong> average rating</span>
            </div>
          </div>
        </div>
        {/* Hero Image/Preview */}
        <div className="max-w-5xl mx-auto mt-20">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur-3xl opacity-20"></div>
            <div className="relative bg-white rounded-2xl shadow-2xl p-4 border border-gray-200">
              <img
                src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=700&fit=crop"
                alt="Sento Dashboard Preview"
                className="rounded-lg w-full"
              />
            </div>
          </div>
        </div>
      </section>
      {/* Features Section */}
      <section className="py-24 bg-white relative overflow-hidden">
        {/* Floating Gradient Orbs */}
        <div className="absolute -top-20 -left-20 w-[500px] h-[500px] bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-float"></div>
        <div className="absolute top-40 -right-20 w-[500px] h-[500px] bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="container mx-auto px-6">
          {/* Section Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Zap className="w-4 h-4" />
              Powerful Features
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
              Everything You Need to Build Amazing Websites
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Our AI-powered platform provides all the tools and features you need to create professional websites in minutes
            </p>
          </div>
          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Feature 1 */}
            <div className="relative bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-8 hover:shadow-2xl transition-all duration-500 group hover:scale-105 hover:-translate-y-3 animate-fade-in-up">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400 rounded-2xl opacity-0 group-hover:opacity-25 blur-sm transition-all duration-500 -z-10"></div>
              <div className="relative bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl transform transition-transform duration-500 group-hover:rotate-1">
                <div className="w-14 h-14 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center mb-6">
                  <Wand2 className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">AI-Powered Generation</h3>
                <p className="text-gray-600">
                  Describe your vision and watch our AI create professional websites with advanced layouts, styling, and functionality.
                </p>
              </div>
            </div>
            {/* Feature 2 */}
            <div className="relative bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8 hover:shadow-2xl transition-all duration-500 group hover:scale-105 hover:-translate-y-3 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 rounded-2xl opacity-0 group-hover:opacity-25 blur-sm transition-all duration-500 -z-10"></div>
              <div className="relative bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl transform transition-transform duration-500 group-hover:-rotate-1">
                <div className="w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mb-6">
                  <Code2 className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Clean, Modern Code</h3>
                <p className="text-gray-600">
                  Get production-ready HTML, CSS, and JavaScript code that follows best practices and modern web standards.
                </p>
              </div>
            </div>
            {/* Feature 3 */}
            <div className="relative bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 hover:shadow-2xl transition-all duration-500 group hover:scale-105 hover:-translate-y-3 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 rounded-2xl opacity-0 group-hover:opacity-25 blur-sm transition-all duration-500 -z-10"></div>
              <div className="relative bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl transform transition-transform duration-500 group-hover:rotate-1">
                <div className="w-14 h-14 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center mb-6">
                  <Palette className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Beautiful Designs</h3>
                <p className="text-gray-600">
                  Choose from multiple design styles including modern, minimal, bold, elegant, and playful aesthetics.
                </p>
              </div>
            </div>
            {/* Feature 4 */}
            <div className="relative bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl p-8 hover:shadow-2xl transition-all duration-500 group hover:scale-105 hover:-translate-y-3 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <div className="absolute -inset-0.5 bg-gradient-to-r from-green-400 via-blue-400 to-green-400 rounded-2xl opacity-0 group-hover:opacity-25 blur-sm transition-all duration-500 -z-10"></div>
              <div className="relative bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl transform transition-transform duration-500 group-hover:-rotate-1">
                <div className="w-14 h-14 bg-gradient-to-r from-green-600 to-blue-600 rounded-xl flex items-center justify-center mb-6">
                  <Smartphone className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Fully Responsive</h3>
                <p className="text-gray-600">
                  Every website is mobile-first and looks perfect on all devices - phones, tablets, and desktops.
                </p>
              </div>
            </div>
            {/* Feature 5 */}
            <div className="relative bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-8 hover:shadow-2xl transition-all duration-500 group hover:scale-105 hover:-translate-y-3 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-400 via-red-400 to-orange-400 rounded-2xl opacity-0 group-hover:opacity-25 blur-sm transition-all duration-500 -z-10"></div>
              <div className="relative bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl transform transition-transform duration-500 group-hover:rotate-1">
                <div className="w-14 h-14 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl flex items-center justify-center mb-6">
                  <Globe className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Ready to Deploy</h3>
                <p className="text-gray-600">
                  Download your website as a ZIP file or open directly in CodeSandbox or StackBlitz for instant deployment.
                </p>
              </div>
            </div>
            {/* Feature 6 */}
            <div className="relative bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 hover:shadow-2xl transition-all duration-500 group hover:scale-105 hover:-translate-y-3 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-400 via-indigo-400 to-blue-400 rounded-2xl opacity-0 group-hover:opacity-25 blur-sm transition-all duration-500 -z-10"></div>
              <div className="relative bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl transform transition-transform duration-500 group-hover:-rotate-1">
                <div className="w-14 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center mb-6">
                  <Timer className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Lightning Fast</h3>
                <p className="text-gray-600">
                  Generate complete, professional websites in seconds. No more weeks of development time.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Pricing Section */}
      <section className="py-24 bg-gradient-to-br from-purple-50 via-white to-blue-50 relative overflow-hidden">
        {/* Animated Gradient Orbs */}
        <div className="absolute -top-20 -left-20 w-[600px] h-[600px] bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-float"></div>
        <div className="absolute -bottom-20 -right-20 w-[600px] h-[600px] bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-float" style={{ animationDelay: '3s' }}></div>
        <div className="container mx-auto px-6">
          {/* Section Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Zap className="w-4 h-4" />
              Simple Pricing
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
              Choose Your Perfect Plan
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Start free and upgrade as you grow. All plans include core features.
            </p>
          </div>
          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Free Plan */}
            <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-8 border-2 border-gray-300/50 hover:border-purple-400 hover:bg-white/70 transition-all duration-300 hover:shadow-2xl hover:scale-105 hover:-translate-y-2 group">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Free</h3>
                <p className="text-gray-600">Perfect for trying out Sento</p>
              </div>
              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-gray-900">$0</span>
                  <span className="text-gray-600">/month</span>
                </div>
              </div>
              <Button
                onClick={() => window.location.href = '/#/signup'}
                variant="outline"
                className="w-full mb-6 border-2"
              >
                Get Started Free
              </Button>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">5 website generations per month</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">All design styles</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Download as ZIP</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Basic support</span>
                </div>
              </div>
            </div>
            {/* Pro Plan - Highlighted */}
            <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl p-8 border-2 border-purple-600 relative transform md:scale-105 shadow-2xl hover:scale-110 hover:-translate-y-3 transition-all duration-300">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                  <Star className="w-4 h-4" />
                  MOST POPULAR
                </div>
              </div>
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">Pro</h3>
                <p className="text-purple-100">For professionals & creators</p>
              </div>
              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-white">$29</span>
                  <span className="text-purple-100">/month</span>
                </div>
              </div>
              <Button
                onClick={() => window.location.href = '/#/signup'}
                className="w-full mb-6 bg-white text-purple-600 hover:bg-gray-100"
              >
                Start Pro Trial
              </Button>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-white mt-0.5 flex-shrink-0" />
                  <span className="text-white font-medium">Unlimited website generations</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-white mt-0.5 flex-shrink-0" />
                  <span className="text-white font-medium">All design styles</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-white mt-0.5 flex-shrink-0" />
                  <span className="text-white font-medium">Priority AI processing</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-white mt-0.5 flex-shrink-0" />
                  <span className="text-white font-medium">Advanced customization</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-white mt-0.5 flex-shrink-0" />
                  <span className="text-white font-medium">Priority support</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-white mt-0.5 flex-shrink-0" />
                  <span className="text-white font-medium">Commercial license</span>
                </div>
              </div>
            </div>
            {/* Enterprise Plan */}
            <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-8 border-2 border-gray-300/50 hover:border-blue-400 hover:bg-white/70 transition-all duration-300 hover:shadow-2xl hover:scale-105 hover:-translate-y-2 group">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Enterprise</h3>
                <p className="text-gray-600">For teams & agencies</p>
              </div>
              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-gray-900">$99</span>
                  <span className="text-gray-600">/month</span>
                </div>
              </div>
              <Button
                onClick={() => window.location.href = '/#/signup'}
                variant="outline"
                className="w-full mb-6 border-2"
              >
                Contact Sales
              </Button>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Everything in Pro</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Team collaboration (10 seats)</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Custom AI training</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">White-label options</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Dedicated support</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">SLA guarantee</span>
                </div>
              </div>
            </div>
          </div>
          {/* Trust Message */}
          <div className="text-center mt-12">
            <p className="text-gray-600">
              🔒 All plans include SSL security and 99.9% uptime guarantee
            </p>
          </div>
        </div>
      </section>
      {/* Testimonials Section */}
      <section className="py-24 bg-white relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-20 left-20 w-[400px] h-[400px] bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float"></div>
        <div className="absolute bottom-20 right-20 w-[400px] h-[400px] bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float" style={{ animationDelay: '2s' }}></div>
       
        <div className="container mx-auto px-6 relative z-10">
          {/* Section Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
              <Star className="w-4 h-4" />
              Loved by Creators
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              What Our Users Say
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Join thousands of satisfied creators who have transformed their web presence with Sento AI
            </p>
          </div>
          {/* Testimonials Grid */}
          <div className="grid md:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="bg-gradient-to-br from-purple-50 to-white rounded-2xl p-8 hover:shadow-xl transition-all duration-500 hover:scale-105 hover:-translate-y-2 group">
              <div className="flex items-center gap-1 mb-4">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              </div>
              <p className="text-gray-700 mb-6 leading-relaxed">
                "Sento AI completely transformed how I build websites. What used to take me weeks now takes minutes. The AI understands exactly what I want!"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-blue-400 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  S
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Sarah Johnson</p>
                  <p className="text-sm text-gray-600">Freelance Designer</p>
                </div>
              </div>
            </div>
            {/* Testimonial 2 */}
            <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl p-8 hover:shadow-xl transition-all duration-500 hover:scale-105 hover:-translate-y-2 group">
              <div className="flex items-center gap-1 mb-4">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              </div>
              <p className="text-gray-700 mb-6 leading-relaxed">
                "The clean code output is incredible. I can actually understand and modify what the AI generates. Perfect for my startup's landing pages!"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  M
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Michael Chen</p>
                  <p className="text-sm text-gray-600">Startup Founder</p>
                </div>
              </div>
            </div>
            {/* Testimonial 3 */}
            <div className="bg-gradient-to-br from-pink-50 to-white rounded-2xl p-8 hover:shadow-xl transition-all duration-500 hover:scale-105 hover:-translate-y-2 group">
              <div className="flex items-center gap-1 mb-4">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              </div>
              <p className="text-gray-700 mb-6 leading-relaxed">
                "Best investment for my agency! My team can now deliver beautiful, responsive websites to clients in record time. ROI has been amazing!"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-purple-400 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  E
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Emily Rodriguez</p>
                  <p className="text-sm text-gray-600">Agency Owner</p>
                </div>
              </div>
            </div>
          </div>
          {/* Trust indicators */}
          <div className="mt-16 text-center">
            <p className="text-gray-600 mb-6">Trusted by over 10,000+ creators worldwide</p>
            <div className="flex justify-center items-center gap-8 flex-wrap">
              <div className="flex items-center gap-2 text-gray-700">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-blue-400 rounded-full border-2 border-white"></div>
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-full border-2 border-white"></div>
                  <div className="w-8 h-8 bg-gradient-to-br from-pink-400 to-purple-400 rounded-full border-2 border-white"></div>
                  <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-400 rounded-full border-2 border-white"></div>
                </div>
                <span className="font-semibold">4.9/5 Average Rating</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <span className="font-semibold">500+ 5-Star Reviews</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* FAQ Section */}
      <section className="py-24 bg-gradient-to-br from-purple-50 via-white to-blue-50 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-10 right-20 w-[500px] h-[500px] bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float"></div>
        <div className="absolute bottom-10 left-20 w-[500px] h-[500px] bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float" style={{ animationDelay: '3s' }}></div>
       
        <div className="container mx-auto px-6 relative z-10">
          {/* Section Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
              <Sparkles className="w-4 h-4" />
              Got Questions?
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need to know about Sento AI
            </p>
          </div>
          {/* FAQ Grid */}
          <div className="max-w-4xl mx-auto space-y-6">
            {/* FAQ Item 1 */}
            <div className="bg-white rounded-2xl p-8 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    How does Sento AI generate websites?
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Sento AI uses advanced artificial intelligence to understand your requirements and generate production-ready HTML, CSS, and JavaScript code. Simply describe what you want, and our AI creates a fully functional, responsive website following modern web standards and best practices.
                  </p>
                </div>
              </div>
            </div>
            {/* FAQ Item 2 */}
            <div className="bg-white rounded-2xl p-8 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Code2 className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    Can I customize the generated code?
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Absolutely! All generated code is clean, well-structured, and fully editable. You own 100% of the code and can modify it however you like. The code follows industry best practices, making it easy to understand and customize even if you're not a coding expert.
                  </p>
                </div>
              </div>
            </div>
            {/* FAQ Item 3 */}
            <div className="bg-white rounded-2xl p-8 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Smartphone className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    Are the websites mobile-friendly?
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Yes! Every website generated by Sento AI is fully responsive and optimized for all devices - desktops, tablets, and smartphones. We use modern CSS frameworks and mobile-first design principles to ensure your site looks perfect on any screen size.
                  </p>
                </div>
              </div>
            </div>
            {/* FAQ Item 4 */}
            <div className="bg-white rounded-2xl p-8 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Globe className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    How do I deploy my website?
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Deploying is super easy! You can download your website as a ZIP file and upload it to any hosting provider, or deploy directly to platforms like Netlify, Vercel, or GitHub Pages. We also provide integration with CodeSandbox and StackBlitz for instant live previews.
                  </p>
                </div>
              </div>
            </div>
            {/* FAQ Item 5 */}
            <div className="bg-white rounded-2xl p-8 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Timer className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    How long does it take to generate a website?
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Most websites are generated in seconds! Simple landing pages take 10-30 seconds, while more complex multi-page websites might take 1-2 minutes. Our AI works incredibly fast while maintaining high quality and attention to detail.
                  </p>
                </div>
              </div>
            </div>
            {/* FAQ Item 6 */}
            <div className="bg-white rounded-2xl p-8 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    Is my data secure and private?
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Absolutely! We take security seriously. All data is encrypted in transit and at rest. We never share your information with third parties, and you maintain full ownership of all generated code. You can delete your data at any time from your account settings.
                  </p>
                </div>
              </div>
            </div>
          </div>
          {/* CTA at bottom */}
          <div className="mt-16 text-center">
            <p className="text-gray-600 mb-6 text-lg">Still have questions?</p>
            <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              Contact Support
            </Button>
          </div>
        </div>
      </section>
      {/* Footer Section */}
      <footer className="bg-gray-900 text-white relative overflow-hidden">
        {/* Background decorative gradient */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600"></div>
        
        <div className="container mx-auto px-6 py-16">
          {/* Main Footer Content */}
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            {/* Column 1: Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-8 h-8 text-purple-400" />
                <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  Sento AI
                </span>
              </div>
              <p className="text-gray-400 mb-6 leading-relaxed">
                Transform your ideas into stunning websites with the power of AI. Build faster, launch sooner.
              </p>
              {/* Social Links */}
              <div className="flex items-center gap-4">
                <a href="#" className="w-10 h-10 bg-gray-800 hover:bg-purple-600 rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-110">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 hover:bg-blue-600 rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-110">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 hover:bg-pink-600 rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-110">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </a>
              </div>
            </div>

            {/* Column 2: Product */}
            <div>
              <h3 className="text-lg font-bold mb-4 text-white">Product</h3>
              <ul className="space-y-3">
                <li><a href="#features" className="text-gray-400 hover:text-purple-400 transition-colors duration-300">Features</a></li>
                <li><a href="#pricing" className="text-gray-400 hover:text-purple-400 transition-colors duration-300">Pricing</a></li>
                <li><a href="#" className="text-gray-400 hover:text-purple-400 transition-colors duration-300">Templates</a></li>
                <li><a href="#" className="text-gray-400 hover:text-purple-400 transition-colors duration-300">Integrations</a></li>
                <li><a href="#" className="text-gray-400 hover:text-purple-400 transition-colors duration-300">Changelog</a></li>
              </ul>
            </div>

            {/* Column 3: Resources */}
            <div>
              <h3 className="text-lg font-bold mb-4 text-white">Resources</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-gray-400 hover:text-purple-400 transition-colors duration-300">Documentation</a></li>
                <li><a href="#" className="text-gray-400 hover:text-purple-400 transition-colors duration-300">Tutorials</a></li>
                <li><a href="#" className="text-gray-400 hover:text-purple-400 transition-colors duration-300">Blog</a></li>
                <li><a href="#" className="text-gray-400 hover:text-purple-400 transition-colors duration-300">Community</a></li>
                <li><a href="#" className="text-gray-400 hover:text-purple-400 transition-colors duration-300">Support</a></li>
              </ul>
            </div>

            {/* Column 4: Company */}
            <div>
              <h3 className="text-lg font-bold mb-4 text-white">Company</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-gray-400 hover:text-purple-400 transition-colors duration-300">About Us</a></li>
                <li><a href="#" className="text-gray-400 hover:text-purple-400 transition-colors duration-300">Careers</a></li>
                <li><a href="#" className="text-gray-400 hover:text-purple-400 transition-colors duration-300">Contact</a></li>
                <li><a href="#" className="text-gray-400 hover:text-purple-400 transition-colors duration-300">Privacy Policy</a></li>
                <li><a href="#" className="text-gray-400 hover:text-purple-400 transition-colors duration-300">Terms of Service</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-800 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-gray-400 text-sm">
                © 2024 Sento AI. All rights reserved. Built with ❤️ and AI.
              </p>
              <div className="flex items-center gap-6">
                <a href="#" className="text-gray-400 hover:text-purple-400 text-sm transition-colors duration-300">Privacy</a>
                <a href="#" className="text-gray-400 hover:text-purple-400 text-sm transition-colors duration-300">Terms</a>
                <a href="#" className="text-gray-400 hover:text-purple-400 text-sm transition-colors duration-300">Cookies</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
      <style>{`
        @keyframes gradient-xy {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) translateX(0px);
          }
          33% {
            transform: translateY(-30px) translateX(20px);
          }
          66% {
            transform: translateY(30px) translateX(-20px);
          }
        }
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes pulse-slow {
          0%, 100% {
            opacity: 0.75;
          }
          50% {
            opacity: 1;
          }
        }
        .animate-gradient {
          background-size: 300% 300%;
          animation: gradient-xy 4s ease infinite;
        }
        .animate-float {
          animation: float 8s ease-in-out infinite;
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
          opacity: 0;
        }
        .group:hover .group-hover\\:animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }
        html {
          scroll-behavior: smooth;
        }
      `}</style>
    </div>
  );
};

export default Landing;
