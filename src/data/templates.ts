// src/data/templates.ts
// Template definitions for Sento AI
// Basic templates: Available to all users (Free, Basic, Pro, Business)
// Premium templates: Available to Pro and Business users only
export interface Template {
  id: string;
  name: string;
  category: string;
  description: string;
  prompt: string;
  isPremium: boolean;
  icon: string;
}
// 🆓 BASIC TEMPLATES (20 templates - Free tier included)
export const basicTemplates: Template[] = [
  {
    id: 'restaurant',
    name: 'Restaurant',
    category: 'Food & Beverage',
    description: 'Perfect for restaurants, cafes, and food businesses',
    icon: '🍽️',
    isPremium: false,
    prompt: 'Create a modern restaurant website with elegant design. Include: hero section with food imagery, menu highlights, reservation system, location map, chef introduction, customer testimonials, and contact form. Use warm colors (browns, oranges), sophisticated typography, and appetizing food photos. Add smooth scroll animations and hover effects on menu items.'
  },
  {
    id: 'portfolio',
    name: 'Portfolio',
    category: 'Personal',
    description: 'Showcase your work and skills professionally',
    icon: '💼',
    isPremium: false,
    prompt: 'Create a professional portfolio website with minimalist design. Include: hero with name and title, about section with photo, skills showcase with progress bars, portfolio grid with project thumbnails, testimonials carousel, contact form. Use clean layout, modern typography, and smooth transitions. Color scheme: dark backgrounds with accent colors.'
  },
  {
    id: 'agency',
    name: 'Business Agency',
    category: 'Business',
    description: 'Professional agency or consulting firm',
    icon: '🏢',
    isPremium: false,
    prompt: 'Create a business agency website with professional design. Include: hero with powerful headline, services section with icons, case studies grid, team members with photos, client logos, statistics counter, pricing plans, and contact CTA. Use corporate colors (blues, grays), clean layout, trust-building elements.'
  },
  {
    id: 'landing',
    name: 'Product Landing',
    category: 'Marketing',
    description: 'High-converting product landing page',
    icon: '🚀',
    isPremium: false,
    prompt: 'Create a high-converting product landing page. Include: attention-grabbing hero with product image, benefit-focused sections, feature highlights with icons, social proof (testimonials, user count), pricing table, FAQ accordion, and prominent CTA buttons. Use persuasive copy, scarcity elements, and conversion-focused design with bold colors.'
  },
  {
    id: 'ecommerce',
    name: 'E-commerce Store',
    category: 'E-commerce',
    description: 'Online store or shop',
    icon: '🛒',
    isPremium: false,
    prompt: 'Create an e-commerce store website. Include: hero with featured products, product grid with images and prices, category filters, shopping cart icon, product quick view, customer reviews, trust badges (secure payment, free shipping), newsletter signup. Use clean product photos, easy navigation, and clear CTAs.'
  },
  {
    id: 'blog',
    name: 'Blog/Magazine',
    category: 'Content',
    description: 'Content-focused blog or magazine',
    icon: '📰',
    isPremium: false,
    prompt: 'Create a blog/magazine website with editorial design. Include: featured article hero, article grid with thumbnails, category navigation, author bios, related posts, comment section, sidebar with popular posts, newsletter signup. Use readable typography, ample whitespace, and engaging featured images.'
  },
  {
    id: 'gym',
    name: 'Gym/Fitness',
    category: 'Health & Fitness',
    description: 'Fitness center or personal trainer',
    icon: '💪',
    isPremium: false,
    prompt: 'Create a gym/fitness website with energetic design. Include: hero with workout imagery, class schedule, trainer profiles, membership plans, transformation gallery (before/after), facility tour, free trial CTA. Use bold colors (red, black), dynamic angles, motivational copy, and high-energy photos.'
  },
  {
    id: 'education',
    name: 'Education/Course',
    category: 'Education',
    description: 'Online courses or educational platform',
    icon: '🎓',
    isPremium: false,
    prompt: 'Create an education/course website with learning-focused design. Include: hero with course preview, curriculum overview, instructor bio, student testimonials, course benefits, pricing options, free lesson preview, enrollment CTA. Use trustworthy colors (blues, greens), clear structure, and educational imagery.'
  },
  {
    id: 'realestate',
    name: 'Real Estate',
    category: 'Real Estate',
    description: 'Property listings and real estate agency',
    icon: '🏠',
    isPremium: false,
    prompt: 'Create a real estate website with property-focused design. Include: hero with search bar, featured properties grid with images and details, property filters (price, location, type), agent profiles, neighborhood guides, mortgage calculator, contact form. Use professional colors, large property images, and trust signals.'
  },
  {
    id: 'wedding',
    name: 'Wedding/Event',
    category: 'Events',
    description: 'Wedding or event planning services',
    icon: '💒',
    isPremium: false,
    prompt: 'Create a wedding/event website with romantic design. Include: hero with couple names and date, our story section, photo gallery, event timeline, RSVP form, venue information, gift registry, travel/accommodation details. Use elegant typography, soft colors (pastels, whites), and romantic imagery.'
  },
  {
    id: 'saas',
    name: 'SaaS Product',
    category: 'Technology',
    description: 'Software as a Service product',
    icon: '☁️',
    isPremium: false,
    prompt: 'Create a SaaS product website with tech-focused design. Include: hero with product demo, key features with screenshots, integration logos, pricing tiers comparison, customer testimonials, security badges, free trial CTA, feature tour. Use modern design, tech colors (blues, purples), and clear value propositions.'
  },
  {
    id: 'nonprofit',
    name: 'Non-Profit/Charity',
    category: 'Non-Profit',
    description: 'Charitable organization or cause',
    icon: '❤️',
    isPremium: false,
    prompt: 'Create a non-profit/charity website with impact-focused design. Include: hero with mission statement, impact statistics, ongoing projects, donation form with progress bar, volunteer opportunities, success stories, transparency section, partner logos. Use warm, trustworthy colors and emotional imagery.'
  },
  {
    id: 'medical',
    name: 'Medical/Healthcare',
    category: 'Healthcare',
    description: 'Medical practice or healthcare service',
    icon: '⚕️',
    isPremium: false,
    prompt: 'Create a medical/healthcare website with professional design. Include: hero with appointment booking, services offered, doctor profiles with credentials, patient testimonials, insurance information, online consultation option, health resources, contact details. Use clean design, medical colors (blues, whites), and trust elements.'
  },
  {
    id: 'photography',
    name: 'Photography',
    category: 'Creative',
    description: 'Photographer portfolio and booking',
    icon: '📷',
    isPremium: false,
    prompt: 'Create a photography website with visual-first design. Include: full-screen hero with best photo, portfolio gallery with categories (wedding, portrait, commercial), about the photographer, pricing packages, client testimonials, booking calendar, contact form. Use minimal text, large images, elegant typography, and dark theme.'
  },
  {
    id: 'hotel',
    name: 'Hotel/Resort',
    category: 'Hospitality',
    description: 'Hotel, resort, or accommodation',
    icon: '🏨',
    isPremium: false,
    prompt: 'Create a hotel/resort website with luxurious design. Include: hero with booking widget, room showcase with photos and amenities, facilities tour, location highlights, guest reviews, special offers, dining options, booking CTA. Use premium imagery, elegant colors (gold, white, navy), and sophisticated typography.'
  },
  {
    id: 'lawyer',
    name: 'Law Firm',
    category: 'Professional Services',
    description: 'Legal services and law firm',
    icon: '⚖️',
    isPremium: false,
    prompt: 'Create a law firm website with authoritative design. Include: hero with practice areas, attorney profiles, case results, client testimonials, legal resources/blog, consultation booking, areas served, contact information. Use professional colors (navy, gray, gold), formal typography, and trust-building elements.'
  },
  {
    id: 'music',
    name: 'Music/Band',
    category: 'Entertainment',
    description: 'Musicians, bands, or music venues',
    icon: '🎵',
    isPremium: false,
    prompt: 'Create a music/band website with creative design. Include: hero with latest track/video, upcoming shows/tour dates, discography, band members, music player, merchandise shop, fan newsletter signup, social media links. Use bold colors, dynamic layouts, and concert imagery.'
  },
  {
    id: 'construction',
    name: 'Construction',
    category: 'Construction',
    description: 'Construction company or contractor',
    icon: '🏗️',
    isPremium: false,
    prompt: 'Create a construction company website with industrial design. Include: hero with completed projects, services offered, project portfolio with before/after, certifications/licenses, team introduction, request quote form, safety standards, client testimonials. Use strong colors (orange, gray, black), bold typography, and construction imagery.'
  },
  {
    id: 'automotive',
    name: 'Automotive',
    category: 'Automotive',
    description: 'Car dealership or auto services',
    icon: '🚗',
    isPremium: false,
    prompt: 'Create an automotive website with sleek design. Include: hero with featured vehicles, inventory grid with filters, financing options, trade-in calculator, service department, customer reviews, test drive booking, special offers. Use dynamic angles, vehicle photos, and modern colors (black, red, chrome).'
  },
  {
    id: 'coffee',
    name: 'Coffee Shop',
    category: 'Food & Beverage',
    description: 'Cafe, coffee shop, or bakery',
    icon: '☕',
    isPremium: false,
    prompt: 'Create a coffee shop website with cozy design. Include: hero with signature drink, menu with photos and descriptions, daily specials, location with hours, loyalty program, online ordering, barista profiles, community events. Use warm colors (browns, cream, orange), inviting imagery, and casual typography.'
  }
];
// 💎 PREMIUM TEMPLATES (30 templates - Pro & Business tiers only)
export const premiumTemplates: Template[] = [
  {
    id: 'luxury-hotel',
    name: 'Luxury Hotel',
    category: 'Hospitality',
    description: 'High-end luxury resort experience',
    icon: '✨',
    isPremium: true,
    prompt: 'Create an ultra-luxury hotel website with opulent design. Include: full-screen video hero of property, suite showcase with 360° tours, exclusive amenities (spa, fine dining, concierge), VIP experiences, member benefits, press features, Instagram gallery, direct booking with best rate guarantee. Use gold accents, elegant serif fonts, premium photography, parallax scrolling, and sophisticated animations.'
  },
  {
    id: 'tech-startup',
    name: 'Tech Startup',
    category: 'Technology',
    description: 'Innovative tech startup with modern edge',
    icon: '🚀',
    isPremium: true,
    prompt: 'Create a tech startup website with cutting-edge design. Include: animated hero with product demo, problem-solution framework, innovative features with interactive demos, investor section, team profiles with LinkedIn links, tech stack showcase, career opportunities, press kit. Use gradient backgrounds, glassmorphism, micro-animations, bold typography, and futuristic design elements.'
  },
  {
    id: 'crypto',
    name: 'Crypto/Blockchain',
    category: 'Finance',
    description: 'Cryptocurrency or blockchain platform',
    icon: '₿',
    isPremium: true,
    prompt: 'Create a crypto/blockchain website with tech-financial design. Include: hero with live price ticker, wallet integration section, tokenomics infographic, roadmap timeline, whitepaper download, team with credentials, security audits, exchange listings, community links. Use dark theme, neon accents (cyan, purple), animated charts, and tech-forward design.'
  },
  {
    id: 'ai-saas',
    name: 'AI SaaS Platform',
    category: 'Technology',
    description: 'AI-powered software platform',
    icon: '🤖',
    isPremium: true,
    prompt: 'Create an AI SaaS website with intelligent design. Include: hero with AI demo/playground, use case examples, API documentation preview, model capabilities, integration partners, success metrics, enterprise solutions, developer resources, pricing calculator. Use neural network visuals, gradient meshes, interactive elements, and modern tech aesthetics.'
  },
  {
    id: 'fintech',
    name: 'FinTech App',
    category: 'Finance',
    description: 'Financial technology application',
    icon: '💳',
    isPremium: true,
    prompt: 'Create a fintech app website with trust-focused design. Include: hero with app screens, key features (payments, analytics, security), banking integrations, compliance badges, customer testimonials, pricing transparency, security measures, API access. Use financial colors (green, navy, white), clean charts, dashboard mockups, and trust signals.'
  },
  {
    id: 'fashion-brand',
    name: 'Fashion Brand',
    category: 'Fashion',
    description: 'High-end fashion or clothing brand',
    icon: '👗',
    isPremium: true,
    prompt: 'Create a fashion brand website with editorial design. Include: full-screen lookbook hero, latest collection grid, brand story, designer profile, runway videos, magazine features, size guide, store locator, style blog. Use high-fashion photography, minimal text, elegant typography, smooth transitions, and sophisticated color palettes.'
  },
  {
    id: 'architecture',
    name: 'Architecture Firm',
    category: 'Architecture',
    description: 'Architectural design studio',
    icon: '🏛️',
    isPremium: true,
    prompt: 'Create an architecture firm website with design-forward layout. Include: hero with featured project, portfolio with large images, project details (specs, awards), design philosophy, team profiles, design process, publications, contact for consultation. Use minimal design, high-quality images, architectural typography, and sophisticated grid layouts.'
  },
  {
    id: 'gaming',
    name: 'Gaming/Esports',
    category: 'Gaming',
    description: 'Game studio or esports team',
    icon: '🎮',
    isPremium: true,
    prompt: 'Create a gaming/esports website with dynamic design. Include: hero with game trailer, game features showcase, character roster, tournament schedule, team profiles, merchandise shop, community forums link, live stream integration, patch notes. Use bold colors, gaming aesthetics, animated elements, and energetic design.'
  },
  {
    id: 'podcast',
    name: 'Podcast Network',
    category: 'Media',
    description: 'Podcast show or network',
    icon: '🎙️',
    isPremium: true,
    prompt: 'Create a podcast website with audio-focused design. Include: hero with latest episode player, episode archive with transcripts, host bios, guest profiles, subscribe links (Spotify, Apple), sponsors section, listener reviews, newsletter signup, contact for guest appearances. Use audio waveform visuals, vibrant colors, and media-friendly layout.'
  },
  {
    id: 'space-tech',
    name: 'Space Technology',
    category: 'Technology',
    description: 'Space exploration or aerospace',
    icon: '🛸',
    isPremium: true,
    prompt: 'Create a space technology website with futuristic design. Include: hero with space imagery, mission overview, technology innovations, launch schedule, research publications, team of scientists/engineers, partner agencies, career opportunities. Use dark backgrounds, constellation patterns, animated stars, sleek UI, and aerospace aesthetics.'
  },
  {
    id: 'wellness',
    name: 'Wellness Spa',
    category: 'Health & Wellness',
    description: 'Premium spa and wellness center',
    icon: '🧘',
    isPremium: true,
    prompt: 'Create a wellness spa website with calming design. Include: hero with tranquil imagery, service menu (massage, facial, body treatments), therapist profiles, membership packages, facility tour, wellness blog, booking system, gift certificates. Use soothing colors (spa greens, blues, whites), zen aesthetics, and peaceful imagery.'
  },
  {
    id: 'vineyard',
    name: 'Vineyard/Winery',
    category: 'Food & Beverage',
    description: 'Wine producer or vineyard',
    icon: '🍷',
    isPremium: true,
    prompt: 'Create a vineyard/winery website with elegant design. Include: hero with vineyard landscape, wine collection with tasting notes, vineyard history, winemaking process, tasting room reservations, wine club membership, awards and accolades, online shop. Use wine colors (burgundy, gold, cream), elegant serif fonts, and rustic imagery.'
  },
  {
    id: 'art-gallery',
    name: 'Art Gallery',
    category: 'Arts',
    description: 'Contemporary art gallery',
    icon: '🎨',
    isPremium: true,
    prompt: 'Create an art gallery website with museum-quality design. Include: hero with featured artwork, current exhibitions, artist profiles, virtual gallery tour, artwork catalog with details, art collection, gallery location/hours, private viewing requests. Use minimal design, white space, large artwork images, and refined typography.'
  },
  {
    id: 'yacht',
    name: 'Yacht Charter',
    category: 'Luxury',
    description: 'Luxury yacht charter service',
    icon: '⛵',
    isPremium: true,
    prompt: 'Create a yacht charter website with luxury design. Include: hero with yacht video, fleet showcase with specs, destination guides, crew profiles, charter packages, itinerary planner, booking inquiry, testimonials from VIP clients. Use nautical blues, gold accents, luxury photography, and sophisticated layouts.'
  },
  {
    id: 'biotech',
    name: 'BioTech Research',
    category: 'Science',
    description: 'Biotechnology research company',
    icon: '🔬',
    isPremium: true,
    prompt: 'Create a biotech research website with scientific design. Include: hero with research breakthroughs, pipeline of treatments, scientific publications, clinical trials, research team, lab facilities, investor relations, partnership opportunities. Use medical imagery, molecular patterns, clean layouts, and professional design.'
  },
  {
    id: 'film-production',
    name: 'Film Production',
    category: 'Entertainment',
    description: 'Film production company',
    icon: '🎬',
    isPremium: true,
    prompt: 'Create a film production website with cinematic design. Include: hero with showreel video, portfolio of films/commercials, director profiles, production services, awards showcase, client testimonials, contact for projects. Use dark theme, cinematic typography, video backgrounds, and Hollywood-inspired design.'
  },
  {
    id: 'eco-brand',
    name: 'Eco/Sustainable Brand',
    category: 'Sustainability',
    description: 'Environmentally conscious brand',
    icon: '🌱',
    isPremium: true,
    prompt: 'Create an eco-friendly brand website with sustainable design. Include: hero with brand mission, sustainable practices, product showcase with environmental impact, carbon footprint calculator, certifications, brand story, blog about sustainability, shop with eco products. Use earth tones (greens, browns), natural imagery, and organic design elements.'
  },
  {
    id: 'metaverse',
    name: 'Metaverse/Web3',
    category: 'Technology',
    description: 'Metaverse or Web3 platform',
    icon: '🌐',
    isPremium: true,
    prompt: 'Create a metaverse/Web3 website with immersive design. Include: hero with 3D world preview, virtual experiences, NFT marketplace integration, community DAO, roadmap, whitepaper, wallet connection, creator tools, social features. Use cyber aesthetics, 3D elements, neon gradients, and futuristic design patterns.'
  },
  {
    id: 'luxury-car',
    name: 'Luxury Automotive',
    category: 'Automotive',
    description: 'Premium car dealership',
    icon: '🏎️',
    isPremium: true,
    prompt: 'Create a luxury automotive website with premium design. Include: hero with car 360° viewer, exclusive collection, customization options, heritage/brand story, ownership experience, concierge service, test drive booking, member events. Use sleek design, premium photography, elegant animations, and sophisticated colors.'
  },
  {
    id: 'investment-fund',
    name: 'Investment Fund',
    category: 'Finance',
    description: 'Venture capital or investment firm',
    icon: '💰',
    isPremium: true,
    prompt: 'Create an investment fund website with professional design. Include: hero with fund performance, investment strategy, portfolio companies, team credentials, fund documents, investor login, contact for LP inquiries, market insights. Use financial design, professional colors (navy, gold), charts, and trust-building elements.'
  },
  {
    id: 'space-tourism',
    name: 'Space Tourism',
    category: 'Travel',
    description: 'Commercial space travel',
    icon: '🚀',
    isPremium: true,
    prompt: 'Create a space tourism website with futuristic design. Include: hero with space flight video, flight experiences, spacecraft details, astronaut training, booking process, safety protocols, mission timeline, passenger testimonials. Use space imagery, stars, planets, futuristic UI, and inspiring copy.'
  },
  {
    id: 'quantum-computing',
    name: 'Quantum Computing',
    category: 'Technology',
    description: 'Quantum technology company',
    icon: '⚛️',
    isPremium: true,
    prompt: 'Create a quantum computing website with advanced design. Include: hero with quantum visualization, technology overview, use cases, research papers, quantum algorithms, developer tools, partnership opportunities, enterprise solutions. Use quantum-inspired visuals, particle effects, deep tech aesthetics, and scientific design.'
  },
  {
    id: 'culinary-academy',
    name: 'Culinary Academy',
    category: 'Education',
    description: 'Professional cooking school',
    icon: '👨‍🍳',
    isPremium: true,
    prompt: 'Create a culinary academy website with gourmet design. Include: hero with chef in action, program overview, chef instructor profiles, facility tour, student success stories, enrollment process, alumni network, culinary events. Use food photography, warm colors, elegant design, and culinary imagery.'
  },
  {
    id: 'smart-home',
    name: 'Smart Home Tech',
    category: 'Technology',
    description: 'Home automation platform',
    icon: '🏠',
    isPremium: true,
    prompt: 'Create a smart home tech website with modern design. Include: hero with home automation demo, product ecosystem, smart features (security, energy, comfort), app showcase, installation process, compatibility list, pricing packages, support center. Use tech aesthetics, device mockups, IoT visuals, and clean design.'
  },
  {
    id: 'luxury-travel',
    name: 'Luxury Travel',
    category: 'Travel',
    description: 'Exclusive travel experiences',
    icon: '✈️',
    isPremium: true,
    prompt: 'Create a luxury travel website with wanderlust design. Include: hero with destination imagery, curated itineraries, exclusive experiences, private jet/yacht options, luxury accommodations, travel concierge, client testimonials, booking consultation. Use travel photography, elegant design, gold accents, and aspirational imagery.'
  },
  {
    id: 'ai-avatar',
    name: 'AI Avatar Creator',
    category: 'Technology',
    description: 'AI-powered avatar generation',
    icon: '🎭',
    isPremium: true,
    prompt: 'Create an AI avatar creator website with creative design. Include: hero with avatar examples, creation process, style options, use cases, API documentation, pricing tiers, gallery of creations, community showcase. Use vibrant colors, avatar illustrations, playful design, and interactive elements.'
  },
  {
    id: 'mental-health',
    name: 'Mental Health App',
    category: 'Healthcare',
    description: 'Digital mental wellness platform',
    icon: '🧠',
    isPremium: true,
    prompt: 'Create a mental health app website with calming design. Include: hero with app preview, therapy options, therapist matching, resources library, crisis support, pricing plans, privacy assurances, testimonials. Use soothing colors (soft blues, greens), empathetic design, mental health imagery, and supportive tone.'
  },
  {
    id: 'drone-services',
    name: 'Drone Services',
    category: 'Technology',
    description: 'Commercial drone operations',
    icon: '🛸',
    isPremium: true,
    prompt: 'Create a drone services website with aerial design. Include: hero with drone footage, services offered (photography, surveying, inspections), equipment showcase, portfolio of projects, pilot certifications, pricing, safety protocols, contact for quote. Use aerial imagery, dynamic angles, tech design, and sky backgrounds.'
  },
  {
    id: 'vr-experience',
    name: 'VR Experience',
    category: 'Entertainment',
    description: 'Virtual reality entertainment',
    icon: '🥽',
    isPremium: true,
    prompt: 'Create a VR experience website with immersive design. Include: hero with VR demo video, experience catalog, technology features, booking system, group packages, safety guidelines, location details, testimonials. Use 3D elements, vibrant colors, futuristic design, and VR-inspired visuals.'
  },
  {
    id: 'robotics',
    name: 'Robotics Company',
    category: 'Technology',
    description: 'Robotics and automation',
    icon: '🤖',
    isPremium: true,
    prompt: 'Create a robotics company website with industrial design. Include: hero with robot demo, product lineup, applications by industry, technical specifications, AI capabilities, case studies, research team, partnership inquiries. Use mechanical aesthetics, robot imagery, tech colors, and futuristic design.'
  }
];
// Combine all templates
export const allTemplates: Template[] = [...basicTemplates, ...premiumTemplates];
// Helper functions
export const getBasicTemplates = () => basicTemplates;
export const getPremiumTemplates = () => premiumTemplates;
export const getAllTemplates = () => allTemplates;
export const getTemplatesByTier = (tier: 'free' | 'basic' | 'pro' | 'business') => {
  if (tier === 'free' || tier === 'basic') {
    return basicTemplates;
  }
  return allTemplates;
};
export const getTemplateById = (id: string): Template | undefined => {
  const template = allTemplates.find(t => t.id === id);
  
  // ✅ FIX: Log warning if template not found
  if (!template) {
    console.warn(`[Templates] Template not found: "${id}". Available IDs:`, allTemplates.map(t => t.id));
  }
  
  return template;
};
