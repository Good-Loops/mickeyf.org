import React from 'react';
import type { MandelbrotConfig } from '@/animations/dancing fractals/config/MandelbrotConfig';

type Props = {
    config: MandelbrotConfig;
    onChange: (patch: Partial<MandelbrotConfig>) => void;
};

const MandelbrotControls: React.FC<Props> = ({ config, onChange }) => {
    return (
        <div className="dancing-fractals__ui--controls">
            <div className="dancing-fractals__ui--controls__group">
                <label>
                    Rotation speed: {config.rotationSpeed.toFixed(3)} rad/s
                    <input
                        type="range"
                        min={-1}
                        max={1}
                        step={0.01}
                        value={config.rotationSpeed}
                        onChange={e =>
                            onChange({ rotationSpeed: Number(e.target.value) })
                        }
                        className="dancing-fractals__ui--slider"
                    />
                </label>
            </div>
            <div className="dancing-fractals__ui--controls__group">
                <label>
                    Palette phase: {config.palettePhase.toFixed(3)}
                    <input
                        type="range"
                        min={0}
                        max={0.999}
                        step={0.001}
                        value={config.palettePhase}
                        onChange={e =>
                            onChange({ palettePhase: Number(e.target.value) })
                        }
                        className="dancing-fractals__ui--slider"
                    />
                </label>
            </div>

            <div className="dancing-fractals__ui--controls__group">
                <label>
                    Palette speed: {config.paletteSpeed.toFixed(3)}
                    <input
                        type="range"
                        min={0}
                        max={0.5}
                        step={0.001}
                        value={config.paletteSpeed}
                        onChange={e =>
                            onChange({ paletteSpeed: Number(e.target.value) })
                        }
                        className="dancing-fractals__ui--slider"
                    />
                </label>
            </div>

            <div className="dancing-fractals__ui--controls__group">
                <label>
                    Palette gamma: {config.paletteGamma.toFixed(2)}
                    <input
                        type="range"
                        min={0.2}
                        max={3}
                        step={0.05}
                        value={config.paletteGamma}
                        onChange={e =>
                            onChange({ paletteGamma: Number(e.target.value) })
                        }
                        className="dancing-fractals__ui--slider"
                    />
                </label>
            </div>

            <div className="dancing-fractals__ui--controls__group">
                <label>
                    Max iterations: {config.maxIterations}
                    <input
                        type="range"
                        min={50}
                        max={2000}
                        step={10}
                        value={config.maxIterations}
                        onChange={e =>
                            onChange({ maxIterations: Number(e.target.value) })
                        }
                        className="dancing-fractals__ui--slider"
                    />
                </label>
            </div>

            <div className="dancing-fractals__ui--controls__group">
                <label>
                    Bailout radius: {config.bailoutRadius}
                    <input
                        type="range"
                        min={2}
                        max={10}
                        step={0.5}
                        value={config.bailoutRadius}
                        onChange={e =>
                            onChange({ bailoutRadius: Number(e.target.value) })
                        }
                        className="dancing-fractals__ui--slider"
                    />
                </label>
            </div>
        </div>
    );
};

export default MandelbrotControls;
