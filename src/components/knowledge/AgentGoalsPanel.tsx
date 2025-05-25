
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Target, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Trash2,
  Edit,
  Play
} from 'lucide-react';
import { toast } from '@/components/ui/sonner';

interface Goal {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'completed' | 'paused';
  priority: 'low' | 'medium' | 'high';
  progress: number;
  tasks: Task[];
  createdAt: Date;
  dueDate?: Date;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  estimatedTime?: string;
  actualTime?: string;
  dependencies?: string[];
  toolsRequired?: string[];
}

const AgentGoalsPanel: React.FC = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showNewGoal, setShowNewGoal] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    priority: 'medium' as const
  });

  const addGoal = () => {
    if (!newGoal.title.trim()) {
      toast.error('Goal title is required');
      return;
    }

    const goal: Goal = {
      id: `goal_${Date.now()}`,
      title: newGoal.title,
      description: newGoal.description,
      status: 'active',
      priority: newGoal.priority,
      progress: 0,
      tasks: [],
      createdAt: new Date()
    };

    setGoals(prev => [...prev, goal]);
    setNewGoal({ title: '', description: '', priority: 'medium' });
    setShowNewGoal(false);
    toast.success('Goal created successfully');
  };

  const updateGoalProgress = (goalId: string) => {
    setGoals(prev => prev.map(goal => {
      if (goal.id === goalId) {
        const completedTasks = goal.tasks.filter(task => task.status === 'completed').length;
        const totalTasks = goal.tasks.length;
        const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
        
        return {
          ...goal,
          progress,
          status: progress === 100 ? 'completed' : goal.status
        };
      }
      return goal;
    }));
  };

  const deleteGoal = (goalId: string) => {
    setGoals(prev => prev.filter(goal => goal.id !== goalId));
    toast.success('Goal deleted');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'paused': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'active': return <Play className="h-4 w-4 text-blue-500" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Agent Goals & Tasks
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowNewGoal(!showNewGoal)}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Goal
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* New Goal Form */}
        {showNewGoal && (
          <Card className="p-4">
            <div className="space-y-3">
              <Input
                placeholder="Goal title..."
                value={newGoal.title}
                onChange={(e) => setNewGoal(prev => ({ ...prev, title: e.target.value }))}
              />
              <Textarea
                placeholder="Goal description (optional)..."
                value={newGoal.description}
                onChange={(e) => setNewGoal(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Priority:</span>
                {(['low', 'medium', 'high'] as const).map(priority => (
                  <Button
                    key={priority}
                    variant={newGoal.priority === priority ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setNewGoal(prev => ({ ...prev, priority }))}
                  >
                    {priority}
                  </Button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button onClick={addGoal} size="sm">
                  Create Goal
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewGoal(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Goals List */}
        {goals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No goals yet</h3>
            <p className="text-sm">
              Create goals to help the AI agent plan and execute complex tasks.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {goals.map((goal) => (
              <Card key={goal.id} className="p-4">
                <div className="space-y-3">
                  {/* Goal Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(goal.status)}
                        <h4 className="font-medium">{goal.title}</h4>
                        <Badge variant={getPriorityColor(goal.priority)} className="text-xs">
                          {goal.priority}
                        </Badge>
                      </div>
                      {goal.description && (
                        <p className="text-sm text-muted-foreground">
                          {goal.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm">
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteGoal(goal.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>Progress</span>
                      <span>{Math.round(goal.progress)}%</span>
                    </div>
                    <Progress value={goal.progress} className="h-2" />
                  </div>

                  {/* Tasks Summary */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>
                      {goal.tasks.filter(t => t.status === 'completed').length} of {goal.tasks.length} tasks completed
                    </span>
                    <span>
                      Created {goal.createdAt.toLocaleDateString()}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2 border-t">
                    <Button variant="outline" size="sm">
                      <Plus className="h-3 w-3 mr-1" />
                      Add Task
                    </Button>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                    {goal.status === 'active' && (
                      <Button size="sm">
                        <Play className="h-3 w-3 mr-1" />
                        Execute
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AgentGoalsPanel;
