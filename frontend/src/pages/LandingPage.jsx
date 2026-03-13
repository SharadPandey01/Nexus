import { Link, Navigate } from "react-router-dom";
import { Bot, CalendarDays, Mail, Zap, ChevronRight, ShieldCheck, Activity } from 'lucide-react';
import { WarpBackground } from '../components/layout/WarpBackground';
import { useScrollReveal } from '../hooks/useScrollReveal';


/* ---------------- LANDING PAGE ---------------- */

const LandingPage = () => {
  if (localStorage.getItem("isLoggedIn") === "true") {
    return <Navigate to="/dashboard" replace />;
  }

  const statsRef = useScrollReveal();
  const featuresRef = useScrollReveal();
  const orchestrationRef = useScrollReveal();
  const timelineRef = useScrollReveal();
  const footerRef = useScrollReveal();

  return (
    <div className="min-h-screen bg-black bg-light-streaks text-text-primary font-sans overflow-x-hidden selection:bg-primary/30">

      {/* Navigation */}
      <nav className="fixed w-full top-0 z-50 border-b border-white/10 glass-card !rounded-none !shadow-none !border-x-0 !border-t-0">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">

          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/50 flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <span className="text-3xl font-bold tracking-wider text-white">NEXUS</span>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              to="/login"
              className="text-text-secondary hover:text-white transition-colors text-sm font-medium"
            >
              Log In
            </Link>

            <Link to="/login" className="btn-primary-glass px-5 py-2.5 text-sm">
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* ---------------- HERO SECTION (FULL VIEWPORT) ---------------- */}

      <section className="relative h-screen flex items-center justify-center px-6 bg-transparent overflow-hidden">

        {/* Warp Background */}
        <div className="absolute inset-0 z-0">
          <WarpBackground />
        </div>

        {/* Glow Effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-1/2 left-1/2 
          -translate-x-1/2 -translate-y-1/2 
          w-[800px] h-[800px] 
          bg-primary/20 rounded-full 
          blur-[120px] opacity-40" />
        </div>

        {/* Hero Content */}
        <div className="max-w-5xl mx-auto text-center relative z-10 animate-fade-up">
          <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight mb-8 leading-tight drop-shadow-lg">
            AI-Powered <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
              Event Orchestration
            </span>
          </h1>

          <p className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
            Deploy an autonomous swarm of AI agents to manage your schedules,
            generate content, and handle communications seamlessly.
            Experience the future of event management.
          </p>
        </div>
      </section>

      {/* ---------------- STATS ---------------- */}

      <section ref={statsRef} className="border-y border-white/10 glass-card !rounded-none !shadow-none !border-x-0 relative z-10">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { label: "Active AI Agents", value: "6+" },
              { label: "Tasks Automated", value: "100%" },
              { label: "Uptime Guaranteed", value: "99.9%" },
              { label: "System Latency", value: "<1s" },
            ].map((stat, i) => (
              <div key={i} className="text-center animate-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-text-secondary uppercase tracking-wider">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- FEATURES ---------------- */}


      <section ref={featuresRef} className="py-24 px-6 relative z-10 bg-[#020202]"> 
  <div className="max-w-7xl mx-auto flex flex-col items-center">
    <h2 className="text-3xl md:text-4xl font-bold text-white mb-16 text-center tracking-tight">
      Meet Your Autonomous Swarm
    </h2>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
      {[
        {
          title: "Chronos",
          role: "Scheduler",
          icon: CalendarDays,
          color: "text-blue-400",
          glow: "group-hover:shadow-[0_0_40px_-10px_rgba(59,130,246,0.5)]",
          flare: "from-blue-500/20",
          desc: "Intelligent conflict resolution and automated itinerary generation.",
        },
        {
          title: "Hermes",
          role: "Communications",
          icon: Mail,
          color: "text-purple-400",
          glow: "group-hover:shadow-[0_0_40px_-10px_rgba(168,85,247,0.5)]",
          flare: "from-purple-500/20",
          desc: "Context-aware email delivery and instant stakeholder updates.",
        },
        {
          title: "Athena",
          role: "Analytics",
          icon: Activity,
          color: "text-emerald-400",
          glow: "group-hover:shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)]",
          flare: "from-emerald-500/20",
          desc: "Real-time insights and predictive attendance modeling.",
        },
      ].map((agent, i) => (
        <div
          key={i}
          className={`group relative p-8 rounded-2xl transition-all duration-500 
            hover:-translate-y-3 cursor-default
            bg-gradient-to-br from-white/[0.08] to-transparent
            backdrop-blur-2xl border border-white/[0.1]
            hover:border-white/[0.2] ${agent.glow} overflow-hidden animate-fade-up`}
          style={{ animationDelay: `${i * 100}ms` }}
        >
          {/* THE GLOW FLARE: A hidden radial gradient that activates on hover */}
          <div className={`absolute -inset-px bg-gradient-to-br ${agent.flare} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10`} />

          {/* Icon Container with its own inner glow */}
          <div
            className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 
              bg-white/[0.05] border border-white/[0.1] 
              group-hover:scale-110 transition-transform duration-500`}
          >
            <agent.icon className={`w-7 h-7 ${agent.color} filter drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]`} />
          </div>

          <h3 className="text-2xl font-bold text-white mb-2">
            {agent.title}
          </h3>

          <div className={`text-xs font-black ${agent.color} uppercase tracking-[0.2em] mb-4`}>
            {agent.role}
          </div>

          <p className="text-slate-300/80 leading-relaxed font-light text-[15px]">
            {agent.desc}
          </p>

          {/* Decorative Corner Light */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/[0.02] blur-2xl pointer-events-none" />
        </div>
      ))}
    </div>
  </div>
      </section>

      {/* ---------------- ORCHESTRATION VISUAL ---------------- */}

<section ref={orchestrationRef} className="py-24 px-6 relative z-10 bg-[#020202] overflow-hidden">
  <div className="max-w-7xl mx-auto">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
      <div>
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight">
          Real-Time <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
            Agent Synchronization
          </span>
        </h2>
        <p className="text-text-secondary text-lg mb-8 leading-relaxed">
          Nexus isn't just a suite of tools; it's a unified hive mind. Watch as our agents cross-reference data in real-time to ensure your event is flawless.
        </p>
        <ul className="space-y-4">
          {[
            "Autonomous Conflict Resolution",
            "Cross-Agent Data Portability",
            "End-to-End Encryption"
          ].map((item, i) => (
            <li key={i} className="flex items-center text-white/80 space-x-3">
              <div className="w-5 h-5 rounded-full border border-primary/50 flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_8px_#fff]" />
              </div>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* The Visual "Brain" */}
      <div className="relative aspect-square max-w-[500px] mx-auto">
        <div className="absolute inset-0 bg-primary/10 rounded-full blur-[100px] animate-pulse" />
        <div className="relative h-full w-full border border-white/10 rounded-full flex items-center justify-center glass-card">
           {/* Center Node */}
           <div className="z-20 w-24 h-24 rounded-2xl bg-black border border-primary flex items-center justify-center shadow-[0_0_50px_rgba(59,130,246,0.3)]">
              <Zap className="w-10 h-10 text-primary animate-bounce" />
           </div>
           
           {/* Satellite Agents */}
           {[0, 120, 240].map((degree, i) => (
             <div 
               key={i}
               className="absolute w-16 h-16 rounded-xl border border-white/20 bg-black/50 backdrop-blur-md flex items-center justify-center"
               style={{
                 transform: `rotate(${degree}deg) translateY(-140px) rotate(-${degree}deg)`
               }}
             >
                <Bot className="w-6 h-6 text-white/40" />
                <div className="absolute inset-0 border-t-2 border-primary/40 rounded-xl animate-spin-slow" />
             </div>
           ))}
           
           {/* Animated Connecting Rings */}
           <div className="absolute w-64 h-64 border border-white/5 rounded-full animate-spin-slow" />
           <div className="absolute w-[350px] h-[350px] border border-white/5 rounded-full animate-reverse-spin" />
        </div>
      </div>
    </div>
  </div>
</section>

{/* ---------------- WORKFLOW TIMELINE ---------------- */}

<section ref={timelineRef} className="py-24 px-6 relative z-10">
  <div className="max-w-4xl mx-auto text-center mb-16">
    <h2 className="text-3xl font-bold text-white mb-4">The Automated Path</h2>
    <p className="text-text-secondary">From inception to execution in four autonomous steps.</p>
  </div>

  <div className="max-w-5xl mx-auto relative">
    {/* Connecting Line */}
    <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent hidden md:block" />

    <div className="space-y-12">
      {[
        { step: "01", title: "Objective Input", desc: "Define your event parameters. Nexus parses the intent and assigns relevant agents." },
        { step: "02", title: "Resource Orchestration", desc: "Chronos secures dates and venues while Hermes prepares stakeholder outreach." },
        { step: "03", title: "Content Synthesis", desc: "Agents generate social media assets, mailers, and registration forms in parallel." },
        { step: "04", title: "Execution & Monitoring", desc: "Athena tracks real-time engagement and adjusts strategies on the fly." },
      ].map((item, i) => (
        <div key={i} className={`flex flex-col md:flex-row items-center gap-8 ${i % 2 !== 0 ? 'md:flex-row-reverse' : ''} animate-fade-up`} style={{ animationDelay: `${i * 100}ms` }}>
          <div className="flex-1 md:text-right">
             <div className={`${i % 2 !== 0 ? 'md:text-left' : 'md:text-right'}`}>
                <h4 className="text-white font-bold text-xl mb-2">{item.title}</h4>
                <p className="text-text-secondary text-sm max-w-sm ml-auto mr-auto md:ml-0 md:mr-0">{item.desc}</p>
             </div>
          </div>
          <div className="z-20 w-12 h-12 rounded-full bg-black border border-white/20 flex items-center justify-center text-primary font-black text-sm glass-card">
            {item.step}
          </div>
          <div className="flex-1" />
        </div>
      ))}
    </div>
  </div>
</section>

      {/* ---------------- FOOTER ---------------- */}

      <footer ref={footerRef} className="border-t border-white/10 py-12 px-6 relative z-10 bg-black/50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">

          <div className="flex items-center space-x-2 text-text-secondary">
            <ShieldCheck className="w-5 h-5 text-success" />
            <span className="text-sm">Secured by Nexus Core</span>
          </div>

          <p className="text-sm text-gray-600">
            © {new Date().getFullYear()} AI-Powered Event Orchestration. All systems operational.
          </p>

        </div>
      </footer>

    </div>
  );
};

export default LandingPage;