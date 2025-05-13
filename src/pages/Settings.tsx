
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import SupabaseControl from '@/components/SupabaseControl';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, User, Globe, Trash, HardDrive, Shield } from 'lucide-react';

const Settings = () => {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto py-6 px-4 max-w-5xl">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>
        
        <Tabs defaultValue="database" className="space-y-4">
          <TabsList className="mb-4">
            <TabsTrigger value="database" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Database
            </TabsTrigger>
            <TabsTrigger value="account" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Account
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Preferences
            </TabsTrigger>
            <TabsTrigger value="data" className="flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              Data Management
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="database">
            <SupabaseControl />
            
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Database Configuration Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-sm">Managing Sync Issues</h3>
                    <p className="text-sm text-muted-foreground">
                      If you're seeing repeated console messages about queue size or sync issues, 
                      try using the "Reset All Sync Data" button in the Database tab. This will clear 
                      all tracking information and allow the system to start fresh.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-sm">Optimizing Storage Usage</h3>
                    <p className="text-sm text-muted-foreground">
                      For better performance, regularly sync your data to avoid large queue buildups.
                      ZeroLoop automatically trims large content fields to conserve local storage space.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="account">
            <Card>
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>
                  Manage your account preferences and authentication settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  User account settings will appear here in a future update.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="preferences">
            <Card>
              <CardHeader>
                <CardTitle>Application Preferences</CardTitle>
                <CardDescription>
                  Customize your ZeroLoop experience
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Application preferences will appear here in a future update.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="data">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5" />
                  Data Management
                </CardTitle>
                <CardDescription>
                  Manage your local and remote data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium">Storage Usage</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      ZeroLoop stores learning loops, knowledge nodes, and other data in your browser's local storage.
                      If you encounter storage warnings, use the Database tab to manage sync operations.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium">Data Synchronization</h3>
                    <p className="text-sm text-muted-foreground">
                      Data is synchronized to Supabase when remote logging is enabled. The system will
                      automatically batch and prioritize items to avoid overwhelming local storage.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Settings;
