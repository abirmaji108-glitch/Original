import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Folder, Calendar, Download, Trash2 } from "lucide-react";

interface Project {
  id: string;
  name: string;
  date: string;
  preview: string;
}

interface ProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  onProjectSelect: (project: Project) => void;
  onProjectDelete: (projectId: string) => void;
}

export function ProjectModal({ 
  open, 
  onOpenChange, 
  projects, 
  onProjectSelect, 
  onProjectDelete 
}: ProjectModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Your Projects</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div
              key={project.id}
              className="border rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer group"
            >
              <div className="aspect-video bg-gray-100 rounded-md mb-3 overflow-hidden">
                <iframe
                  srcDoc={project.preview}
                  className="w-full h-full pointer-events-none"
                  title={project.name}
                />
              </div>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 flex-1">
                  <Folder className="w-4 h-4 text-purple-600" />
                  <h3 className="font-semibold text-sm truncate">{project.name}</h3>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                <Calendar className="w-3 h-3" />
                <span>{project.date}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => onProjectSelect(project)}
                >
                  <Download className="w-3 h-3 mr-1" />
                  Load
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onProjectDelete(project.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
          {projects.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              <Folder className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No saved projects yet</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
