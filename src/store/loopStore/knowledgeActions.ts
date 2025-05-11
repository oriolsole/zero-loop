
import { LoopState } from '../useLoopStore';
import { calculateGraphLayout } from '../../utils/knowledgeGraph';

type SetFunction = (
  partial: LoopState | Partial<LoopState> | ((state: LoopState) => LoopState | Partial<LoopState>),
  replace?: boolean,
) => void;

type GetFunction = () => LoopState;

export const createKnowledgeActions = (
  set: SetFunction,
  get: GetFunction
) => ({
  recalculateGraphLayout: () => {
    const { domains, activeDomainId } = get();
    const activeDomainIndex = domains.findIndex(d => d.id === activeDomainId);
    
    if (activeDomainIndex === -1) return;
    
    const updatedDomains = [...domains];
    const domain = { ...updatedDomains[activeDomainIndex] };
    
    // Recalculate node positions
    domain.knowledgeNodes = calculateGraphLayout(
      domain.knowledgeNodes, 
      domain.knowledgeEdges || []
    );
    
    updatedDomains[activeDomainIndex] = domain;
    set({ domains: updatedDomains });
  },
});
