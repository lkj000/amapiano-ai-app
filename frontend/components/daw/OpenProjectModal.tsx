import React from 'react';
import { useQuery } from '@tanstack/react-query';
import backend from '~backend/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import LoadingSpinner from '../LoadingSpinner';
import ErrorMessage from '../ErrorMessage';

interface OpenProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadProject: (projectId: number) => void;
}

export default function OpenProjectModal({ isOpen, onClose, onLoadProject }: OpenProjectModalProps) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['dawProjectsList'],
    queryFn: () => backend.music.listProjects(),
    enabled: isOpen,
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black/80 backdrop-blur-md text-white border-white/10">
        <DialogHeader>
          <DialogTitle>Open Project</DialogTitle>
          <DialogDescription className="text-white/70">Select a project to load into the DAW.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto py-4">
          {isLoading && <LoadingSpinner />}
          {isError && <ErrorMessage error={error as Error} />}
          {data && (
            <div className="space-y-2">
              {data.projects.map(project => (
                <div key={project.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-white/10 transition-colors">
                  <div>
                    <p className="font-medium">{project.name}</p>
                    <p className="text-sm text-white/70">Last updated: {new Date(project.updatedAt).toLocaleString()}</p>
                  </div>
                  <Button onClick={() => {
                    onLoadProject(project.id);
                    onClose();
                  }} className="bg-yellow-400 text-black hover:bg-yellow-500">Load</Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
