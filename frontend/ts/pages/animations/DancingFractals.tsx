import React, { useEffect, useRef, useState } from 'react';
import Dropdown from '@/components/Dropdown';

import TreeControls from '@/animations/dancing fractals/components/TreeControls';
import FlowerSpiralControls from '@/animations/dancing fractals/components/FlowerSpiralControls';

import Tree from '@/animations/dancing fractals/classes/Tree';
import { type TreeConfig, defaultTreeConfig } from '@/animations/dancing fractals/config/TreeConfig'; 

import FlowerSpiral from '@/animations/dancing fractals/classes/FlowerSpiral';
import { type FlowerSpiralConfig, defaultFlowerSpiralConfig } from '@/animations/dancing fractals/config/FlowerSpiralConfig';
import { FractalHost } from '@/animations/dancing fractals/interfaces/FractalHost';
import { createFractalHost } from '@/animations/dancing fractals/createFractalHost';

import AudioHandler from '@/animations/helpers/AudioHandler';
import MusicControls from '@/components/MusicControls';
import notAllowedCursor from '@/assets/cursors/notallowed.cur';
import FullscreenButton from '@/components/FullscreenButton';

type FractalKind = 'tree' | 'flower';

const DancingFractals: React.FC = () => {
    const containerRef = useRef<HTMLDivElement | null>(null);

    const hostRef = useRef<FractalHost | null>(null);

    const [audioState, setAudioState] = useState(AudioHandler.state);
    const [hasAudio, setHasAudio] = useState(AudioHandler.hasAudio());

    const fileInputRef = useRef<HTMLInputElement | null>(null);

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
        return AudioHandler.subscribe((s) => {
            setAudioState(s);
            setHasAudio(AudioHandler.hasAudio());
        });
    }, []);


    // Hook upload button to AudioHandler
    useEffect(() => {
        const fileInput = fileInputRef.current;
        if (!fileInput) return;

        return AudioHandler.initializeUploadButton(fileInput);
    }, []);

    // Lifetime changes
    useEffect(() => {
        const host = hostRef.current;
        if (!host) return;

        host.setLifetime(autoDisposeEnabled ? lifetime : null);
    }, [autoDisposeEnabled, lifetime]);

    // FPS + remaining lifetime monitoring loop
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

    // Stop audio on unmount
    useEffect(() => {
        return () => {
            AudioHandler.dispose();
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

    // Handle flower spiral config changes: update React state + push patch into fractal
    const handleFlowerConfigChange = (patch: Partial<FlowerSpiralConfig>) => {
        setFlowerSpiralConfig(prev => {
            const next = { ...prev, ...patch };
            hostRef.current?.updateConfig(patch);
            return next;
        });
    };

    const uiClassName = 
        'dancing-fractals__ui' +
        (audioState.playing ? ' dancing-fractals__ui--locked' : '');

    const uiStyle = audioState.playing
        ? { cursor: `url(${notAllowedCursor}), not-allowed` }
        : undefined;

    const handlePlay = () => AudioHandler.play();
    const handlePause = () => AudioHandler.pause();
    const handleStop = () => AudioHandler.stop();

    return (
        <section className='dancing-fractals'>
            <h1 className='dancing-fractals__title canvas-title'>Dancing Fractals</h1>

            <div className="dancing-fractals__canvas-wrapper" ref={containerRef}>
                <FullscreenButton 
                    targetRef={containerRef} 
                    className='dancing-fractals__fullscreen-btn'
                />
            </div>

            <div className={uiClassName} style={uiStyle}>
                {audioState.playing && (
                    <div className="dancing-fractals__ui--overlay" />
                )}

                <Dropdown
                    options={[
                        { value: 'tree', label: 'Tree' },
                        { value: 'flower', label: 'Flower Spiral' },
                    ]}
                    value={fractalKind}
                    onChange={(val) => setFractalKind(val as FractalKind)}
                    disabled={audioState.playing}
                    className="dancing-fractals__ui--dropdown"
                    buttonClassName="dancing-fractals__ui--dropdown-button"
                    selectedClassName="dancing-fractals__ui--dropdown-selected"
                    caretClassName="dancing-fractals__ui--dropdown-caret"
                    menuClassName="dancing-fractals__ui--dropdown-menu"
                    optionClassName="dancing-fractals__ui--dropdown-option"
                />

                <button className="dancing-fractals__ui--restart-btn"
                    type="button"
                    onClick={handleRestart}
                    disabled={audioState.playing}
                >
                    Restart
                </button>

                <div className="dancing-fractals__ui--lifetime">
                    <label className="dancing-fractals__ui--checkbox">
                        <input
                            type="checkbox"
                            checked={autoDisposeEnabled}
                            onChange={e => setAutoDisposeEnabled(e.target.checked)}
                            disabled={audioState.playing}
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
                            disabled={!autoDisposeEnabled || audioState.playing}
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
                            onChange={patch => {
                                if(audioState.playing) return;
                                handleTreeConfigChange(patch);
                            }}
                        />
                    )}

                    {fractalKind === 'flower' && (
                        <FlowerSpiralControls
                            config={flowerSpiralConfig}
                            onChange={patch => {
                                if(audioState.playing) return;
                                handleFlowerConfigChange(patch);
                            }}
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
            
            <div className="dancing-fractals__transport">
                <div className="dancing-fractals__transport-left">
                    <MusicControls
                        hasAudio={hasAudio}
                        isPlaying={audioState.playing}
                        onPlay={handlePlay}
                        onPause={handlePause}
                        onStop={handleStop}
                    />
                </div>

                <div className="dancing-fractals__upload floating">
                    <label
                        className="dancing-fractals__upload-btn"
                        htmlFor="fractal-music-upload"
                    >
                        Upload Music
                    </label>

                    <input
                        id="fractal-music-upload"
                        type="file"
                        accept="audio/*"
                        className="dancing-fractals__input"
                        ref={fileInputRef}
                    />
                </div>
            </div>
        </section>   
    );
}

export default DancingFractals;