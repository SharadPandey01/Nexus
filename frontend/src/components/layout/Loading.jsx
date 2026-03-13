

const Loading = () => {
  return (
    <div className="h-full w-full flex flex-col space-y-6 min-h-[50vh] p-6">
      {/* Title skeleton */}
      <div className="skeleton h-8 w-48" />
      {/* Card skeleton */}
      <div className="skeleton h-32 w-full" />
      {/* Grid skeleton */}
      <div className="flex gap-6">
        <div className="skeleton h-64 flex-[2]" />
        <div className="flex flex-col gap-6 flex-1">
          <div className="skeleton h-28" />
          <div className="skeleton h-28" />
        </div>
      </div>
    </div>
  );
};

export default Loading;
