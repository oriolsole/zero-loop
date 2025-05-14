
import React from 'react';
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface TextUploadTabProps {
  content: string;
  setContent: (value: string) => void;
}

export const TextUploadTab: React.FC<TextUploadTabProps> = ({
  content,
  setContent
}) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="content">Content</Label>
      <Textarea
        id="content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Paste or type your knowledge content here"
        className="min-h-[200px]"
        required
      />
    </div>
  );
};
