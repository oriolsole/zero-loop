
import React from 'react';

export interface EnhancedToolDecision {
  shouldUseTools: boolean;
  detectedType: 'github' | 'search' | 'knowledge' | 'general' | 'multi-step-plan' | 'search-and-scrape' | 'scrape-content';
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
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'search-and-scrape':
        return 'text-purple-700 bg-purple-50 border-purple-200';
      case 'scrape-content':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'github':
        return 'text-gray-700 bg-gray-50 border-gray-200';
      case 'search':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'knowledge':
        return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'multi-step-plan':
        return 'text-purple-700 bg-purple-50 border-purple-200';
      default:
        return 'text-blue-700 bg-blue-50 border-blue-200';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'search-and-scrape':
        return 'Search + Scrape';
      case 'scrape-content':
        return 'Content Extraction';
      case 'github':
        return 'GitHub Analysis';
      case 'search':
        return 'Web Search';
      case 'knowledge':
        return 'Knowledge Base';
      case 'multi-step-plan':
        return 'Multi-Step Plan';
      case 'general':
        return 'General Response';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className={`p-3 rounded-lg border ${getTypeColor(decision.detectedType)}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="text-sm font-medium">
          Decision Analysis: {getTypeLabel(decision.detectedType)}
        </div>
        <div className="text-xs opacity-75">
          {Math.round(decision.confidence * 100)}% confidence
        </div>
      </div>
      <div className="text-xs opacity-90">
        {decision.reasoning}
      </div>
      {decision.planType && (
        <div className="text-xs mt-1 font-medium">
          Plan Type: {decision.planType}
        </div>
      )}
    </div>
  );
};

export default EnhancedToolDecision;
