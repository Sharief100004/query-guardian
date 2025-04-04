
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Keyboard } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const KeyboardShortcutsModal = ({ isOpen, onClose }: KeyboardShortcutsModalProps) => {
  // Define all keyboard shortcuts
  const shortcuts = [
    { keys: ['Ctrl/Cmd', 'Enter'], description: 'Analyze SQL query' },
    { keys: ['Ctrl/Cmd', 'S'], description: 'Save current report' },
    { keys: ['Ctrl/Cmd', 'K'], description: 'Open keyboard shortcuts' },
    { keys: ['Ctrl/Cmd', 'F'], description: 'Search in editor' },
    { keys: ['Ctrl/Cmd', 'Z'], description: 'Undo last change' },
    { keys: ['Ctrl/Cmd', 'Shift', 'Z'], description: 'Redo last change' },
    { keys: ['Ctrl/Cmd', '/'], description: 'Comment/uncomment selection' },
    { keys: ['Ctrl/Cmd', 'A'], description: 'Select all text' },
    { keys: ['Tab'], description: 'Indent selection' },
    { keys: ['Shift', 'Tab'], description: 'Unindent selection' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Keyboard className="mr-2" size={18} />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        
        <div className="my-4">
          <div className="rounded-md border overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-2 text-sm font-medium">Shortcut</th>
                  <th className="text-left p-2 text-sm font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {shortcuts.map((shortcut, index) => (
                  <tr key={index} className="border-t">
                    <td className="p-2 text-sm">
                      <div className="flex flex-wrap gap-1">
                        {shortcut.keys.map((key, i) => (
                          <span key={i} className="px-2 py-1 rounded bg-muted text-xs font-mono inline-block">
                            {key}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-2 text-sm">{shortcut.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default KeyboardShortcutsModal;
