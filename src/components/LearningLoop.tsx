
import React from 'react';
import LearningLoopImpl from './learning-loop/LearningLoop';

// This component now serves as a wrapper for the more feature-rich implementation
const LearningLoopWrapper: React.FC = () => {
  return <LearningLoopImpl />;
};

export default LearningLoopWrapper;
