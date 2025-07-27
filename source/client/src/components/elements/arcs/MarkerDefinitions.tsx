// frontend/src/components/elements/arcs/MarkerDefinitions.tsx
export const MarkerDefinitions = () => {
  return (
    <defs>
      {/* Arrowhead for regular and bidirectional end */}
      <marker
        id="arrow"
        viewBox="0 0 10 10"
        refX="9"
        refY="5"
        markerWidth="8"
        markerHeight="8"
        orient="auto-start-reverse"
      >
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#fff" />
      </marker>

      {/* Arrowhead for bidirectional start */}
      <marker
        id="bidirectional"
        viewBox="0 0 10 10"
        refX="1" 
        refY="5"
        markerWidth="8"
        markerHeight="8"
        orient="auto-start-reverse"
      >
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#fff" />
      </marker>
    </defs>
  );
}; 