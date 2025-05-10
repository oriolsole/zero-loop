
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';

interface PerformanceMetricsProps {
  data: any;
}

const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({ data }) => {
  return (
    <div className="space-y-4 fade-in-delay-3">
      <Card className="stat-card">
        <CardContent className="pt-4">
          <div className="text-xs text-muted-foreground mb-1">Success Rate</div>
          <div className="text-2xl font-semibold">{data.successRate}%</div>
          <div className="mt-2 skill-progress">
            <div 
              className="h-full bg-success"
              style={{ width: `${data.successRate}%` }}
            ></div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="stat-card">
        <CardContent className="pt-4">
          <div className="text-xs text-muted-foreground mb-1">Knowledge Growth</div>
          <div className="h-[120px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.knowledgeGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="name" stroke="#666" fontSize={10} />
                <YAxis stroke="#666" fontSize={10} />
                <Tooltip 
                  contentStyle={{ background: '#1e1e1e', border: '1px solid #333' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="nodes" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ r: 1 }}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      <Card className="stat-card">
        <CardContent className="pt-4">
          <div className="text-xs text-muted-foreground mb-1">Task Difficulty</div>
          <div className="h-[120px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.taskDifficulty}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="name" stroke="#666" fontSize={10} />
                <YAxis stroke="#666" fontSize={10} />
                <Tooltip 
                  contentStyle={{ background: '#1e1e1e', border: '1px solid #333' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="difficulty" 
                  stroke="hsl(var(--warning))" 
                  strokeWidth={2}
                  dot={{ r: 1 }}
                  activeDot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="success" 
                  stroke="hsl(var(--success))" 
                  strokeWidth={2}
                  dot={{ r: 1 }}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      <Card className="stat-card">
        <CardContent className="pt-4 pb-2">
          <div className="text-xs text-muted-foreground mb-1">Skill Mastery</div>
          <div className="space-y-3">
            {data.skills.map((skill: any, index: number) => (
              <div key={index}>
                <div className="flex justify-between text-xs">
                  <span>{skill.name}</span>
                  <span>{skill.level}%</span>
                </div>
                <div className="mt-1 skill-progress">
                  <div 
                    className={`h-full ${skill.level > 80 ? 'bg-success' : skill.level > 50 ? 'bg-warning' : 'bg-primary'}`}
                    style={{ width: `${skill.level}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceMetrics;
