
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { BrainCircuit } from "lucide-react";
import ModelSettingsForm from './ModelSettingsForm';

const ModelSettings: React.FC = () => {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BrainCircuit className="h-5 w-5" />
          AI Model Settings
        </CardTitle>
        <CardDescription>
          Configure which AI model ZeroLoop uses for reasoning
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <ModelSettingsForm />
      </CardContent>
    </Card>
  );
};

export default ModelSettings;
