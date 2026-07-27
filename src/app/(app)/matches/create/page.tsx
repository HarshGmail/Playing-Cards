'use client';

import { useState } from 'react';
import CreateMatchStep1 from '@/components/match/CreateMatchStep1';
import CreateMatchStep2 from '@/components/match/CreateMatchStep2';
import CreateMatchStep3 from '@/components/match/CreateMatchStep3';

export default function CreateMatchPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    creatorRole: 'score-only',
    rankPreference: 'highest-first' as 'highest-first' | 'lowest-first',
    tiebreakers: [] as string[],
  });

  const handleStep1 = (data: {
    name: string;
    creatorRole: string;
    rankPreference: string;
  }) => {
    setFormData((prev) => ({
      ...prev,
      ...data,
      rankPreference: data.rankPreference as 'highest-first' | 'lowest-first',
    }));
    setStep(2);
  };

  const handleStep2 = (tiebreakers: string[]) => {
    setFormData((prev) => ({ ...prev, tiebreakers }));
    setStep(3);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create Match</h1>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Step {step} of 3
            </div>
          </div>

          <div className="mb-8">
            <div className="flex items-center">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex-1 flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      s <= step
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {s}
                  </div>
                  {s < 3 && (
                    <div
                      className={`flex-1 h-1 mx-2 ${
                        s < step
                          ? 'bg-blue-600'
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {step === 1 && <CreateMatchStep1 onNext={handleStep1} />}
          {step === 2 && (
            <CreateMatchStep2
              rankPreference={formData.rankPreference}
              onNext={handleStep2}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && (
            <CreateMatchStep3
              name={formData.name}
              creatorRole={formData.creatorRole}
              rankPreference={formData.rankPreference}
              tiebreakers={formData.tiebreakers}
              onBack={() => setStep(2)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
