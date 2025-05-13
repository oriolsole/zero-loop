
import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Domain } from '@/types/intelligence';
import { ensureSafeDomainId, filterValidDomains } from '../lib/domainUtils';
import { Link } from 'lucide-react';

interface TitleFieldProps {
  title: string;
  setTitle: (title: string) => void;
  error?: string;
}

export function TitleField({ title, setTitle, error }: TitleFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="title" className={error ? "text-destructive" : ""}>Title {error && <span className="text-xs font-normal">({error})</span>}</Label>
      <Input
        id="title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Document title"
        required
        className={error ? "border-destructive" : ""}
      />
    </div>
  );
}

interface DomainFieldProps {
  domainId: string;
  setDomainId: (domainId: string) => void;
  domains: Domain[];
  error?: string;
}

export function DomainField({ domainId, setDomainId, domains, error }: DomainFieldProps) {
  // Ensure domainId is never an empty string
  const safeSelectedValue = ensureSafeDomainId(domainId);
  
  // Filter domains to ensure none have empty IDs
  const validDomains = filterValidDomains(domains);
  
  return (
    <div className="space-y-2">
      <Label htmlFor="domain" className={error ? "text-destructive" : ""}>Domain {error && <span className="text-xs font-normal">({error})</span>}</Label>
      <Select value={safeSelectedValue} onValueChange={setDomainId}>
        <SelectTrigger className={error ? "border-destructive" : ""}>
          <SelectValue placeholder="Select a domain" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="no-domain">No specific domain</SelectItem>
          {validDomains.map((domain) => (
            <SelectItem 
              key={domain.id} 
              value={domain.id}
            >
              {domain.name || "Unnamed Domain"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface SourceUrlFieldProps {
  sourceUrl: string;
  setSourceUrl: (url: string) => void;
  error?: string;
}

export function SourceUrlField({ sourceUrl, setSourceUrl, error }: SourceUrlFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="source" className={error ? "text-destructive" : ""}>
        Source URL (Optional) {error && <span className="text-xs font-normal">({error})</span>}
      </Label>
      <div className="flex items-center space-x-2">
        <Link className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <Input
          id="source"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          placeholder="https://example.com/document"
          className={error ? "border-destructive" : ""}
        />
      </div>
    </div>
  );
}

interface ContentFieldProps {
  content: string;
  setContent: (content: string) => void;
  error?: string;
}

export function ContentField({ content, setContent, error }: ContentFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="content" className={error ? "text-destructive" : ""}>
        Content {error && <span className="text-xs font-normal">({error})</span>}
      </Label>
      <Textarea
        id="content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Paste or type your knowledge content here"
        className={`min-h-[200px] ${error ? "border-destructive" : ""}`}
        required
      />
    </div>
  );
}
