import React, { useEffect } from 'react';
import runDancingFractals from '../../actions/animations/dancing fractals/runDancingFractals';
import Tree from '../../actions/animations/dancing fractals/classes/Tree';

const DancingFractals: React.FC = () => {
    const containerRef = React.useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        let dispose: (() => void) | undefined;

        (async () => {
            dispose = await runDancingFractals(
                containerRef.current!,
                Tree
            );
        })();

        return () => {
            dispose?.();
        };
    }, []);

    return (
        <section className='dancing-fractals' ref={containerRef}>
            <h1 className='u-canvas-title'>Dancing Fractals</h1>
        </section>   
    );
}

export default DancingFractals;