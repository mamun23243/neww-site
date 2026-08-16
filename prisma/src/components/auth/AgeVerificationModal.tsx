'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  isOpen: boolean;
  onVerified: () => void;
}

export default function AgeVerificationModal({ isOpen, onVerified }: Props) {
  const [dob, setDob] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleVerify = () => {
    if (!dob) {
      setError('Please select your date of birth.');
      return;
    }

    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    if (age < 18) {
      setError('You must be 18 years or older to enter this platform.');
      return;
    }

    localStorage.setItem('age_verified', 'true');
    onVerified();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-md bg-dark-card border border-neon-purple/40 rounded-2xl p-6 shadow-[0_0_30px_rgba(168,85,247,0.2)] text-white text-center"
        >
          <h2 className="text-2xl font-bold bg-gradient-to-r from-neon-purple to-neon-pink bg-clip-text text-transparent mb-2">
            Age Verification Required
          </h2>
          <p className="text-gray-300 text-sm mb-6">
            This website contains mature themes and optional 18+ content. Please confirm your date of birth.
          </p>

          <input
            type="date"
            value={dob}
            onChange={(e) => {
              setDob(e.target.value);
              setError('');
            }}
            className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-neon-pink mb-4"
          />

          {error && <p className="text-red-400 text-xs mb-4">{error}</p>}

          <button
            onClick={handleVerify}
            className="w-full py-3 rounded-lg bg-gradient-to-r from-neon-purple to-neon-pink text-white font-semibold hover:opacity-90 transition shadow-lg"
          >
            Confirm & Enter (18+)
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
