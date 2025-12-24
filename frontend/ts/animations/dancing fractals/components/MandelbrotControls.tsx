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
                    Zoom: {config.zoom.toFixed(0)}
                    <input
                        type="range"
                        min={50}
                        max={1000}
                        step={10}
                        value={config.zoom}
                        onChange={e =>
                            onChange({ zoom: Number(e.target.value) })
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

            <div className="dancing-fractals__ui--controls__group">
                <label className="dancing-fractals__ui--checkbox">
                    <input
                        type="checkbox"
                        checked={config.smoothColoring}
                        onChange={e =>
                            onChange({ smoothColoring: e.target.checked })
                        }
                    />
                    <span className="dancing-fractals__ui--checkbox-box" />
                    <span className="dancing-fractals__ui--checkbox-text">
                        Smooth coloring
                    </span>
                </label>
            </div>
        </div>
    );
};

export default MandelbrotControls;
