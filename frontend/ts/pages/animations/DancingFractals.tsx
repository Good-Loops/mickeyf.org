import React, { useEffect } from 'react';
import dancingFractalsRunner from '../../actions/animations/dancing fractals/dancingFractalsRunner';

const DancingFractals: React.FC = () => {
    const containerRef = React.useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        let dispose: (() => void) | undefined;

        (async () => {
            dispose = await dancingFractalsRunner(
                containerRef.current!
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