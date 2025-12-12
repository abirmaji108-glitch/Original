import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Zap,
  Shield,
  TrendingUp,
  Wand2,
  Code2,
  Palette,
  Smartphone,
  Globe,
  Timer,
  Check,
  Star,
  ArrowRight
} from "lucide-react";

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
            onClick={() => window.location.href = '/#/pricing'}
            className="text-gray-700 hover:text-purple-600"
          >
            Pricing
          </Button>
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
          <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-medium mb-8">
            <Zap className="w-4 h-4" />
            AI-Powered Website Generation
          </div>
          <h1 className="text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 bg-clip-text text-transparent leading-tight">
            Build Stunning Websites in Seconds
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto">
            Just describe your vision. Our AI generates professional, responsive websites instantly.
            No coding required. No design skills needed.
          </p>
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
        <div className="max-w-5xl mx-auto mt-20">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur-3xl opacity-20"></div>
            <div className="relative bg-white rounded-2xl shadow-2xl p-4 border border-gray-200">
              <img
                src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=700&fit=crop"
                alt="Sento Dashboard Preview"
                className="rounded-lg w-full"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="absolute -top-20 -left-20 w-[500px] h-[500px] bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-float"></div>
        <div className="absolute top-40 -right-20 w-[500px] h-[500px] bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-float" style={{ animationDelay: '2s' }}></div>
        {/* Features content unchanged */}
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-white overflow-hidden">
        {/* Testimonials content unchanged */}
      </section>

      {/* PRICING SECTION WITH ANIMATIONS - FIXED */}
      <section className="py-24 bg-gradient-to-br from-purple-50 via-white to-blue-50 relative overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
              <Zap className="w-4 h-4" />
              Simple Pricing
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Choose Your Perfect Plan
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Start free and upgrade as you grow. No credit card required.
            </p>
          </div>

          {/* 4 Pricing Cards - All Animations & Glow Effects Intact */}
          <div className="grid md:grid-cols-4 gap-6 max-w-6xl mx-auto mb-12">
            {/* Free Card */}
            <div className="relative group animate-fade-in-up" style={{ animationDelay: '0s' }}>
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400 rounded-2xl opacity-0 group-hover:opacity-20 blur-sm transition-all duration-500"></div>
              <div className="relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border border-gray-200">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Free</h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-gray-900">$0</span>
                    <span className="text-gray-600">/month</span>
                  </div>
                  <p className="text-sm text-gray-600">Perfect for trying out</p>
                </div>
                <Button
                  onClick={() => window.location.href = '/#/signup'}
                  className="w-full bg-gray-800 hover:bg-gray-900 mb-6"
                >
                  Get Started
                </Button>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>2 previews/month</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>Basic templates</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>Watermarked</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Basic Card */}
            <div className="relative group animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400 rounded-2xl opacity-0 group-hover:opacity-20 blur-sm transition-all duration-500"></div>
              <div className="relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border border-gray-200">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Basic</h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-gray-900">$9</span>
                    <span className="text-gray-600">/month</span>
                  </div>
                  <p className="text-sm text-gray-600">For solo entrepreneurs</p>
                </div>
                <Button
                  onClick={() => window.location.href = '/#/pricing'}
                  className="w-full bg-cyan-600 hover:bg-cyan-700 mb-6"
                >
                  Start Basic
                </Button>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>5 downloads/month</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>20+ templates</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>No watermark</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Pro Card - Most Popular */}
            <div className="relative group animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 rounded-2xl opacity-0 group-hover:opacity-30 blur-sm transition-all duration-500"></div>
              <div className="relative bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl p-6 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:-translate-y-2 border-2 border-purple-500">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-yellow-400 text-gray-900 px-3 py-1 rounded-full text-xs font-bold">
                    MOST POPULAR
                  </span>
                </div>
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-white mb-2">Pro</h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-white">$22</span>
                    <span className="text-purple-100">/month</span>
                  </div>
                  <p className="text-sm text-purple-100">For growing agencies</p>
                </div>
                <Button
                  onClick={() => window.location.href = '/#/pricing'}
                  className="w-full bg-white text-purple-600 hover:bg-gray-100 mb-6"
                >
                  Start Pro
                </Button>
                <ul className="space-y-3 text-sm text-white">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-yellow-300" />
                    <span>12 downloads/month</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-yellow-300" />
                    <span>50+ premium templates</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-yellow-300" />
                    <span>AI chat support</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Business Card */}
            <div className="relative group animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400 rounded-2xl opacity-0 group-hover:opacity-20 blur-sm transition-all duration-500"></div>
              <div className="relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border border-gray-200">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Business</h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-gray-900">$49</span>
                    <span className="text-gray-600">/month</span>
                  </div>
                  <p className="text-sm text-gray-600">For agencies & teams</p>
                </div>
                <Button
                  onClick={() => window.location.href = '/#/pricing'}
                  className="w-full bg-orange-600 hover:bg-orange-700 mb-6"
                >
                  Contact Sales
                </Button>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>40 downloads/month</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>Custom templates</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>API access</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* View Full Pricing Button */}
          <div className="text-center">
            <Button
              size="lg"
              onClick={() => window.location.href = '/#/pricing'}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              View Full Pricing & Features
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>
      {/* DUPLICATE </section> REMOVED — FIXED */}

      {/* FAQ Section */}
      <section className="py-24 bg-gradient-to-br from-purple-50 via-white to-blue-50 relative overflow-hidden">
        {/* FAQ content goes here */}
      </section>

      {/* Call to Action Section */}
      <section className="py-24 bg-gradient-to-br from-purple-600 via-blue-600 to-purple-700 relative overflow-hidden">
        {/* CTA content goes here */}
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        {/* Footer content goes here */}
      </footer>
    </div>
  );
};

export default Landing;
