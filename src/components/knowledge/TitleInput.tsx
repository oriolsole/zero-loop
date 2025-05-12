
import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TitleInputProps {
  title: string;
  setTitle: (value: string) => void;
}

export const TitleInput: React.FC<TitleInputProps> = ({
  title,
  setTitle
}) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="title">Title</Label>
      <Input
        id="title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Document title"
        required
      />
    </div>
  );
};
