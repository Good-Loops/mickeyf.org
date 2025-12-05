import React, { useEffect, useRef, useState } from 'react';

import TreeControls from '../../animations/dancing fractals/components/TreeControls';
import FlowerSpiralControls from '../../animations/dancing fractals/components/FlowerSpiralControls';

import Tree from '../../animations/dancing fractals/classes/Tree';
import { type TreeConfig, defaultTreeConfig } from '../../animations/dancing fractals/config/TreeConfig'; 

import FlowerSpiral from '../../animations/dancing fractals/classes/FlowerSpiral';
import { type FlowerSpiralConfig, defaultFlowerSpiralConfig } from '../../animations/dancing fractals/config/FlowerSpiralConfig';
import { FractalHost } from '../../animations/dancing fractals/interfaces/FractalHost';
import { createFractalHost } from '../../animations/dancing fractals/createFractalHost';

type FractalKind = 'tree' | 'flower';

const DancingFractals: React.FC = () => {
    const containerRef = useRef<HTMLElement | null>(null);

    const hostRef = useRef<FractalHost | null>(null);

     // Which fractal is currently selected
    const [fractalKind, setFractalKind] = useState<FractalKind>('tree');

    // Separate config state for each fractal type
    const [treeConfig, setTreeConfig] = useState<TreeConfig>(defaultTreeConfig);
    const [flowerSpiralConfig, setFlowerSpiralConfig] = useState<FlowerSpiralConfig>(defaultFlowerSpiralConfig);

    // Create the host (PIXI app + canvas) once
    useEffect(() => {
        if (!containerRef.current) return;

        let cancelled = false;

        (async () => {
            const host = await createFractalHost(containerRef.current!);

            if (cancelled) {
                host.dispose();
                return;
            }

            hostRef.current = host;

            // Mount initial fractal based on current kind
            if (fractalKind === 'tree') {
                host.setFractal(Tree, treeConfig);
            } else {
                host.setFractal(FlowerSpiral, flowerSpiralConfig);
            }
        })();

        return () => {
            cancelled = true;
            hostRef.current?.dispose();
            hostRef.current = null;
        };
    }, []);

    // Switch fractal when fractalKind changes (but reuse same canvas/app)
    useEffect(() => {
        const host = hostRef.current;
        if (!host) return;

        if (fractalKind === 'tree') {
            host.setFractal(Tree, treeConfig);
        } else {
            host.setFractal(FlowerSpiral, flowerSpiralConfig);
        }
    }, [fractalKind]);

    const handleRestart = () => { hostRef.current?.restart(); };

    // Handle tree config changes: update React state + push patch into fractal
    const handleTreeConfigChange = (patch: Partial<TreeConfig>) => {
        setTreeConfig(prev => {
            const next = { ...prev, ...patch };
            // Send only the patch down to the fractal
            hostRef.current?.updateConfig(patch);
            return next;
        });
    };

    const handleFlowerConfigChange = (patch: Partial<FlowerSpiralConfig>) => {
        setFlowerSpiralConfig(prev => {
            const next = { ...prev, ...patch };
            hostRef.current?.updateConfig(patch);
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

                    <button
                        type="button"
                        className="fractal-ui__restart-btn"
                        onClick={handleRestart}
                    >
                        Restart
                    </button>
                </div>

                <div className="fractal-ui__controls">
                    {fractalKind === 'tree' && (
                        <TreeControls
                            config={treeConfig}
                            onChange={handleTreeConfigChange}
                        />
                    )}

                    {fractalKind === 'flower' && (
                        <FlowerSpiralControls
                            config={flowerSpiralConfig}
                            onChange={handleFlowerConfigChange}
                        />
                    )}
                </div>
            </div>
        </section>   
    );
}

export default DancingFractals;