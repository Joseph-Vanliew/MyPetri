import React, { useState, useRef } from 'react';
import { useDrop } from 'react-dnd';
import { ItemTypes } from './ItemTypes';
import PlaceNode from './PlaceNode';
import TransitionNode from './TransitionNode';
import Arc from './Arc';
import '../styles/Canvas.css';

const Canvas = () => {
    const [components, setComponents] = useState([]);
    const canvasRef = useRef(null);

    const [, drop] = useDrop({
        accept: [ItemTypes.PLACE, ItemTypes.TRANSITION, ItemTypes.ARC],
        drop: (item, monitor) => {
            const delta = monitor.getClientOffset();
            const gridSize = 20; // grid size
            const left = Math.round(delta.x / gridSize) * gridSize;
            const top = Math.round(delta.y / gridSize) * gridSize;

            setComponents((components) => [
                ...components,
                { ...item, left, top },
            ]);
        },
    });

    drop(canvasRef); // Attaching drop ref to canvasRef for

    return (
        <div ref={canvasRef} className="canvas">
            {components.map((component, index) => {
                switch (component.type) {
                    case ItemTypes.PLACE:
                        return (
                            <PlaceNode
                                key={index}
                                id={component.id}
                                style={{ position: 'absolute', left: component.left, top: component.top }}
                            />
                        );
                    case ItemTypes.TRANSITION:
                        return (
                            <TransitionNode
                                key={index}
                                id={component.id}
                                initialEnabled={false}
                                style={{ position: 'absolute', left: component.left, top: component.top }}
                            />
                        );
                    case ItemTypes.ARC:
                        return (
                            <Arc
                                key={index}
                                id={component.id}
                                initialType={component.initialType}
                                style={{ position: 'absolute', left: component.left, top: component.top }}
                            />
                        );
                    default:
                        return null;
                }
            })}
        </div>
    );
};

export default Canvas;
