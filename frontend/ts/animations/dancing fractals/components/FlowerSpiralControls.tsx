import React from 'react';
import type { FlowerSpiralConfig } from '../config/FlowerSpiralConfig';

interface FlowerSpiralControlsProps {
    config: FlowerSpiralConfig;
    onChange: (patch: Partial<FlowerSpiralConfig>) => void;
}

const FlowerSpiralControls: React.FC<FlowerSpiralControlsProps> = ({ config, onChange }) => {
    return (
        <div className="dancing-fractals__ui--controls">
            <div className="dancing-fractals__ui--controls__group">
                <label>
                    Flowers: {config.flowerAmount}
                    <input
                        type="range"
                        min={2}
                        max={60}
                        step={1}
                        value={config.flowerAmount}
                        onChange={e =>
                            onChange({ flowerAmount: Number(e.target.value) })
                        }
                        className='dancing-fractals__ui--slider'
                    />
                </label>
            </div>

            <div className="dancing-fractals__ui--controls__group">
                <label>
                    Petals per flower: {config.petalsPerFlower}
                    <input
                        type="range"
                        min={1}
                        max={12}
                        step={1}
                        value={config.petalsPerFlower}
                        onChange={e =>
                            onChange({ petalsPerFlower: Number(e.target.value) })
                        }
                        className='dancing-fractals__ui--slider'
                    />
                </label>
            </div>

            <div className="dancing-fractals__ui--controls__group">
                <label>
                    Rotation speed: {config.petalRotationSpeed.toFixed(2)}
                    <input
                        type="range"
                        min={0}
                        max={6}
                        step={0.1}
                        value={config.petalRotationSpeed}
                        onChange={e =>
                            onChange({ petalRotationSpeed: Number(e.target.value) })
                        }
                        className='dancing-fractals__ui--slider'
                    />
                </label>
            </div>

            <div className="dancing-fractals__ui--controls__group">
                <label>
                    Flowers per second: {config.flowersPerSecond.toFixed(1)}
                    <input
                        type="range"
                        min={1}
                        max={30}
                        step={0.5}
                        value={config.flowersPerSecond}
                        onChange={e =>
                            onChange({ flowersPerSecond: Number(e.target.value) })
                        }
                        className='dancing-fractals__ui--slider'
                    />
                </label>
            </div>

            <div className="dancing-fractals__ui--controls__group">
                <label>
                    Revolutions: {config.revolutions.toFixed(1)}
                    <input
                        type="range"
                        min={1}
                        max={10}
                        step={0.5}
                        value={config.revolutions}
                        onChange={e =>
                            onChange({ revolutions: Number(e.target.value) })
                        }
                        className='dancing-fractals__ui--slider'
                    />
                </label>
            </div>
        </div>
    );
};

export default FlowerSpiralControls;
