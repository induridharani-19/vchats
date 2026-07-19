import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';

const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen bg-obsidian text-gray-100 flex items-center justify-center p-6 text-center">
      <div className="max-w-md">
        <HelpCircle className="w-20 h-20 text-brandViolet mx-auto mb-6" />
        <h1 className="text-4xl font-extrabold mb-2">404</h1>
        <p className="text-gray-400 mb-8">The page you are looking for does not exist or has been moved.</p>
        <Link
          to="/"
          className="px-6 py-3 rounded-xl bg-teal-gradient text-white font-bold shadow-glass hover:shadow-glass-hover transition-all inline-block"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
