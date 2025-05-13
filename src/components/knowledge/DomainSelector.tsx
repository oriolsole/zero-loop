
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
  // Ensure domainId is never an empty string
  const safeSelectedValue = domainId || "no-domain";
  
  return (
    <div className="space-y-2">
      <Label htmlFor="domain">Domain</Label>
      <Select value={safeSelectedValue} onValueChange={setDomainId}>
        <SelectTrigger>
          <SelectValue placeholder="Select a domain" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="no-domain">No specific domain</SelectItem>
          {domains.map((domain) => {
            // Ensure we never use an empty string as value
            const safeValue = domain.id ? domain.id : `domain-${domain.name.replace(/\s+/g, '-').toLowerCase()}`;
            return (
              <SelectItem 
                key={safeValue} 
                value={safeValue}
              >
                {domain.name}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
};
