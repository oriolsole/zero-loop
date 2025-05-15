
import { DomainEngine } from '../types/intelligence';
import { PencilRuler } from 'lucide-react';

// Predefined business tasks and solutions
const businessTasks = [
  {
    task: "Outline a go-to-market strategy for a new productivity app.",
    solution: "The go-to-market strategy will focus on: 1) Initial product launch targeting remote workers via social media and productivity forums 2) Free tier with premium upgrade path 3) Partnerships with established workflow tools 4) Content marketing emphasizing productivity gains 5) Targeted ads on professional networks",
    verification: "Good strategy, covers key channels and target audience. Missing specific KPIs.",
    reflection: "The strategy has solid distribution channels but needs more specific success metrics and competitive differentiation. Key insight: Always include measurable KPIs in go-to-market strategies to track effectiveness."
  },
  {
    task: "Develop a customer retention strategy for a subscription-based SaaS product.",
    solution: "Customer retention strategy: 1) Implement onboarding sequence with personalized tutorials based on user behavior 2) Create tiered loyalty program offering increased value at 3, 6, and 12-month milestones 3) Establish proactive customer success team to monitor usage patterns and engage users before churn risk increases 4) Develop monthly feature update webinars to showcase new capabilities 5) Set up automated feedback collection at key touchpoints with rapid response workflow 6) Create a thriving user community for peer support and feature ideation",
    verification: "Comprehensive strategy with both proactive and reactive elements. Good focus on value delivery throughout customer lifecycle.",
    reflection: "This retention strategy balances technological solutions with human touchpoints. Key insight: Successful retention programs identify potential churn before it happens by monitoring usage patterns and engagement metrics."
  },
  {
    task: "Create a competitive analysis framework for a retail business entering a new market.",
    solution: "Competitive Analysis Framework:\n1. Market Positioning Matrix:\n   - Plot competitors on axes of price point and product quality\n   - Identify potential white space opportunities\n\n2. SWOT Analysis for Top 3 Competitors:\n   - Strengths: Unique assets, customer loyalty, distribution advantages\n   - Weaknesses: Service gaps, pricing vulnerabilities, operational inefficiencies\n   - Opportunities: Underserved segments, digital transformation possibilities\n   - Threats: Emerging competitors, regulatory changes, shifting consumer preferences\n\n3. Customer Experience Evaluation:\n   - Mystery shopping assessment\n   - Social sentiment analysis\n   - Customer journey mapping\n\n4. Pricing Strategy Comparison:\n   - Price-to-value ratio analysis\n   - Promotional frequency and depth\n   - Loyalty program effectiveness\n\n5. Distribution Channel Assessment:\n   - Market penetration by channel\n   - Omnichannel integration effectiveness\n   - Fulfillment efficiency metrics",
    verification: "Strong framework with multiple analytical dimensions. Good balance between quantitative and qualitative factors.",
    reflection: "This framework provides a systematic approach to understanding the competitive landscape. Key insight: The most valuable competitive analyses go beyond simple feature comparisons to understand the customer experience and unmet needs."
  },
  {
    task: "Design a basic financial model for a startup's first year of operations.",
    solution: "Financial Model Structure:\n\n1. Revenue Projections:\n   - Monthly customer acquisition targets\n   - Average revenue per user (ARPU)\n   - Conversion rate from free to paid users\n   - Churn rate and retention metrics\n\n2. Cost Structure:\n   - Fixed costs: Salaries, office, software subscriptions\n   - Variable costs: Customer acquisition, server costs, payment processing\n   - One-time costs: Initial development, legal setup\n\n3. Cash Flow Forecast:\n   - Monthly burn rate calculation\n   - Runway projection\n   - Breakeven analysis\n\n4. Key Financial Statements:\n   - Simplified P&L statement\n   - Balance sheet projection\n   - Cash flow statement\n\n5. Scenario Analysis:\n   - Base case (expected performance)\n   - Upside case (exceeding targets by 25%)\n   - Downside case (missing targets by 25%)\n   - Minimum viable case (survival threshold)",
    verification: "Solid first-year model structure with appropriate focus on cash management and scenario planning. Should include sensitivity analysis for key variables.",
    reflection: "This financial model appropriately emphasizes cash flow over accounting profit for an early-stage startup. Key insight: For startups, the most critical financial metrics are burn rate and runway, as they determine how long the company can operate before requiring additional funding."
  },
  {
    task: "Propose a strategy to reduce customer acquisition costs for an e-commerce business.",
    solution: "Strategy to Reduce Customer Acquisition Costs:\n\n1. Optimize Existing Channels:\n   - Implement A/B testing on all ad creative and landing pages\n   - Refine audience targeting based on conversion data\n   - Adjust bid strategies to prioritize high-LTV customer segments\n\n2. Enhance Organic Acquisition:\n   - Develop SEO-optimized content strategy focusing on high-intent keywords\n   - Implement user-generated content program with incentives\n   - Create shareable interactive tools relevant to product categories\n\n3. Leverage Existing Customer Base:\n   - Design referral program with dual-sided incentives\n   - Segment existing customers for targeted cross-selling\n   - Activate post-purchase review solicitation with rewards\n\n4. Improve Conversion Optimization:\n   - Streamline checkout process to reduce abandonment\n   - Implement exit-intent strategies for cart abandonment\n   - Optimize mobile experience based on behavior analytics\n\n5. Build Strategic Partnerships:\n   - Identify complementary brands for co-marketing initiatives\n   - Develop affiliate program with custom tracking and tiered commissions\n   - Explore integration opportunities with relevant platforms",
    verification: "Comprehensive approach addressing multiple facets of acquisition cost reduction. Good balance between quick wins and long-term strategies.",
    reflection: "This strategy recognizes that reducing CAC involves both acquiring customers more efficiently and extracting more value from existing acquisition channels. Key insight: The most sustainable CAC reduction strategies focus on building organic and referral channels that become more cost-effective over time, rather than just optimizing paid channels."
  }
];

// Mutation patterns to generate new business tasks
const businessMutationPatterns = [
  (task: string) => task.includes('strategy') 
    ? task.replace('strategy', 'implementation plan') 
    : task.replace('outline', 'create a detailed'),
  (task: string) => task.includes('SaaS') 
    ? task.replace('SaaS', 'D2C e-commerce') 
    : task.includes('retail') ? task.replace('retail', 'B2B') : task,
  (task: string) => `${task} Consider the impacts of international expansion.`,
  (task: string) => task.includes('financial model') 
    ? task.replace('first year', 'three-year') 
    : `${task} Include ROI calculations.`,
  (task: string) => task.includes('customer acquisition') 
    ? task.replace('customer acquisition', 'customer lifetime value') 
    : `Evaluate the effectiveness of the ${task}`
];

export const businessEngine: DomainEngine = {
  generateTask: async () => {
    const randomTask = businessTasks[Math.floor(Math.random() * businessTasks.length)];
    return randomTask.task;
  },
  
  solveTask: async (task: string) => {
    const matchingTask = businessTasks.find(t => t.task === task);
    if (matchingTask) {
      return matchingTask.solution;
    }
    
    // Fallback for tasks not in our predefined list
    return "To address this business challenge, I would analyze key stakeholders, market conditions, competitive landscape, and available resources to develop a strategic approach with measurable outcomes and implementation steps.";
  },
  
  verifySolution: async (task: string, solution: string) => {
    const matchingTask = businessTasks.find(t => t.task === task);
    
    if (!matchingTask) {
      return { 
        isCorrect: false, 
        explanation: "Cannot verify: unknown task. Please provide a different business scenario." 
      };
    }
    
    // For business tasks, check for structured approach and key components
    const hasStructure = solution.includes(':') || solution.includes('\n') || solution.includes('1)');
    const hasMeasurableElements = solution.includes('metrics') || solution.includes('KPI') || solution.includes('%');
    const hasStrategicThinking = solution.length > 200; // Simple proxy for depth
    
    const isCorrect = hasStructure && (hasMeasurableElements || hasStrategicThinking);
    
    return { 
      isCorrect, 
      explanation: isCorrect 
        ? matchingTask.verification 
        : "The solution lacks either structure, measurable outcomes, or sufficient strategic depth." 
    };
  },
  
  reflect: async (task: string, solution: string, verification: string) => {
    const matchingTask = businessTasks.find(t => t.task === task);
    
    if (matchingTask) {
      return matchingTask.reflection;
    }
    
    // Generic reflection for business tasks
    return "Effective business solutions require balancing strategic vision with tactical execution. The most valuable approaches combine data-driven decisions with an understanding of human factors and market dynamics. Clear metrics for success and adaptability to changing conditions are essential components.";
  },
  
  mutateTask: async (task: string, solution: string, verification: string, reflection: string) => {
    // Use verification result to determine if we should increase difficulty
    const success = verification.includes('Good') || verification.includes('Strong') || verification.includes('Comprehensive');
    
    if (success) {
      // Increase difficulty by applying a mutation pattern
      const randomMutation = businessMutationPatterns[Math.floor(Math.random() * businessMutationPatterns.length)];
      return randomMutation(task);
    } else {
      // Try a different task of similar difficulty
      const newTask = businessTasks.find(t => t.task !== task);
      return newTask ? newTask.task : businessTasks[0].task;
    }
  }
};

// Metadata for the engine
export const businessEngineMetadata = {
  id: 'business',
  name: 'Business Strategy',
  icon: PencilRuler,
  description: 'Develops and analyzes business strategies',
  sources: ['knowledge'],
  color: 'amber'
};
