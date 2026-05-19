import React from 'react';
import { motion } from 'framer-motion';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        className="min-h-screen bg-bg flex items-center justify-center p-6"
        dir="rtl"
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          className="bg-white border-3 border-dark-ink rounded-2xl shadow-comic-lg p-8 max-w-sm w-full text-center"
        >
          {/* Sad fox inline SVG */}
          <div className="flex justify-center mb-4" style={{ height: 90 }}>
            <svg viewBox="0 0 120 140" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 75 }}>
              <polygon points="15,55 25,15 45,50" fill="#FF8C42" stroke="#2D2D44" strokeWidth="2.5" strokeLinejoin="round" />
              <polygon points="75,50 95,15 105,55" fill="#FF8C42" stroke="#2D2D44" strokeWidth="2.5" strokeLinejoin="round" />
              <polygon points="22,50 30,24 40,48" fill="#FFB8A0" />
              <polygon points="80,48 90,24 98,50" fill="#FFB8A0" />
              <ellipse cx="60" cy="78" rx="45" ry="42" fill="#FF8C42" stroke="#2D2D44" strokeWidth="2.5" />
              <ellipse cx="60" cy="90" rx="28" ry="22" fill="#FFF0E0" stroke="#2D2D44" strokeWidth="1.5" />
              {/* Sad eyes */}
              <circle cx="46" cy="72" r="6" fill="white" stroke="#2D2D44" strokeWidth="2" />
              <circle cx="74" cy="72" r="6" fill="white" stroke="#2D2D44" strokeWidth="2" />
              <circle cx="46" cy="73" r="3.5" fill="#2D2D44" />
              <circle cx="74" cy="73" r="3.5" fill="#2D2D44" />
              {/* Sad eyebrows */}
              <path d="M40 66 Q46 70 52 67" stroke="#2D2D44" strokeWidth="2" strokeLinecap="round" fill="none" />
              <path d="M68 67 Q74 70 80 66" stroke="#2D2D44" strokeWidth="2" strokeLinecap="round" fill="none" />
              <ellipse cx="60" cy="82" rx="5" ry="3.5" fill="#2D2D44" />
              {/* Sad mouth */}
              <path d="M47 96 Q60 88 73 96" stroke="#2D2D44" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              <ellipse cx="60" cy="125" rx="30" ry="20" fill="#FF8C42" stroke="#2D2D44" strokeWidth="2.5" />
              <ellipse cx="60" cy="130" rx="18" ry="12" fill="#FFF0E0" stroke="#2D2D44" strokeWidth="1.5" />
            </svg>
          </div>

          <h2 className="font-fredoka font-bold text-2xl text-dark-ink mb-2">
            אופס! משהו השתבש 😅
          </h2>
          <p className="font-fredoka text-dark-ink/60 text-sm mb-6">
            הכפל השתבש קצת... לא נורא, ננסה שוב!
          </p>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95, x: 4, y: 4 }}
            onClick={() => window.location.reload()}
            className="w-full bg-primary border-3 border-dark-ink rounded-2xl shadow-comic
                       font-fredoka font-bold text-xl text-dark-ink py-3 cursor-pointer select-none"
          >
            טעינה מחדש 🔄
          </motion.button>
        </motion.div>
      </div>
    );
  }
}

export default ErrorBoundary;
