
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Dashboard from "@/components/Dashboard";

const Index = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Redirect to the knowledge management page
    navigate("/knowledge");
  }, [navigate]);

  // Render the Dashboard component while redirecting
  return <Dashboard />;
};

export default Index;
