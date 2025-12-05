import React, { useEffect, useRef, useState } from 'react';
import Dropdown from '../../helpers/Dropdown';

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

    const [autoDisposeEnabled, setAutoDisposeEnabled] = useState(true);
    const [lifetime, setLifetime] = useState(30); // seconds
    const [remainingLifetime, setRemainingLifetime] = useState<number | null>(null);

    const [fps, setFps] = useState<number | null>(null);

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

            host.setLifetime(autoDisposeEnabled ? lifetime : null);
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

    useEffect(() => {
        const host = hostRef.current;
        if (!host) return;

        host.setLifetime(autoDisposeEnabled ? lifetime : null);
    }, [autoDisposeEnabled, lifetime]);

    useEffect(() => {
        let rafId: number;

        const loop = () => {
            const host = hostRef.current;
            if (host) {
                const { fps: hostFps, remainingLifetime } = host.getStats();
                if (!Number.isNaN(hostFps) && hostFps > 0) {
                    setFps(hostFps);
                }
                setRemainingLifetime(remainingLifetime);
            }
            rafId = requestAnimationFrame(loop);
        };

        rafId = requestAnimationFrame(loop);

        return () => {
            cancelAnimationFrame(rafId);
        };
    }, []);

    useEffect(() => {
        const dropdown = new Dropdown(
            'data-dropdown',
            'data-dropdown-button',
            'data-dropdown-selected'
        );

        const toggleHandler = dropdown.toggle();
        const selectionHandler = dropdown.toggleSelection('data-dropdown-option');

        document.addEventListener('click', toggleHandler);
        document.addEventListener('click', selectionHandler);

        return () => {
            document.removeEventListener('click', toggleHandler);
            document.removeEventListener('click', selectionHandler);
        };
    }, []);

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
            <h1 className='dancing-fractals__title u-canvas-title'>Dancing Fractals</h1>

            <div className="dancing-fractals__ui">
                <div
                    className="dancing-fractals__ui--dropdown"
                    data-dropdown
                >
                    <button
                        type="button"
                        className="dancing-fractals__ui--dropdown-button"
                        data-dropdown-button
                    >
                        <span
                            className="dancing-fractals__ui--dropdown-selected"
                            data-dropdown-selected
                        >
                            {fractalKind === 'tree' ? 'Tree' : 'Flower Spiral'}
                        </span>
                    </button>

                    <ul className="dancing-fractals__ui--dropdown-menu">
                        <li>
                            <button
                                type="button"
                                className="dancing-fractals__ui--dropdown-option"
                                data-dropdown-option="Tree"
                                onClick={() => setFractalKind('tree')}
                            >
                                Tree
                            </button>
                        </li>
                        <li>
                            <button
                                type="button"
                                className="dancing-fractals__ui--dropdown-option"
                                data-dropdown-option="Flower Spiral"
                                onClick={() => setFractalKind('flower')}
                            >
                                Flower Spiral
                            </button>
                        </li>
                    </ul>
                </div>

                <button
                    type="button"
                    className="dancing-fractals__ui--restart-btn"
                    onClick={handleRestart}
                >
                    Restart
                </button>

                <div className="dancing-fractals__ui--lifetime">
                    <label className="dancing-fractals__ui--checkbox">
                        <input
                            type="checkbox"
                            checked={autoDisposeEnabled}
                            onChange={e => setAutoDisposeEnabled(e.target.checked)}
                        />
                        <span className="dancing-fractals__ui--checkbox-box" />
                        <span className="dancing-fractals__ui--checkbox-text">Auto-dispose</span>
                    </label>

                    <label className="dancing-fractals__ui--lifetime-slider">
                        Lifetime:{" "}
                        {autoDisposeEnabled ? `${lifetime.toFixed(0)}s` : "∞"}
                        <input
                            type="range"
                            min={5}
                            max={60}
                            step={1}
                            disabled={!autoDisposeEnabled}
                            value={lifetime}
                            onChange={e =>
                                setLifetime(Number(e.target.value))
                            }
                            className='dancing-fractals__ui--slider'
                        />
                    </label>
                </div>

                <div className="dancing-fractals__ui--controls-wrapper">
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

                {fps !== null && (
                    <div className="dancing-fractals__ui--debug">
                        <span>FPS: {fps.toFixed(1)}</span>
                        {autoDisposeEnabled && remainingLifetime !== null && (
                            <>
                                <span> · </span>
                                <span>
                                    Time left: {remainingLifetime.toFixed(1)}s
                                </span>
                            </>
                        )}
                    </div>
                )}
            </div>
        </section>   
    );
}

export default DancingFractals;