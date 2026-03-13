import { Link } from "react-router-dom";
import { ShieldAlert, ArrowLeft, Radar } from "lucide-react";

const NotFound = () => {
  return (
    <div className="relative h-full w-full flex items-center justify-center min-h-[70vh] px-6">

      {/* Background glow */}
      <div className="absolute w-[500px] h-[500px] bg-primary/20 blur-[120px] rounded-full opacity-30" />

      <div className="relative z-10 flex flex-col items-center text-center space-y-8">

        {/* Icon */}
        <div className="relative animate-fade-up">
          <div className="absolute inset-0 rounded-full bg-warning/20 blur-xl animate-pulse" />
          <div className="relative p-6 bg-warning/10 border border-warning/20 rounded-full">
            <ShieldAlert className="h-16 w-16 text-warning" />
          </div>
        </div>

        {/* 404 Title */}
        <div className="space-y-3 animate-fade-up" style={{ animationDelay: '80ms' }}>
          <h1 className="text-6xl font-black text-white tracking-tight">
            404
          </h1>

          <h2 className="text-xl font-semibold text-primary tracking-wide">
            Sector Not Found
          </h2>

          <p className="text-text-secondary max-w-lg leading-relaxed">
            The command module you attempted to access cannot be located within
            the Nexus system grid. It may have been relocated, restricted, or
            removed from the active network.
          </p>
        </div>


        {/* Button */}
        <Link
          to="/dashboard"
          className="flex items-center gap-2 px-6 py-3 mt-2
          bg-primary/10 text-primary font-semibold
          border border-primary/20 rounded-lg
          hover:bg-primary/40 hover:text-white
          hover:border-primary/50
          transition-all duration-200 animate-fade-up"
          style={{ animationDelay: '160ms' }}
        >
          <ArrowLeft size={18} />
          Return to Dashboard
        </Link>

      </div>
    </div>
  );
};

export default NotFound;