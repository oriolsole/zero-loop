
import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link as LinkIcon } from "lucide-react";

interface SourceUrlInputProps {
  sourceUrl: string;
  setSourceUrl: (value: string) => void;
}

export const SourceUrlInput: React.FC<SourceUrlInputProps> = ({
  sourceUrl,
  setSourceUrl
}) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="source">Source URL (Optional)</Label>
      <div className="flex items-center space-x-2">
        <LinkIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <Input
          id="source"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          placeholder="https://example.com/document"
        />
      </div>
    </div>
  );
};
