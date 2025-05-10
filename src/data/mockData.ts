
import { Domain, LearningStep, KnowledgeNode } from '../types/intelligence';

const logicSteps: LearningStep[] = [
  {
    type: 'task',
    title: 'Solve Conditional Logic Problem',
    description: 'Determine the output given nested conditions',
    status: 'success',
    content: 'Task: Given the conditions "if A then B, if B then C, if not C then not D", determine if D must be true when A is true.',
    metrics: {
      complexity: 'Medium',
      timeSpent: '2.3s'
    }
  },
  {
    type: 'solution',
    title: 'Logical Inference Chain',
    description: 'Step by step logical deduction',
    status: 'success',
    content: '1. If A then B (given)\n2. A is true (given)\n3. Therefore B is true (by modus ponens)\n4. If B then C (given)\n5. B is true (from step 3)\n6. Therefore C is true (by modus ponens)\n7. If not C then not D (given)\n8. C is true (from step 6)\n9. Therefore "not C" is false\n10. Therefore "not D" is false (by modus ponens with false antecedent)\n11. Therefore D is true (by double negation)',
    metrics: {
      approach: 'Inference Chain',
      confidence: '97%'
    }
  },
  {
    type: 'verification',
    title: 'Correctness Check',
    description: 'Validating logical conclusion',
    status: 'success',
    content: 'The solution correctly applies the rules of propositional logic. The inference chain is valid and the conclusion is correct.',
    metrics: {
      passedTests: '4/4',
      verificationTime: '1.1s'
    }
  },
  {
    type: 'reflection',
    title: 'Learning Reflection',
    description: 'Key insights from this problem',
    status: 'pending',
    content: 'This problem demonstrates the importance of carefully tracking truth values through a chain of implications. The double negation at the end is a key step that could be easily missed. In future problems, I should explicitly track the truth value of each proposition at each step.',
    metrics: {
      newInsights: 2,
      similarProblems: 12
    }
  },
  {
    type: 'mutation',
    title: 'Problem Adaptation',
    description: 'Creating a new problem variant',
    status: 'warning',
    content: 'Create a more complex problem by adding a disjunction: "if A then B, if B then C or D, if C then not E, if D then E". Determine the possible values of E when A is true.',
    metrics: {
      difficultyIncrease: '+25%',
      novelty: 'Medium'
    }
  }
];

const programmingSteps: LearningStep[] = [
  {
    type: 'task',
    title: 'Refactor Recursive Function',
    description: 'Optimize a recursive solution to avoid stack overflow',
    status: 'pending',
    content: 'Task: Convert the following recursive Fibonacci implementation to use memoization or an iterative approach to improve performance:\n\nfunction fib(n) {\n  if (n <= 1) return n;\n  return fib(n-1) + fib(n-2);\n}',
    metrics: {
      complexity: 'Medium',
      timeSpent: '0.0s'
    }
  },
  {
    type: 'solution',
    title: 'Memoization Implementation',
    description: 'Caching results to avoid redundant calculations',
    status: 'pending',
    content: '',
    metrics: {
      approach: 'Pending',
      confidence: '0%'
    }
  },
  {
    type: 'verification',
    title: 'Performance Analysis',
    description: 'Measuring improvement over naive approach',
    status: 'pending',
    content: '',
    metrics: {
      passedTests: '0/0',
      verificationTime: '0.0s'
    }
  },
  {
    type: 'reflection',
    title: 'Algorithm Analysis',
    description: 'Space-time trade-off consideration',
    status: 'pending',
    content: '',
    metrics: {
      newInsights: 0,
      similarProblems: 0
    }
  },
  {
    type: 'mutation',
    title: 'Challenge Variation',
    description: 'Extending to related problem',
    status: 'pending',
    content: '',
    metrics: {
      difficultyIncrease: '0%',
      novelty: 'Low'
    }
  }
];

const mathSteps: LearningStep[] = [
  {
    type: 'task',
    title: 'Solve Matrix Transformation',
    description: 'Find eigenvalues of a given matrix',
    status: 'failure',
    content: 'Task: Find the eigenvalues and eigenvectors of matrix A = [[4, -2], [1, 1]]',
    metrics: {
      complexity: 'Medium',
      timeSpent: '3.5s'
    }
  },
  {
    type: 'solution',
    title: 'Characteristic Polynomial',
    description: 'Computing determinant of (A-λI)',
    status: 'failure',
    content: 'To find eigenvalues, I need to solve det(A-λI) = 0\n\ndet([[4-λ, -2], [1, 1-λ]]) = (4-λ)(1-λ) - (-2)(1)\n= (4-λ)(1-λ) + 2\n= 4-4λ-λ+λ^2 + 2\n= λ^2 - 5λ + 6\n\nSolving λ^2 - 5λ + 6 = 0:\n(λ - 2)(λ - 3) = 0\nλ = 2 or λ = 3',
    metrics: {
      approach: 'Characteristic Equation',
      confidence: '85%'
    }
  },
  {
    type: 'verification',
    title: 'Result Validation',
    description: 'Checking if Ax = λx for found values',
    status: 'failure',
    content: 'Error detected: The characteristic polynomial was incorrectly factored. Let\'s verify:\nλ^2 - 5λ + 6 = (λ - 2)(λ - 3) = λ^2 - 5λ + 6\nThis is correct, but I made an arithmetic error earlier.\n\nRecalculating:\ndet([[4-λ, -2], [1, 1-λ]]) = (4-λ)(1-λ) - (-2)(1)\n= (4-λ)(1-λ) + 2\n= 4 - 4λ - λ + λ^2 + 2\n= λ^2 - 5λ + 6\n\nAh, I actually got the polynomial right, but I should double-check the eigenvectors.',
    metrics: {
      passedTests: '1/3',
      verificationTime: '2.7s'
    }
  },
  {
    type: 'reflection',
    title: 'Error Analysis',
    description: 'Identifying calculation mistakes',
    status: 'warning',
    content: 'I need to be more careful with matrix calculations. The eigenvalues were correct, but I failed to properly compute the eigenvectors. I should follow a more systematic approach by:\n1. Clearly writing out the characteristic equation\n2. Double-checking all arithmetic steps\n3. For each eigenvalue, systematically solve (A-λI)v = 0\n4. Verify each eigenvector by computing Av and λv separately',
    metrics: {
      newInsights: 1,
      similarProblems: 7
    }
  },
  {
    type: 'mutation',
    title: 'New Challenge Creation',
    description: 'Generating related linear algebra problem',
    status: 'success',
    content: 'New problem: Given matrix B = [[3, 1], [2, 2]], determine if it is diagonalizable. If so, find a diagonal matrix D and an invertible matrix P such that P^(-1)BP = D.',
    metrics: {
      difficultyIncrease: '+15%',
      novelty: 'Medium'
    }
  }
];

const logicNodes: KnowledgeNode[] = [
  {
    id: 'logic-1',
    title: 'Modus Ponens Rule',
    description: 'If P → Q and P is true, then Q must be true',
    type: 'rule',
    discoveredInLoop: 12,
    connections: ['logic-3', 'logic-5'],
    position: { x: 25, y: 15 },
    size: 18
  },
  {
    id: 'logic-2',
    title: 'Transitive Property',
    description: 'If P → Q and Q → R, then P → R',
    type: 'rule',
    discoveredInLoop: 27,
    connections: ['logic-1', 'logic-5'],
    position: { x: 60, y: 20 },
    size: 17
  },
  {
    id: 'logic-3',
    title: 'Contrapositive Equivalence',
    description: 'P → Q is logically equivalent to ¬Q → ¬P',
    type: 'concept',
    discoveredInLoop: 43,
    connections: ['logic-1', 'logic-4'],
    position: { x: 40, y: 55 },
    size: 20
  },
  {
    id: 'logic-4',
    title: 'Double Negation Pattern',
    description: 'Sentences with double negations are easy to misinterpret',
    type: 'pattern',
    discoveredInLoop: 78,
    connections: ['logic-3'],
    position: { x: 15, y: 65 },
    size: 16
  },
  {
    id: 'logic-5',
    title: 'Forward Chaining Efficiency',
    description: 'Working forward from premises often more efficient than backward from conclusion',
    type: 'insight',
    discoveredInLoop: 156,
    connections: ['logic-1', 'logic-2'],
    position: { x: 70, y: 70 },
    size: 22
  },
];

const programmingNodes: KnowledgeNode[] = [
  {
    id: 'prog-1',
    title: 'Time-Space Tradeoff',
    description: 'Using memory to store results can reduce computation time',
    type: 'concept',
    discoveredInLoop: 34,
    connections: ['prog-3'],
    position: { x: 20, y: 30 },
    size: 20
  },
  {
    id: 'prog-2',
    title: 'Memoization Pattern',
    description: 'Cache results of expensive function calls to avoid redundant computation',
    type: 'pattern',
    discoveredInLoop: 56,
    connections: ['prog-1', 'prog-4'],
    position: { x: 50, y: 25 },
    size: 19
  },
  {
    id: 'prog-3',
    title: 'Stack Overflow Prevention',
    description: 'Deep recursion can be prevented by using iteration or tail recursion',
    type: 'rule',
    discoveredInLoop: 72,
    connections: ['prog-1'],
    position: { x: 35, y: 65 },
    size: 18
  },
  {
    id: 'prog-4',
    title: 'Top-Down vs Bottom-Up',
    description: 'Dynamic programming can be implemented recursively (top-down) or iteratively (bottom-up)',
    type: 'insight',
    discoveredInLoop: 103,
    connections: ['prog-2', 'prog-3'],
    position: { x: 75, y: 55 },
    size: 22
  }
];

const mathNodes: KnowledgeNode[] = [
  {
    id: 'math-1',
    title: 'Characteristic Polynomial',
    description: 'det(A-λI) = 0 gives eigenvalues of matrix A',
    type: 'rule',
    discoveredInLoop: 18,
    connections: ['math-3'],
    position: { x: 30, y: 20 },
    size: 19
  },
  {
    id: 'math-2',
    title: 'Diagonalization Condition',
    description: 'A matrix is diagonalizable if it has n linearly independent eigenvectors',
    type: 'concept',
    discoveredInLoop: 41,
    connections: ['math-1', 'math-4'],
    position: { x: 65, y: 30 },
    size: 20
  },
  {
    id: 'math-3',
    title: 'Matrix Multiplication Error',
    description: 'Verify matrix operations explicitly rather than assuming correctness',
    type: 'insight',
    discoveredInLoop: 89,
    connections: ['math-1'],
    position: { x: 25, y: 60 },
    size: 18
  },
  {
    id: 'math-4',
    title: 'Eigenspace Dimension Pattern',
    description: 'The geometric multiplicity of an eigenvalue ≤ its algebraic multiplicity',
    type: 'pattern',
    discoveredInLoop: 132,
    connections: ['math-2'],
    position: { x: 70, y: 65 },
    size: 21
  }
];

export const domainsData: Domain[] = [
  {
    id: 'logic',
    name: 'Logical Reasoning',
    shortDesc: 'Formal reasoning and inference rules',
    description: 'This domain focuses on propositional and predicate logic, inference rules, and logical proofs. The system learns to identify valid arguments, logical fallacies, and efficient proof strategies.',
    totalLoops: 247,
    currentLoop: logicSteps,
    knowledgeNodes: logicNodes,
    metrics: {
      successRate: 86,
      knowledgeGrowth: [
        { name: '50', nodes: 12 },
        { name: '100', nodes: 27 },
        { name: '150', nodes: 36 },
        { name: '200', nodes: 42 },
        { name: '250', nodes: 51 }
      ],
      taskDifficulty: [
        { name: '50', difficulty: 30, success: 85 },
        { name: '100', difficulty: 45, success: 82 },
        { name: '150', difficulty: 60, success: 78 },
        { name: '200', difficulty: 65, success: 80 },
        { name: '250', difficulty: 72, success: 86 }
      ],
      skills: [
        { name: 'Propositional Logic', level: 92 },
        { name: 'Predicate Logic', level: 78 },
        { name: 'Proof Strategies', level: 85 },
        { name: 'Logical Fallacies', level: 70 }
      ]
    }
  },
  {
    id: 'programming',
    name: 'Programming Concepts',
    shortDesc: 'Algorithms, data structures, and optimization',
    description: 'This domain covers programming patterns, algorithm design, complexity analysis, and code optimization. The system learns to identify efficient solutions and common programming pitfalls.',
    totalLoops: 183,
    currentLoop: programmingSteps,
    knowledgeNodes: programmingNodes,
    metrics: {
      successRate: 74,
      knowledgeGrowth: [
        { name: '40', nodes: 8 },
        { name: '80', nodes: 19 },
        { name: '120', nodes: 32 },
        { name: '160', nodes: 38 },
        { name: '180', nodes: 42 }
      ],
      taskDifficulty: [
        { name: '40', difficulty: 35, success: 90 },
        { name: '80', difficulty: 52, success: 78 },
        { name: '120', difficulty: 68, success: 65 },
        { name: '160', difficulty: 72, success: 70 },
        { name: '180', difficulty: 75, success: 74 }
      ],
      skills: [
        { name: 'Algorithm Design', level: 80 },
        { name: 'Time Complexity', level: 85 },
        { name: 'Data Structures', level: 76 },
        { name: 'Code Optimization', level: 65 }
      ]
    }
  },
  {
    id: 'math',
    name: 'Mathematical Reasoning',
    shortDesc: 'Linear algebra, calculus, and statistics',
    description: 'This domain focuses on mathematical problem-solving, including linear algebra, calculus, statistics, and numerical methods. The system learns to apply appropriate techniques to different types of problems.',
    totalLoops: 159,
    currentLoop: mathSteps,
    knowledgeNodes: mathNodes,
    metrics: {
      successRate: 68,
      knowledgeGrowth: [
        { name: '30', nodes: 6 },
        { name: '60', nodes: 15 },
        { name: '90', nodes: 24 },
        { name: '120', nodes: 29 },
        { name: '150', nodes: 35 }
      ],
      taskDifficulty: [
        { name: '30', difficulty: 40, success: 80 },
        { name: '60', difficulty: 55, success: 72 },
        { name: '90', difficulty: 65, success: 68 },
        { name: '120', difficulty: 70, success: 65 },
        { name: '150', difficulty: 75, success: 68 }
      ],
      skills: [
        { name: 'Linear Algebra', level: 75 },
        { name: 'Calculus', level: 68 },
        { name: 'Probability', level: 62 },
        { name: 'Number Theory', level: 58 }
      ]
    }
  }
];
