
import React, { useState } from 'react';
import { useForm } from "react-hook-form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Domain } from '../types/intelligence';
import { Brain, Code, Calculator, Puzzle, FileText, Briefcase, Save, Copy, Trash } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

interface DomainEditorProps {
  domain?: Domain;
  onSave: (domain: Domain) => void;
  onCancel: () => void;
  onDelete?: (domainId: string) => void;
  isNew: boolean;
}

interface DomainFormValues {
  id: string;
  name: string;
  shortDesc: string;
  description: string;
  initialPrompt: string;
  initialKnowledge: string;
  taskLogic: string;
  colorTheme: string;
  icon: string;
}

const DomainEditor: React.FC<DomainEditorProps> = ({ 
  domain, 
  onSave, 
  onCancel,
  onDelete,
  isNew 
}) => {
  const [activeTab, setActiveTab] = useState('basic');
  
  const defaultValues: DomainFormValues = {
    id: domain?.id || `domain-${Date.now()}`,
    name: domain?.name || 'New Domain',
    shortDesc: domain?.shortDesc || 'A custom domain for learning',
    description: domain?.description || 'This is a custom domain that you can use to explore learning in a specific area.',
    initialPrompt: '',
    initialKnowledge: '',
    taskLogic: 'function generateTask() {\n  return "Create a task related to this domain.";\n}',
    colorTheme: 'purple',
    icon: domain?.id || 'brain'
  };
  
  const form = useForm<DomainFormValues>({
    defaultValues
  });
  
  const iconOptions = [
    { value: 'brain', label: 'Brain', icon: <Brain className="w-4 h-4" /> },
    { value: 'code', label: 'Code', icon: <Code className="w-4 h-4" /> },
    { value: 'calculator', label: 'Calculator', icon: <Calculator className="w-4 h-4" /> },
    { value: 'puzzle', label: 'Puzzle', icon: <Puzzle className="w-4 h-4" /> },
    { value: 'fileText', label: 'Document', icon: <FileText className="w-4 h-4" /> },
    { value: 'briefcase', label: 'Business', icon: <Briefcase className="w-4 h-4" /> },
  ];
  
  const handleSubmit = (values: DomainFormValues) => {
    // Create a new domain object from the form values
    const newDomain: Domain = {
      id: values.id,
      name: values.name,
      shortDesc: values.shortDesc,
      description: values.description,
      totalLoops: domain?.totalLoops || 0,
      currentLoop: domain?.currentLoop || [],
      knowledgeNodes: domain?.knowledgeNodes || [],
      knowledgeEdges: domain?.knowledgeEdges || [],
      metrics: domain?.metrics || {
        successRate: 0,
        knowledgeGrowth: [{ name: 'Start', nodes: 0 }],
        taskDifficulty: [{ name: 'Start', difficulty: 1, success: 1 }],
        skills: [{ name: 'Learning', level: 1 }]
      }
    };
    
    onSave(newDomain);
    toast.success(isNew ? 'Domain created!' : 'Domain updated!');
  };
  
  const handleClone = () => {
    // Create a clone of the current form values
    const values = form.getValues();
    values.id = `domain-${Date.now()}`;
    values.name = `${values.name} (Copy)`;
    
    // Save as new domain
    handleSubmit(values);
    toast.success('Domain cloned!');
  };
  
  const handleDelete = () => {
    if (domain && window.confirm('Are you sure you want to delete this domain?')) {
      onDelete?.(domain.id);
      toast.success('Domain deleted!');
    }
  };
  
  const getIconComponent = (iconName: string) => {
    const option = iconOptions.find(option => option.value === iconName);
    return option?.icon || <Brain className="w-4 h-4" />;
  };
  
  return (
    <Card className="w-full max-w-4xl mx-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {getIconComponent(form.watch('icon'))}
                  {isNew ? 'Create New Domain' : 'Edit Domain'}
                </CardTitle>
                <CardDescription>
                  {isNew ? 'Define a new learning domain' : 'Modify an existing learning domain'}
                </CardDescription>
              </div>
              <Badge variant={isNew ? "outline" : "default"}>
                {isNew ? 'New Domain' : 'Edit Mode'}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="advanced">Advanced Settings</TabsTrigger>
                <TabsTrigger value="knowledge">Initial Knowledge</TabsTrigger>
              </TabsList>
              
              <TabsContent value="basic" className="space-y-4">
                <FormField
                  control={form.control}
                  name="id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Domain ID</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="domain-id" 
                          {...field} 
                          disabled={!isNew}
                        />
                      </FormControl>
                      <FormDescription>
                        A unique identifier for this domain (lowercase, no spaces)
                      </FormDescription>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Domain Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="New Domain" 
                          {...field} 
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="shortDesc"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Short Description</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="A brief description" 
                          {...field} 
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Detailed description of this domain" 
                          rows={4}
                          {...field} 
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="icon"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Icon</FormLabel>
                        <div className="grid grid-cols-3 gap-2">
                          {iconOptions.map((option) => (
                            <Button
                              key={option.value}
                              type="button"
                              variant={field.value === option.value ? "default" : "outline"}
                              className="flex items-center justify-center py-6"
                              onClick={() => form.setValue('icon', option.value)}
                            >
                              {option.icon}
                            </Button>
                          ))}
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="colorTheme"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Color Theme</FormLabel>
                        <div className="grid grid-cols-3 gap-2">
                          {['purple', 'blue', 'green', 'orange', 'red', 'gray'].map((color) => (
                            <Button
                              key={color}
                              type="button"
                              variant={field.value === color ? "default" : "outline"}
                              className={`py-6 ${color === 'purple' ? 'bg-purple-500' : ''} 
                                ${color === 'blue' ? 'bg-blue-500' : ''} 
                                ${color === 'green' ? 'bg-green-500' : ''} 
                                ${color === 'orange' ? 'bg-orange-500' : ''} 
                                ${color === 'red' ? 'bg-red-500' : ''} 
                                ${color === 'gray' ? 'bg-gray-500' : ''}`}
                              style={{ 
                                backgroundColor: field.value === color ? 
                                  `var(--${color}-500)` : 'transparent'
                              }}
                              onClick={() => form.setValue('colorTheme', color)}
                            >
                              {color}
                            </Button>
                          ))}
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="advanced" className="space-y-4">
                <FormField
                  control={form.control}
                  name="taskLogic"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Task Generation Logic</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="JavaScript logic for task generation" 
                          rows={10}
                          className="font-mono text-sm"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Define custom logic to generate tasks in this domain
                      </FormDescription>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="initialPrompt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial Prompt</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Custom prompt to initialize this domain" 
                          rows={4}
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Define a starting prompt for this domain
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </TabsContent>
              
              <TabsContent value="knowledge" className="space-y-4">
                <FormField
                  control={form.control}
                  name="initialKnowledge"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial Knowledge</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Define initial knowledge nodes for this domain, one per line" 
                          rows={10}
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Each line will become a knowledge node. Format: Title: Description
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
          
          <CardFooter className="flex justify-between">
            <div>
              <Button 
                type="button" 
                variant="outline"
                onClick={onCancel}
              >
                Cancel
              </Button>
            </div>
            
            <div className="flex space-x-2">
              {!isNew && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClone}
                  >
                    <Copy className="w-4 h-4 mr-2" /> Clone
                  </Button>
                  
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                  >
                    <Trash className="w-4 h-4 mr-2" /> Delete
                  </Button>
                </>
              )}
              
              <Button type="submit">
                <Save className="w-4 h-4 mr-2" /> {isNew ? 'Create Domain' : 'Save Changes'}
              </Button>
            </div>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
};

export default DomainEditor;
