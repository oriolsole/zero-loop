
import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Domain } from '@/types/intelligence';

interface FormFieldsProps {
  form: UseFormReturn<any>;
  showAdvanced: boolean;
  setShowAdvanced: (value: boolean) => void;
  domains: Domain[];
}

export function FormFields({ form, showAdvanced, setShowAdvanced, domains }: FormFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          placeholder="Knowledge title"
          {...form.register('title')}
        />
        {form.formState.errors.title && (
          <p className="text-sm text-red-500">{form.formState.errors.title.message as string}</p>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="domain">Domain</Label>
        <Select 
          onValueChange={(value) => form.setValue('domainId', value)} 
          defaultValue={form.getValues('domainId')}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a domain" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="no-domain">No specific domain</SelectItem>
            {domains.map((domain) => (
              <SelectItem key={domain.id} value={domain.id}>
                {domain.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="sourceUrl">Source URL (optional)</Label>
        <Input
          id="sourceUrl"
          type="url"
          placeholder="https://example.com/source"
          {...form.register('sourceUrl')}
        />
        {form.formState.errors.sourceUrl && (
          <p className="text-sm text-red-500">{form.formState.errors.sourceUrl.message as string}</p>
        )}
      </div>
      
      {showAdvanced && (
        <div className="space-y-4 p-4 border rounded-md bg-muted/40">
          <h3 className="font-medium">Advanced Options</h3>
          
          <div className="space-y-2">
            <Label htmlFor="chunkSize">
              Chunk Size: {form.watch('chunkSize')}
            </Label>
            <Input
              id="chunkSize"
              type="range"
              min="100"
              max="2000"
              step="100"
              {...form.register('chunkSize', { valueAsNumber: true })}
            />
            <p className="text-xs text-muted-foreground">
              Larger chunks preserve more context but may reduce search precision
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="overlap">
              Chunk Overlap: {form.watch('overlap')}
            </Label>
            <Input
              id="overlap"
              type="range"
              min="0"
              max="500"
              step="50"
              {...form.register('overlap', { valueAsNumber: true })}
            />
            <p className="text-xs text-muted-foreground">
              Higher overlap helps maintain context across chunks
            </p>
          </div>
        </div>
      )}
      
      <Button 
        type="button" 
        variant="outline" 
        size="sm"
        onClick={() => setShowAdvanced(!showAdvanced)}
      >
        {showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options'}
      </Button>
    </div>
  );
}
