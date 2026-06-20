import React from 'react';
import { TestCasesPageEnhanced } from './TestCasesPageEnhanced';

// Re-export the enhanced version
export const TestCasesPage: React.FC = () => {
  return <TestCasesPageEnhanced />;
};

// Also export the enhanced version directly for flexibility
export { TestCasesPageEnhanced };