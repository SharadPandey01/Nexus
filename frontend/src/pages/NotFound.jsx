import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center space-y-6 min-h-[60vh]">
      <div className="p-4 bg-warning/10 rounded-full border border-warning/20">
        <ShieldAlert className="h-16 w-16 text-warning" />
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-white tracking-tight">404 - Sector Not Found</h2>
        <p className="text-text-secondary max-w-md mx-auto">
          The command module you are looking for does not exist or access has been restricted.
        </p>
      </div>
      <Link 
        to="/" 
        className="mt-4 px-6 py-2.5 bg-primary/10 text-primary font-medium hover:text-white border border-primary/20 rounded-lg hover:bg-primary/40 hover:border-primary/50 transition-all duration-200"
      >
        Return to Dashboard
      </Link>
    </div>
  );
};

export default NotFound;
