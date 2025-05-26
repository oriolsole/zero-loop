
import { useEffect } from "react";
import MainLayout from "@/components/layouts/MainLayout";
import Dashboard from "@/components/Dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Brain, BookOpen, Settings, PlusCircle } from "lucide-react";
import { useLoopStore } from "@/store/useLoopStore";

const Index = () => {
  const { domains, activeDomainId, setActiveDomain } = useLoopStore();
  const activeData = domains.find(domain => domain.id === activeDomainId) || domains[0];
  
  useEffect(() => {
    // If there's at least one domain, ensure we have an active domain selected
    if (domains.length > 0 && !activeDomainId) {
      setActiveDomain(domains[0].id);
    }
  }, [domains, activeDomainId, setActiveDomain]);
  
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <section className="mb-12">
          <h1 className="text-4xl font-bold mb-4 fade-in">ZeroLoop</h1>
          <p className="text-xl text-muted-foreground mb-6 max-w-3xl fade-in-delay-1">
            A self-evolving intelligence framework for simulating, observing, and evolving artificial reasoning.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            <Card className="border-2 border-primary/20 bg-primary/5 hover:border-primary/40 transition-all">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  Learning Domains
                </CardTitle>
                <CardDescription>
                  Explore and manage your learning domains
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {domains.length === 0 
                    ? "Create your first learning domain to begin" 
                    : `You have ${domains.length} learning domain${domains.length !== 1 ? 's' : ''} configured`
                  }
                </p>
                <div className="flex gap-2">
                  <Button asChild variant="default">
                    <Link to="/">
                      <Brain className="mr-2 h-4 w-4" />
                      Dashboard
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/domain/new">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      New Domain
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card className="hover:border-primary/20 transition-all">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Knowledge Management
                </CardTitle>
                <CardDescription>
                  Browse and enhance your knowledge base
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Manage insights, upload documents, and explore the knowledge graph
                </p>
                <Button asChild>
                  <Link to="/knowledge">
                    <BookOpen className="mr-2 h-4 w-4" />
                    Knowledge
                  </Link>
                </Button>
              </CardContent>
            </Card>
            
            <Card className="hover:border-primary/20 transition-all">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Settings & Configuration
                </CardTitle>
                <CardDescription>
                  Configure your ZeroLoop environment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Manage integration settings, data storage, and preferences
                </p>
                <Button asChild variant="outline">
                  <Link to="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
        
        {activeData && (
          <section className="mt-12 fade-in-delay-2">
            <h2 className="text-2xl font-bold mb-6">Active Dashboard</h2>
            <Dashboard />
          </section>
        )}
      </div>
    </MainLayout>
  );
};

export default Index;
