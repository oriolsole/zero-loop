
import Dashboard from "@/components/Dashboard";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { user } = useAuth();

  return (
    <Dashboard />
  );
};

export default Index;
