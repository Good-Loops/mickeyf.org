import React, { useEffect, useRef } from "react";
import { useAuth } from '@/context/AuthContext';
import p4Vega from '@/games/p4-Vega/p4-Vega';
import FullscreenButton from "@/components/FullscreenButton";

const P4Vega: React.FC = () => {
    const canvasWrapperRef = useRef<HTMLDivElement | null>(null);
    const { isAuthenticated, userName } = useAuth();

    useEffect(() => {
        if (!canvasWrapperRef.current) return;

        let dispose: (() => void) | undefined;

        (async () => {
            dispose = await p4Vega(canvasWrapperRef.current!, {
                isAuthenticated,
                userName,
            });
        })();

        return () => dispose?.();
    }, []);

    return (
        <section className='p4-vega' data-p4-vega>
            <h1 className='p4-vega__title u-canvas-title'>p4-Vega</h1>

            <div
                className="p4-vega__canvas-wrapper"
                ref={canvasWrapperRef}
            >
                <FullscreenButton
                    targetRef={canvasWrapperRef}
                    className="p4-vega__fullscreen-btn"
                />
            </div>

            <div className='p4-vega__ui'>
                <label className='p4-vega__ui--option' data-checkbox>
                    <input className='p4-vega__ui--checkbox' type='checkbox' data-bg-music-playing />
                    <span className='p4-vega__ui--option-btn'>Background Music</span>
                </label>
                <label className='p4-vega__ui--option' data-checkbox>
                    <input className='p4-vega__ui--checkbox' type='checkbox' data-musical-notes-playing />
                    <span className='p4-vega__ui--option-btn'>Notes Playing</span>
                </label>
                <div className='p4-vega__ui--dropdown-grid'>
                    <div className='p4-vega__ui--dropdown' data-dropdown-keys>
                        <button className='p4-vega__ui--dropdown-btn' data-dropdown-btn>Key: &nbsp;<span className='u-truncate' data-selected-key>C</span></button>
                        <div className='p4-vega__ui--dropdown-menu p4-vega__ui--dropdown-menu-keys'>
                            <div className='p4-vega__ui--dropdown-menu-item' data-key='C'>C</div>
                            <div className='p4-vega__ui--dropdown-menu-item' data-key='C#/Db'>C#/Db</div>
                            <div className='p4-vega__ui--dropdown-menu-item' data-key='D'>D</div>
                            <div className='p4-vega__ui--dropdown-menu-item' data-key='D#/Eb'>D#/Eb</div>
                            <div className='p4-vega__ui--dropdown-menu-item' data-key='E'>E</div>
                            <div className='p4-vega__ui--dropdown-menu-item' data-key='F'>F</div>
                            <div className='p4-vega__ui--dropdown-menu-item' data-key='F#/Gb'>F#/Gb</div>
                            <div className='p4-vega__ui--dropdown-menu-item' data-key='G'>G</div>
                            <div className='p4-vega__ui--dropdown-menu-item' data-key='G#/Ab'>G#/Ab</div>
                            <div className='p4-vega__ui--dropdown-menu-item' data-key='A'>A</div>
                            <div className='p4-vega__ui--dropdown-menu-item' data-key='A#/Bb'>A#/Bb</div>
                            <div className='p4-vega__ui--dropdown-menu-item' data-key='B'>B</div>
                        </div>
                    </div>
                    <div className='p4-vega__ui--dropdown' data-dropdown-scales>
                        <button className='p4-vega__ui--dropdown-btn' data-dropdown-btn>Scale: &nbsp;<span className='u-truncate' data-selected-scale>Major</span></button>
                        <div className='p4-vega__ui--dropdown-menu'>
                            <div className='p4-vega__ui--dropdown-menu-item' data-scale='Major'>Major</div>
                            <div className='p4-vega__ui--dropdown-menu-item' data-scale='Minor'>Minor</div>
                            <div className='p4-vega__ui--dropdown-menu-item' data-scale='Pentatonic'>Pentatonic</div>
                            <div className='p4-vega__ui--dropdown-menu-item' data-scale='Blues'>Blues</div>
                            <div className='p4-vega__ui--dropdown-menu-item' data-scale='Dorian'>Dorian</div>
                            <div className='p4-vega__ui--dropdown-menu-item' data-scale='Mixolydian'>Mixolydian</div>
                            <div className='p4-vega__ui--dropdown-menu-item' data-scale='Phrygian'>Phrygian</div>
                            <div className='p4-vega__ui--dropdown-menu-item' data-scale='Lydian'>Lydian</div>
                            <div className='p4-vega__ui--dropdown-menu-item' data-scale='Locrian'>Locrian</div>
                            <div className='p4-vega__ui--dropdown-menu-item' data-scale='Chromatic'>Chromatic</div>
                            <div className='p4-vega__ui--dropdown-menu-item' data-scale='Harmonic Major'>Harmonic Major</div>
                            <div className='p4-vega__ui--dropdown-menu-item' data-scale='Melodic Minor'>Melodic Minor</div>
                            <div className='p4-vega__ui--dropdown-menu-item' data-scale='Whole Tone'>Whole Tone</div>
                            <div className='p4-vega__ui--dropdown-menu-item' data-scale='Hungarian Minor'>Hungarian Minor</div>
                            <div className='p4-vega__ui--dropdown-menu-item' data-scale='Double Harmonic'>Double Harmonic</div>
                            <div className='p4-vega__ui--dropdown-menu-item' data-scale='Neapolitan Major'>Neapolitan Major</div>
                            <div className='p4-vega__ui--dropdown-menu-item' data-scale='Neapolitan Minor'>Neapolitan Minor</div>
                            <div className='p4-vega__ui--dropdown-menu-item' data-scale='Augmented'>Augmented</div>
                            <div className='p4-vega__ui--dropdown-menu-item' data-scale='Hexatonic'>Hexatonic</div>
                            <div className='p4-vega__ui--dropdown-menu-item' data-scale='Enigmatic'>Enigmatic</div>
                            <div className='p4-vega__ui--dropdown-menu-item' data-scale='Spanish Gypsy'>Spanish Gypsy</div>
                            <div className='p4-vega__ui--dropdown-menu-item' data-scale='Hirajoshi'>Hirajoshi</div>
                            <div className='p4-vega__ui--dropdown-menu-item' data-scale='Balinese Pelog'>Balinese Pelog</div>
                            <div className='p4-vega__ui--dropdown-menu-item' data-scale='Egyptian'>Egyptian</div>
                            <div className='p4-vega__ui--dropdown-menu-item' data-scale='Hungarian Gypsy'>Hungarian Gypsy</div>
                            <div className='p4-vega__ui--dropdown-menu-item' data-scale='Persian'>Persian</div>
                            <div className='p4-vega__ui--dropdown-menu-item' data-scale='Tritone'>Tritone</div>
                            <div className='p4-vega__ui--dropdown-menu-item' data-scale='Flamenco'>Flamenco</div>
                            <div className='p4-vega__ui--dropdown-menu-item' data-scale='Iwato'>Iwato</div>
                            <div className='p4-vega__ui--dropdown-menu-item' data-scale='Blues Heptatonic'>Blues Heptatonic</div>
                        </div>
                    </div>
                </div>
            </div>
        </section>   
    );
}

export default P4Vega;