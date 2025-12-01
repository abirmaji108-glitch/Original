import { Button } from "@/components/ui/button";
import { Sparkles, Zap, Shield, TrendingUp, Wand2, Code2, Palette, Smartphone, Globe, Timer, Check, Star } from "lucide-react";

const Landing = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
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
      <section className="py-20 bg-white relative overflow-hidden">
        {/* Floating Gradient Orbs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float" style={{ animationDelay: '2s' }}></div>
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
            <div className="relative bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-8 hover:shadow-2xl transition-all duration-300 group">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 rounded-2xl opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-300 -z-10 animate-gradient"></div>
              <div className="relative bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl">
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
            <div className="relative bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8 hover:shadow-2xl transition-all duration-300 group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 rounded-2xl opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-300 -z-10 animate-gradient"></div>
              <div className="relative bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl">
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
            <div className="relative bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 hover:shadow-2xl transition-all duration-300 group">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 rounded-2xl opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-300 -z-10 animate-gradient"></div>
              <div className="relative bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl">
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
            <div className="relative bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl p-8 hover:shadow-2xl transition-all duration-300 group">
              <div className="absolute inset-0 bg-gradient-to-r from-green-600 via-blue-600 to-green-600 rounded-2xl opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-300 -z-10 animate-gradient"></div>
              <div className="relative bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl">
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
            <div className="relative bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-8 hover:shadow-2xl transition-all duration-300 group">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-600 via-red-600 to-orange-600 rounded-2xl opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-300 -z-10 animate-gradient"></div>
              <div className="relative bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl">
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
            <div className="relative bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 hover:shadow-2xl transition-all duration-300 group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 rounded-2xl opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-300 -z-10 animate-gradient"></div>
              <div className="relative bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl">
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
        </div>  {/* Close the floating orbs container */}
      </section>
      {/* Pricing Section */}
      <section className="py-20 bg-gradient-to-br from-purple-50 via-white to-blue-50 relative overflow-hidden">
        {/* Animated Gradient Orbs */}
        <div className="absolute top-10 left-20 w-96 h-96 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float"></div>
        <div className="absolute bottom-10 right-20 w-96 h-96 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" style={{ animationDelay: '3s' }}></div>
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
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-8 border-2 border-gray-200 hover:border-purple-300 transition-all duration-300 hover:shadow-2xl hover:scale-105 hover:-translate-y-2">
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
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-8 border-2 border-gray-200 hover:border-blue-300 transition-all duration-300 hover:shadow-2xl hover:scale-105 hover:-translate-y-2">
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
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }

        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient-xy 3s ease infinite;
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default Landing;
