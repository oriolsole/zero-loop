
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  HardDrive, 
  Mail, 
  Send, 
  Users, 
  Calendar, 
  Sheet, 
  FileText, 
  Image, 
  Video,
  CheckCircle2,
  Info
} from 'lucide-react';
import { GOOGLE_SCOPE_CATEGORIES, GOOGLE_SCOPES, GoogleScope } from '@/types/googleScopes';

const iconMap = {
  HardDrive,
  Mail,
  Send,
  Users,
  Calendar,
  Sheet,
  FileText,
  Image,
  Video
};

interface GoogleScopeSelectorProps {
  selectedScopes: string[];
  onScopesChange: (scopes: string[]) => void;
  onProceed: () => void;
  isLoading?: boolean;
  showProceedButton?: boolean;
}

const GoogleScopeSelector: React.FC<GoogleScopeSelectorProps> = ({
  selectedScopes,
  onScopesChange,
  onProceed,
  isLoading = false,
  showProceedButton = true
}) => {
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['storage']);

  const handleScopeToggle = (scope: GoogleScope, checked: boolean) => {
    if (scope.required) return; // Can't toggle required scopes
    
    const newScopes = checked
      ? [...selectedScopes, scope.scope]
      : selectedScopes.filter(s => s !== scope.scope);
    
    onScopesChange(newScopes);
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const isScopeSelected = (scope: GoogleScope): boolean => {
    return scope.required || selectedScopes.includes(scope.scope);
  };

  const getSelectedCount = (): number => {
    const requiredCount = GOOGLE_SCOPES.filter(s => s.required).length;
    const optionalCount = selectedScopes.filter(scope => 
      !GOOGLE_SCOPES.find(s => s.scope === scope && s.required)
    ).length;
    return requiredCount + optionalCount;
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Choose Google Services</h3>
        <p className="text-sm text-muted-foreground">
          Select which Google services you'd like ZeroLoop to access. This enables powerful MCPs to work with your data.
        </p>
        <div className="flex items-center justify-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span className="text-sm font-medium">{getSelectedCount()} services selected</span>
        </div>
      </div>

      <div className="space-y-4">
        {GOOGLE_SCOPE_CATEGORIES.map((category) => (
          <Card key={category.id} className="overflow-hidden">
            <CardHeader 
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => toggleCategory(category.id)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{category.name}</CardTitle>
                  <CardDescription className="text-sm">{category.description}</CardDescription>
                </div>
                <Badge variant="outline">
                  {category.scopes.filter(scope => isScopeSelected(scope)).length} / {category.scopes.length}
                </Badge>
              </div>
            </CardHeader>
            
            {expandedCategories.includes(category.id) && (
              <CardContent className="pt-0">
                <Separator className="mb-4" />
                <div className="space-y-3">
                  {category.scopes.map((scope) => {
                    const IconComponent = iconMap[scope.icon as keyof typeof iconMap];
                    const isSelected = isScopeSelected(scope);
                    
                    return (
                      <div key={scope.id} className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                        <div className="flex items-center space-x-3 flex-1">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handleScopeToggle(scope, checked as boolean)}
                            disabled={scope.required || isLoading}
                          />
                          
                          <div className="flex items-center space-x-2">
                            {IconComponent && <IconComponent className="h-4 w-4 text-muted-foreground" />}
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{scope.name}</span>
                                {scope.required && (
                                  <Badge variant="secondary" className="text-xs">Required</Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">{scope.description}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
              Privacy & Security
            </p>
            <p className="text-blue-700 dark:text-blue-300">
              ZeroLoop only accesses your data when you explicitly use features that require it. 
              Your data is never stored permanently and is only used to fulfill your requests.
            </p>
          </div>
        </div>
      </div>

      {showProceedButton && (
        <Button 
          onClick={onProceed}
          disabled={isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? 'Connecting...' : `Continue with ${getSelectedCount()} Services`}
        </Button>
      )}
    </div>
  );
};

export default GoogleScopeSelector;
