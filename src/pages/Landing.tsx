import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Siren, 
  MapPin, 
  Radio, 
  Zap, 
  Shield, 
  Activity,
  ArrowRight,
  Phone
} from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b-8 border-black dark:border-lime-brand">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 35px,
              #B9FF66 35px,
              #B9FF66 36px
            )`
          }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-24 lg:py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            {/* Logo */}
            <motion.div 
              className="inline-flex items-center gap-3 mb-8"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              <img 
                src="/resq-logo.svg" 
                alt="ResQ Logo" 
                className="h-16 lg:h-20 w-auto object-contain"
              />
              <h1 className="font-display text-5xl lg:text-6xl font-bold text-black dark:text-white">
                ResQ
              </h1>
            </motion.div>

            {/* Headline */}
            <motion.h2 
              className="font-display text-5xl lg:text-7xl xl:text-8xl font-bold text-black dark:text-white mb-6 leading-tight"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <span className="block">Seconds</span>
              <span className="block text-lime-brand">Save Lives.</span>
            </motion.h2>

            <motion.p 
              className="text-xl lg:text-2xl text-gray-700 dark:text-gray-300 max-w-3xl mx-auto mb-12 font-medium"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Real-time emergency incident coordination platform connecting 
              citizens, responders, and resources in critical moments.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div 
              className="flex flex-col sm:flex-row gap-6 justify-center items-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <button
                onClick={() => navigate('/dashboard?mode=citizen')}
                className="group relative px-10 py-5 bg-lime-brand text-black font-display font-bold text-xl border-4 border-black dark:border-white rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(185,255,102,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[4px_4px_0px_0px_rgba(185,255,102,1)] hover:translate-x-1 hover:translate-y-1 transition-all duration-150 w-full sm:w-auto"
              >
                <span className="flex items-center gap-3 justify-center">
                  <Phone className="w-6 h-6" />
                  Report Incident
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </span>
              </button>

              <button
                onClick={() => navigate('/dashboard?mode=responder')}
                className="group px-10 py-5 bg-black dark:bg-white text-white dark:text-black font-display font-bold text-xl border-4 border-black dark:border-white rounded-none shadow-[8px_8px_0px_0px_rgba(185,255,102,1)] hover:shadow-[4px_4px_0px_0px_rgba(185,255,102,1)] hover:translate-x-1 hover:translate-y-1 transition-all duration-150 w-full sm:w-auto"
              >
                <span className="flex items-center gap-3 justify-center">
                  <Shield className="w-6 h-6" />
                  Command Center
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
            </motion.div>

            {/* Trust Indicator */}
            <motion.div
              className="mt-12 flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <Activity className="w-5 h-5 text-lime-brand" />
              <span className="font-medium">Live tracking • Real-time updates • Verified incidents</span>
            </motion.div>
          </motion.div>

          {/* Dashboard Preview */}
          <motion.div
            className="mt-20"
            initial={{ opacity: 0, y: 40, rotateX: 25 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            <div 
              className="relative mx-auto max-w-6xl border-8 border-black dark:border-lime-brand rounded-2xl overflow-hidden shadow-2xl"
              style={{ 
                transform: 'perspective(1000px) rotateX(8deg)',
                transformStyle: 'preserve-3d'
              }}
            >
              <div className="aspect-video bg-gradient-to-br from-slate-900 via-slate-800 to-black relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="w-20 h-20 text-lime-brand mx-auto mb-4 animate-ping-slow" />
                    <p className="text-white font-display text-2xl font-bold">
                      Live Emergency Dashboard
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gray-50 dark:bg-slate-800 border-b-8 border-black dark:border-lime-brand">
        <div className="max-w-7xl mx-auto px-6">
          <motion.h3 
            className="font-display text-4xl lg:text-5xl font-bold text-center text-black dark:text-white mb-16"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            Built for <span className="text-lime-brand">Critical Moments</span>
          </motion.h3>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Zap,
                title: 'Instant Reporting',
                description: 'Report emergencies with one tap. Location automatically captured.',
                delay: 0.1
              },
              {
                icon: Radio,
                title: 'Real-Time Dispatch',
                description: 'Responders see incidents instantly. Zero coordination delay.',
                delay: 0.2
              },
              {
                icon: MapPin,
                title: 'Live Tracking',
                description: 'Track units on map. ETA updates. Complete visibility.',
                delay: 0.3
              }
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                className="p-8 bg-white dark:bg-slate-900 border-4 border-black dark:border-white rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(185,255,102,1)]"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: feature.delay }}
              >
                <div className="p-4 bg-lime-brand w-fit mb-6">
                  <feature.icon className="w-8 h-8 text-black" strokeWidth={2.5} />
                </div>
                <h4 className="font-display text-2xl font-bold text-black dark:text-white mb-4">
                  {feature.title}
                </h4>
                <p className="text-gray-700 dark:text-gray-300 text-lg">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 bg-black dark:bg-lime-brand">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-12 text-center">
            {[
              { value: '<2min', label: 'Average Response Time' },
              { value: '99.9%', label: 'System Uptime' },
              { value: '24/7', label: 'Live Monitoring' }
            ].map((stat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
              >
                <div className="font-display text-5xl lg:text-6xl font-bold text-lime-brand dark:text-black mb-2">
                  {stat.value}
                </div>
                <div className="text-white dark:text-black text-lg font-medium">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-24 bg-white dark:bg-slate-900">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.h3 
            className="font-display text-4xl lg:text-5xl font-bold text-black dark:text-white mb-8"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            Every Second Counts
          </motion.h3>
          <motion.p 
            className="text-xl text-gray-700 dark:text-gray-300 mb-12"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            Join the platform that's redefining emergency response coordination.
          </motion.p>
          <motion.button
            onClick={() => navigate('/dashboard?mode=responder')}
            className="px-12 py-6 bg-lime-brand text-black font-display font-bold text-xl border-4 border-black dark:border-white rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(185,255,102,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[4px_4px_0px_0px_rgba(185,255,102,1)] hover:translate-x-1 hover:translate-y-1 transition-all duration-150"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            Get Started Now
          </motion.button>
        </div>
      </section>
    </div>
  );
}
