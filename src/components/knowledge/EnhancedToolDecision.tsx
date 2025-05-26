
import React from 'react';

export interface EnhancedToolDecision {
  shouldUseTools: boolean;
  detectedType: 'github' | 'search' | 'knowledge' | 'general' | 'multi-step-plan';
  reasoning: string;
  confidence: number;
  suggestedTools: string[];
  complexity: 'simple' | 'moderate' | 'complex';
  estimatedSteps: number;
  fallbackStrategy?: string;
  planType?: string;
  planContext?: any;
}

const EnhancedToolDecision: React.FC<{ decision: EnhancedToolDecision }> = ({ decision }) => {
  return (
    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="text-sm font-medium text-blue-800 mb-1">
        Decision Analysis
      </div>
      <div className="text-xs text-blue-700">
        {decision.reasoning} (Confidence: {Math.round(decision.confidence * 100)}%)
      </div>
      {decision.planType && (
        <div className="text-xs text-purple-700 mt-1">
          Plan Type: {decision.planType}
        </div>
      )}
    </div>
  );
};

export default EnhancedToolDecision;
