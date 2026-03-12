import { Loader2 } from 'lucide-react';

const Loading = () => {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center space-y-4 min-h-[50vh]">
      <Loader2 className="h-8 w-8 text-primary animate-spin" />
      <p className="text-text-secondary text-sm animate-pulse">Loading module...</p>
    </div>
  );
};

export default Loading;
