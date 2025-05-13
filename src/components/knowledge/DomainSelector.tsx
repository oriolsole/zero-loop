
import React from 'react';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Domain {
  id: string;
  name: string;
}

interface DomainSelectorProps {
  domainId: string;
  setDomainId: (value: string) => void;
  domains: Domain[];
}

export const DomainSelector: React.FC<DomainSelectorProps> = ({
  domainId,
  setDomainId,
  domains
}) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="domain">Domain</Label>
      <Select value={domainId} onValueChange={setDomainId}>
        <SelectTrigger>
          <SelectValue placeholder="Select a domain" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="no-domain">No specific domain</SelectItem>
          {domains.map((domain) => (
            <SelectItem 
              key={domain.id} 
              value={domain.id || "undefined-domain"}
            >
              {domain.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
