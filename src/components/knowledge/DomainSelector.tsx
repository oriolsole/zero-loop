
import React from 'react';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ensureSafeDomainId, filterValidDomains } from '@/utils/domainUtils';

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
  const safeSelectedValue = ensureSafeDomainId(domainId);
  
  // Filter domains to ensure none have empty IDs
  const validDomains = filterValidDomains(domains);
  
  return (
    <div className="space-y-2">
      <Label htmlFor="domain">Domain</Label>
      <Select value={safeSelectedValue} onValueChange={setDomainId}>
        <SelectTrigger>
          <SelectValue placeholder="Select a domain" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="no-domain">No specific domain</SelectItem>
          {validDomains.map((domain) => {
            // Generate a safe value from name if id is somehow still empty
            const safeValue = domain.id || `domain-${domain.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`;
            return (
              <SelectItem 
                key={safeValue} 
                value={safeValue}
              >
                {domain.name || "Unnamed Domain"}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
};
