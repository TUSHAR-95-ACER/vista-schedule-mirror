import { useState } from 'react';
import { useTrading } from '@/contexts/TradingContext';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { PageHeader } from '@/components/shared/MetricCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Pencil, Trash2, Check, X, Search, TrendingUp, Globe, Clock, BarChart3, Award, Crosshair, Settings2, Brain, AlertTriangle, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface EditableListProps {
  title: string;
  icon: LucideIcon;
  items: string[];
  onAdd: (item: string) => void;
  onUpdate: (prev: string, next: string) => void;
  onDelete: (item: string) => void;
}

function EditableCard({ title, icon: Icon, items, onAdd, onUpdate, onDelete }: EditableListProps) {
  const [newItem, setNewItem] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
        <span className="ml-auto text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{items.length}</span>
      </div>
      <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
        {items.map(item => (
          <div key={item} className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 group">
            {editing === item ? (
              <>
                <Input value={editValue} onChange={e => setEditValue(e.target.value)} className="h-7 text-xs flex-1"
                  onKeyDown={e => { if (e.key === 'Enter') { onUpdate(item, editValue); setEditing(null); } }} />
                <Button variant="ghost" size="icon" className="h-7 w-7 text-success" onClick={() => { onUpdate(item, editValue); setEditing(null); }}>
                  <Check className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(null)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : (
              <>
                <span className="flex-1 text-xs font-medium">{item}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => { setEditing(item); setEditValue(item); }}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive" onClick={() => onDelete(item)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input placeholder={`Add ${title.toLowerCase()}...`} value={newItem} onChange={e => setNewItem(e.target.value)} className="h-8 text-xs"
          onKeyDown={e => { if (e.key === 'Enter' && newItem.trim()) { onAdd(newItem.trim()); setNewItem(''); } }} />
        <Button variant="outline" size="sm" className="h-8 gap-1 text-xs shrink-0" onClick={() => { if (newItem.trim()) { onAdd(newItem.trim()); setNewItem(''); } }}>
          <Plus className="h-3 w-3" /> Add
        </Button>
      </div>
    </div>
  );
}

export default function ControlCenter() {
  const {
    customSetups, addCustomSetup, updateCustomSetup, deleteCustomSetup,
    customConfluences, addCustomConfluence, updateCustomConfluence, deleteCustomConfluence,
    markets, addMarket, updateMarket, deleteMarket,
    sessions, addSession, updateSession, deleteSession,
    conditions, addCondition, updateCondition, deleteCondition,
    gradesList, addGrade, updateGrade, deleteGrade,
    managementOptions, addManagement, updateManagement, deleteManagement,
    psychTags, addPsychTag, updatePsychTag, deletePsychTag,
    violations, addViolation, updateViolation, deleteViolation,
    notebookCategories, addNotebookCategory, updateNotebookCategory, deleteNotebookCategory,
  } = useTrading();

  const [search, setSearch] = useState('');

  const sections = [
    { title: 'Markets', icon: Globe, items: markets, onAdd: addMarket, onUpdate: updateMarket, onDelete: deleteMarket },
    { title: 'Setups', icon: TrendingUp, items: customSetups, onAdd: addCustomSetup, onUpdate: updateCustomSetup, onDelete: deleteCustomSetup },
    { title: 'Technical Points', icon: Crosshair, items: customConfluences, onAdd: addCustomConfluence, onUpdate: updateCustomConfluence, onDelete: deleteCustomConfluence },
    { title: 'Sessions', icon: Clock, items: sessions, onAdd: addSession, onUpdate: updateSession, onDelete: deleteSession },
    { title: 'Market Conditions', icon: BarChart3, items: conditions, onAdd: addCondition, onUpdate: updateCondition, onDelete: deleteCondition },
    { title: 'Grades', icon: Award, items: gradesList, onAdd: addGrade, onUpdate: updateGrade, onDelete: deleteGrade },
    { title: 'Trade Management', icon: Settings2, items: managementOptions, onAdd: addManagement, onUpdate: updateManagement, onDelete: deleteManagement },
    { title: 'Psychology Tags', icon: Brain, items: psychTags, onAdd: addPsychTag, onUpdate: updatePsychTag, onDelete: deletePsychTag },
    { title: 'Rule Violations', icon: AlertTriangle, items: violations, onAdd: addViolation, onUpdate: updateViolation, onDelete: deleteViolation },
    { title: 'Notebook Categories', icon: BookOpen, items: notebookCategories, onAdd: addNotebookCategory, onUpdate: updateNotebookCategory, onDelete: deleteNotebookCategory },
  ];

  const filtered = search
    ? sections.filter(s => s.title.toLowerCase().includes(search.toLowerCase()) || s.items.some(i => i.toLowerCase().includes(search.toLowerCase())))
    : sections;

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <PageHeader title="Control Center" subtitle="Master control for all system dropdowns & selectable fields">
        <ThemeToggle />
      </PageHeader>

      <div className="mb-6 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search categories..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-9 text-sm" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(s => (
          <EditableCard key={s.title} {...s} />
        ))}
      </div>
    </div>
  );
}
