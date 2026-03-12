import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

  if (!isLoggedIn) {
    // Redirect to the login page if not logged in
    return <Navigate to="/login" replace />;
  }

  // Render the protected content (e.g., Layout and Dashboard routes)
  return children;
};

export default ProtectedRoute;
