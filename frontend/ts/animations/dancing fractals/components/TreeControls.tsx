import React from 'react';
import type { TreeConfig } from '../config/TreeConfig';

interface TreeControlsProps {
    config: TreeConfig;
    onChange: (patch: Partial<TreeConfig>) => void;
}

const TreeControls: React.FC<TreeControlsProps> = ({ config, onChange }) => {
    return (
        <div className="fractal-controls">
            <div className="fractal-controls__group">
                <label>
                    Max depth: {config.maxDepth}
                    <input
                        type="range"
                        min={1}
                        max={9}
                        value={config.maxDepth}
                        onChange={e =>
                            onChange({ maxDepth: Number(e.target.value) })
                        }
                    />
                </label>
            </div>

            <div className="fractal-controls__group">
                <label>
                    Rotation speed: {config.rotationSpeed.toFixed(2)}
                    <input
                        type="range"
                        min={0}
                        max={2}
                        step={0.05}
                        value={config.rotationSpeed}
                        onChange={e =>
                            onChange({
                                rotationSpeed: Number(e.target.value),
                            })
                        }
                    />
                </label>
            </div>

            <div className="fractal-controls__group">
                <label>
                    Branch scale: {config.branchScale.toFixed(2)}
                    <input
                        type="range"
                        min={0.4}
                        max={0.9}
                        step={0.01}
                        value={config.branchScale}
                        onChange={e =>
                            onChange({
                                branchScale: Number(e.target.value),
                            })
                        }
                    />
                </label>
            </div>
        </div>
    );
};

export default TreeControls;
