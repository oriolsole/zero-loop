import { KnowledgeNode, KnowledgeEdge, QualityMetrics } from '../types/intelligence';
import { v4 as uuidv4 } from 'uuid';

/**
 * Extracts insights from reflection text
 */
export function extractInsightsFromReflection(reflectionText: string): string[] {
  const insights: string[] = [];
  
  // Simple rule-based extraction (can be made more sophisticated)
  const sentences = reflectionText.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  sentences.forEach(sentence => {
    // Look for sentences that seem to contain insights
    if (
      sentence.toLowerCase().includes('learned') ||
      sentence.toLowerCase().includes('insight') ||
      sentence.toLowerCase().includes('pattern') ||
      sentence.toLowerCase().includes('discovered') ||
      sentence.toLowerCase().includes('understanding') ||
      sentence.toLowerCase().includes('key concept') ||
      sentence.toLowerCase().includes('important to note') ||
      sentence.toLowerCase().includes('crucial') ||
      sentence.toLowerCase().includes('fundamental')
    ) {
      insights.push(sentence.trim());
    }
  });
  
  return insights;
}

/**
 * Creates a knowledge node from an insight
 */
export function createKnowledgeNode(
  insight: string, 
  loopNumber: number, 
  domainId: string,
  loopId?: string,
  sourceInsights?: string[]
): KnowledgeNode {
  // Determine the type of node based on content
  let nodeType: 'rule' | 'concept' | 'pattern' | 'insight' = 'insight';
  
  if (insight.toLowerCase().includes('rule') || 
      insight.toLowerCase().includes('should') || 
      insight.toLowerCase().includes('must')) {
    nodeType = 'rule';
  } else if (insight.toLowerCase().includes('pattern') || 
             insight.toLowerCase().includes('common') ||
             insight.toLowerCase().includes('recurring')) {
    nodeType = 'pattern';
  } else if (insight.toLowerCase().includes('concept') || 
             insight.toLowerCase().includes('understand') ||
             insight.toLowerCase().includes('idea')) {
    nodeType = 'concept';
  }
  
  // Generate a title from the insight
  const title = insight.length > 30 ? `${insight.substring(0, 30)}...` : insight;

  // Calculate confidence based on language markers
  let confidence = 0.7; // Default confidence
  
  const confidenceMarkers = {
    high: ['clearly', 'always', 'definitely', 'certainly', 'proven', 'established'],
    medium: ['typically', 'often', 'generally', 'usually', 'mostly'],
    low: ['might', 'could', 'perhaps', 'possibly', 'sometimes', 'may']
  };
  
  const lowerInsight = insight.toLowerCase();
  
  // Adjust confidence based on language markers
  if (confidenceMarkers.high.some(marker => lowerInsight.includes(marker))) {
    confidence = Math.min(confidence + 0.2, 1.0);
  } else if (confidenceMarkers.low.some(marker => lowerInsight.includes(marker))) {
    confidence = Math.max(confidence - 0.2, 0.3);
  }

  // Calculate quality metrics
  const qualityMetrics: QualityMetrics = {
    impact: calculateImpactScore(insight),
    novelty: 5 + (Math.random() * 5), // Default starting score between 5-10
    validation_status: 'unverified'
  };

  return {
    id: uuidv4(), // Use proper UUID instead of string ID
    title,
    description: insight,
    type: nodeType,
    discoveredInLoop: loopNumber,
    position: {
      x: Math.random() * 80, // Position as percentage of container
      y: Math.random() * 80
    },
    size: Math.floor(Math.random() * 10) + 10, // Random size between 10-20
    confidence,
    domain: domainId,
    timestamp: Date.now(),
    // New fields for Phase 4.2
    sourceInsights: sourceInsights || [],
    loopReference: loopId,
    qualityMetrics
  };
}

/**
 * Calculate an impact score based on the insight content
 */
function calculateImpactScore(insight: string): number {
  const lowerInsight = insight.toLowerCase();
  let score = 5; // Default midpoint

  // Keywords indicating high impact
  const highImpactTerms = [
    'critical', 'crucial', 'essential', 'fundamental', 'breakthrough', 'revolutionary', 
    'key', 'important', 'significant', 'major', 'vital', 'central'
  ];
  
  // Keywords indicating moderate impact
  const moderateImpactTerms = [
    'useful', 'helpful', 'beneficial', 'relevant', 'applicable', 'practical',
    'valuable', 'worthwhile', 'meaningful'
  ];
  
  // Check for high impact terms
  if (highImpactTerms.some(term => lowerInsight.includes(term))) {
    score += 2 + Math.random() * 3; // Add 2-5 points
  }
  
  // Check for moderate impact terms
  else if (moderateImpactTerms.some(term => lowerInsight.includes(term))) {
    score += Math.random() * 3; // Add 0-3 points
  }
  
  // Adjust based on insight length (assuming longer insights might be more detailed)
  score += (insight.length / 500) * 2; // Add up to 2 points for longer insights
  
  // Cap at 10
  return Math.min(Math.round(score * 10) / 10, 10);
}

/**
 * Creates edges between nodes based on content similarity
 */
export function createEdgesBetweenNodes(
  newNode: KnowledgeNode, 
  existingNodes: KnowledgeNode[]
): KnowledgeEdge[] {
  const edges: KnowledgeEdge[] = [];
  
  // Only consider nodes from the same domain
  const domainNodes = existingNodes.filter(node => node.domain === newNode.domain);
  
  // Simple content-based matching
  for (const existingNode of domainNodes) {
    // Skip connecting to self
    if (existingNode.id === newNode.id) continue;
    
    const textSimilarity = calculateTextSimilarity(
      newNode.description.toLowerCase(), 
      existingNode.description.toLowerCase()
    );
    
    // If there's significant similarity, create an edge
    if (textSimilarity > 0.2) {
      const edgeType = determineEdgeType(newNode, existingNode);
      
      edges.push({
        id: uuidv4(), // Use proper UUID instead of string ID
        source: existingNode.id,
        target: newNode.id,
        type: edgeType,
        strength: textSimilarity,
        // New fields for Phase 4.2
        similarityScore: textSimilarity,
        validated: false,
        creationMethod: 'automatic'
      });
    }
  }

  // If the node has sourceInsights, create edges to those nodes
  if (newNode.sourceInsights && newNode.sourceInsights.length > 0) {
    for (const sourceId of newNode.sourceInsights) {
      const sourceNode = existingNodes.find(node => node.id === sourceId);
      if (sourceNode) {
        edges.push({
          id: uuidv4(), // Use proper UUID instead of string ID
          source: sourceId,
          target: newNode.id,
          type: 'builds-on',
          strength: 0.9, // High strength for explicit source connections
          similarityScore: 1.0, // Perfect similarity for explicit connections
          validated: true, // Explicitly validated
          creationMethod: 'manual'
        });
      }
    }
  }
  
  return edges;
}

/**
 * Calculate simple text similarity between two strings
 * This is a simplified implementation - could be improved with NLP techniques
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  // Simple word overlap approach
  const words1 = new Set(text1.split(/\s+/).filter(w => w.length > 3));
  const words2 = new Set(text2.split(/\s+/).filter(w => w.length > 3));
  
  // Find intersection
  const intersection = new Set([...words1].filter(word => words2.has(word)));
  
  // Calculate Jaccard similarity
  const union = new Set([...words1, ...words2]);
  
  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

/**
 * Determine the type of relationship between two nodes
 */
function determineEdgeType(
  newNode: KnowledgeNode, 
  existingNode: KnowledgeNode
): KnowledgeEdge['type'] {
  // Simple heuristic based on content and node type
  const newText = newNode.description.toLowerCase();
  
  if (newText.includes('contrary') || 
      newText.includes('however') || 
      newText.includes('but ') ||
      newText.includes('unlike')) {
    return 'contradicts';
  }
  
  if (newText.includes('similar') ||
      newText.includes('related') ||
      newText.includes('like ') ||
      newText.includes('as in')) {
    return 'related-to';
  }
  
  if (newText.includes('broader') ||
      newText.includes('general') ||
      newText.includes('overall')) {
    return 'generalizes';
  }
  
  // Default relationship
  return 'builds-on';
}

/**
 * Calculate an improved layout for the knowledge graph
 */
export function calculateGraphLayout(
  nodes: KnowledgeNode[], 
  edges: KnowledgeEdge[]
): KnowledgeNode[] {
  if (nodes.length <= 1) return nodes;
  
  // Create a map for quick node lookup
  const nodeMap = new Map<string, KnowledgeNode>();
  nodes.forEach(node => nodeMap.set(node.id, { ...node }));
  
  // Simple force-directed layout
  // Repulsive forces between all nodes
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const nodeA = nodeMap.get(nodes[i].id)!;
      const nodeB = nodeMap.get(nodes[j].id)!;
      
      // Calculate distance
      const dx = nodeA.position.x - nodeB.position.x;
      const dy = nodeA.position.y - nodeB.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Apply repulsive force (simplified)
      if (distance < 30) {
        const force = (30 - distance) / 30;
        const moveX = dx * force * 0.05;
        const moveY = dy * force * 0.05;
        
        nodeA.position.x += moveX;
        nodeA.position.y += moveY;
        nodeB.position.x -= moveX;
        nodeB.position.y -= moveY;
      }
    }
  }
  
  // Attractive forces along edges
  edges.forEach(edge => {
    const source = nodeMap.get(edge.source);
    const target = nodeMap.get(edge.target);
    
    if (source && target) {
      const dx = source.position.x - target.position.x;
      const dy = source.position.y - target.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Apply attractive force (simplified)
      const force = (distance - 15) / 10;
      const moveX = dx * force * 0.05;
      const moveY = dy * force * 0.05;
      
      source.position.x -= moveX * 0.5;
      source.position.y -= moveY * 0.5;
      target.position.x += moveX * 0.5;
      target.position.y += moveY * 0.5;
    }
  });
  
  // Ensure nodes stay within bounds (0-100%)
  nodeMap.forEach(node => {
    node.position.x = Math.max(5, Math.min(95, node.position.x));
    node.position.y = Math.max(5, Math.min(95, node.position.y));
  });
  
  return Array.from(nodeMap.values());
}
