
import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AdvancedOptionsProps {
  chunkSize: number;
  overlap: number;
  setChunkSize: (value: number) => void;
  setOverlap: (value: number) => void;
}

export const AdvancedOptions: React.FC<AdvancedOptionsProps> = ({
  chunkSize,
  overlap,
  setChunkSize,
  setOverlap
}) => {
  return (
    <div className="space-y-4 border rounded-md p-4">
      <div className="space-y-2">
        <Label htmlFor="chunkSize">Chunk Size</Label>
        <div className="flex items-center space-x-2">
          <Input
            id="chunkSize"
            type="number"
            value={chunkSize}
            onChange={(e) => setChunkSize(Number(e.target.value))}
            min={100}
            max={10000}
          />
          <span className="text-sm text-muted-foreground">characters</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Maximum size of each text chunk (default: 1000)
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="overlap">Chunk Overlap</Label>
        <div className="flex items-center space-x-2">
          <Input
            id="overlap"
            type="number"
            value={overlap}
            onChange={(e) => setOverlap(Number(e.target.value))}
            min={0}
            max={500}
          />
          <span className="text-sm text-muted-foreground">characters</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Overlap between consecutive chunks (default: 100)
        </p>
      </div>
    </div>
  );
};
