export type ToolType = 
  | 'NONE'
  | 'PLACE'
  | 'TRANSITION'
  | 'ARC'
  | 'ARC_INHIBITOR'
  | 'ARC_BIDIRECTIONAL'
  | 'TEXT'
  | 'SHAPE';

export interface Tool {
  id: ToolType;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  category: 'elements' | 'arcs' | 'annotations';
  isActive: boolean;
}

export interface ToolOptions {
  PLACE: {
    radius: number;
  };
  TRANSITION: {
    width: number;
    height: number;
  };
  SHAPE: {
    shapeType: string;
  };
}

export interface ToolState {
  selectedTool: ToolType;
  toolOptions: ToolOptions;
} 