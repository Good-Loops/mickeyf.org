import React, { useEffect, useRef, useState } from 'react';
import runDancingFractals from '../../animations/dancing fractals/runDancingFractals';

import type FractalController from '../../animations/dancing fractals/interfaces/FractalController';
import TreeControls from '../../animations/dancing fractals/components/TreeControls';

import Tree from '../../animations/dancing fractals/classes/Tree';
import { type TreeConfig, defaultTreeConfig } from '../../animations/dancing fractals/config/TreeConfig'; 

import FlowerSpiral from '../../animations/dancing fractals/classes/FlowerSpiral';

type FractalKind = 'tree' | 'flower';

// TODO: Define a real config + default for FlowerSpiral later.
// For now we just use an empty object so typing is easy.
type FlowerConfig = Record<string, never>;
const defaultFlowerConfig: FlowerConfig = {};

const DancingFractals: React.FC = () => {
    const containerRef = useRef<HTMLElement | null>(null);

    // Store controller for the current fractal
    const controllerRef = useRef<FractalController<any> | null>(null);

     // Which fractal is currently selected
    const [fractalKind, setFractalKind] = useState<FractalKind>('tree');

    // Separate config state for each fractal type
    const [treeConfig, setTreeConfig] = useState<TreeConfig>(defaultTreeConfig);
    const [flowerConfig] = useState<FlowerConfig>(defaultFlowerConfig);

    useEffect(() => {
        if (!containerRef.current) return;

        let cancelled = false;

        (async () => {
            // Dispose any previous fractal
            controllerRef.current?.dispose();
            controllerRef.current = null;

            // Choose class + initial config based on selection
            const { Class, initialConfig } =
                fractalKind === 'tree'
                    ? { Class: Tree, initialConfig: treeConfig }
                    : { Class: FlowerSpiral, initialConfig: flowerConfig };

            const controller = await runDancingFractals(
                containerRef.current!,
                Class as any,
                initialConfig
            );

            if (!cancelled) {
                controllerRef.current = controller;
            } else {
                controller.dispose();
            }
        })();

        return () => {
            cancelled = true;
            controllerRef.current?.dispose();
            controllerRef.current = null;
        };
    }, [fractalKind, treeConfig, flowerConfig]);

    // Handle tree config changes: update React state + push patch into fractal
    const handleTreeConfigChange = (patch: Partial<TreeConfig>) => {
        setTreeConfig(prev => {
            const next = { ...prev, ...patch };
            // Send only the patch down to the fractal
            controllerRef.current?.updateConfig(patch);
            return next;
        });
    };

    return (
        <section className='dancing-fractals' ref={containerRef as any}>
            <h1 className='u-canvas-title'>Dancing Fractals</h1>

            <div className="fractal-ui">
                <div className="fractal-ui__selector">
                    <label>
                        Fractal:
                        <select
                            value={fractalKind}
                            onChange={e =>
                                setFractalKind(e.target.value as FractalKind)
                            }
                        >
                            <option value="tree">Tree</option>
                            <option value="flower">Flower Spiral</option>
                        </select>
                    </label>
                </div>

                <div className="fractal-ui__controls">
                    {fractalKind === 'tree' && (
                        <TreeControls
                            config={treeConfig}
                            onChange={handleTreeConfigChange}
                        />
                    )}

                    {fractalKind === 'flower' && (
                        <p className="fractal-controls__placeholder">
                            Flower controls coming soon…
                        </p>
                    )}
                </div>
            </div>
        </section>   
    );
}

export default DancingFractals;