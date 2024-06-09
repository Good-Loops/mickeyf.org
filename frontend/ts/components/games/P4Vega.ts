import p4Vega from '../../actions/games/p4-Vega/p4-Vega';

function component() {
    const render = () => {
        return /*html*/`
            <section class='p4-vega' data-p4-vega>
                <h1 class='p4-vega__title u-canvas-title'>p4-Vega</h1>
                <img src='./sprites/p4Vega/p4.png' style='display: none;' data-p4>
                <img src='./sprites/p4Vega/water.png' style='display: none;' data-water>
                <img src='./sprites/p4Vega/bhBlue.png' style='display: none;' data-bhBlue>
                <img src='./sprites/p4Vega/bhRed.png' style='display: none;' data-bhRed>
                <img src='./sprites/p4Vega/bhYellow.png' style='display: none;' data-bhYellow>
                <div class='p4-vega__ui'>
                    <label class='p4-vega__ui--option' data-checkbox>
                        <input class='p4-vega__ui--checkbox' type='checkbox' checked data-bg-music-playing>
                        <span class='p4-vega__ui--option-btn'>Background Music</span>
                    </label>
                    <label class='p4-vega__ui--option' data-checkbox>
                        <input class='p4-vega__ui--checkbox' type='checkbox' data-musical-notes-playing>
                        <span class='p4-vega__ui--option-btn'>Notes Playing</span>
                    </label>
                    <div class='p4-vega__ui--dropdown-grid'>
                        <div class='p4-vega__ui--dropdown' data-dropdown>
                            <button class='p4-vega__ui--dropdown-btn' data-dropdown-btn>Key: &nbsp;<span data-selected-key>C</span></button>
                            <div class='p4-vega__ui--dropdown-menu p4-vega__ui--dropdown-menu-keys'>
                                <div class='p4-vega__ui--dropdown-menu-item' data-key='C'>C</div>
                                <div class='p4-vega__ui--dropdown-menu-item' data-key='C#/Db'>C#/Db</div>
                                <div class='p4-vega__ui--dropdown-menu-item' data-key='D'>D</div>
                                <div class='p4-vega__ui--dropdown-menu-item' data-key='D#/Eb'>D#/Eb</div>
                                <div class='p4-vega__ui--dropdown-menu-item' data-key='E'>E</div>
                                <div class='p4-vega__ui--dropdown-menu-item' data-key='F'>F</div>
                                <div class='p4-vega__ui--dropdown-menu-item' data-key='F#/Gb'>F#/Gb</div>
                                <div class='p4-vega__ui--dropdown-menu-item' data-key='G'>G</div>
                                <div class='p4-vega__ui--dropdown-menu-item' data-key='G#/Ab'>G#/Ab</div>
                                <div class='p4-vega__ui--dropdown-menu-item' data-key='A'>A</div>
                                <div class='p4-vega__ui--dropdown-menu-item' data-key='A#/Bb'>A#/Bb</div>
                                <div class='p4-vega__ui--dropdown-menu-item' data-key='B'>B</div>
                            </div>
                        </div>
                        <div class='p4-vega__ui--dropdown' data-dropdown>
                            <button class='p4-vega__ui--dropdown-btn' data-dropdown-btn>Scale: &nbsp;<span class='u-truncate' data-selected-scale>Major</span></button>
                            <div class='p4-vega__ui--dropdown-menu'>
                                <div class='p4-vega__ui--dropdown-menu-item' data-scale='Major'>Major</div>
                                <div class='p4-vega__ui--dropdown-menu-item' data-scale='Minor'>Minor</div>
                                <div class='p4-vega__ui--dropdown-menu-item' data-scale='Pentatonic'>Pentatonic</div>
                                <div class='p4-vega__ui--dropdown-menu-item' data-scale='Blues'>Blues</div>
                                <div class='p4-vega__ui--dropdown-menu-item' data-scale='Dorian'>Dorian</div>
                                <div class='p4-vega__ui--dropdown-menu-item' data-scale='Mixolydian'>Mixolydian</div>
                                <div class='p4-vega__ui--dropdown-menu-item' data-scale='Phrygian'>Phrygian</div>
                                <div class='p4-vega__ui--dropdown-menu-item' data-scale='Lydian'>Lydian</div>
                                <div class='p4-vega__ui--dropdown-menu-item' data-scale='Locrian'>Locrian</div>
                                <div class='p4-vega__ui--dropdown-menu-item' data-scale='Chromatic'>Chromatic</div>
                                <div class='p4-vega__ui--dropdown-menu-item' data-scale='Harmonic Major'>Harmonic Major</div>
                                <div class='p4-vega__ui--dropdown-menu-item' data-scale='Melodic Minor'>Melodic Minor</div>
                                <div class='p4-vega__ui--dropdown-menu-item' data-scale='Whole Tone'>Whole Tone</div>
                                <div class='p4-vega__ui--dropdown-menu-item' data-scale='Hungarian Minor'>Hungarian Minor</div>
                                <div class='p4-vega__ui--dropdown-menu-item' data-scale='Double Harmonic'>Double Harmonic</div>
                                <div class='p4-vega__ui--dropdown-menu-item' data-scale='Neapolitan Major'>Neapolitan Major</div>
                                <div class='p4-vega__ui--dropdown-menu-item' data-scale='Neapolitan Minor'>Neapolitan Minor</div>
                                <div class='p4-vega__ui--dropdown-menu-item' data-scale='Augmented'>Augmented</div>
                                <div class='p4-vega__ui--dropdown-menu-item' data-scale='Hexatonic'>Hexatonic</div>
                                <div class='p4-vega__ui--dropdown-menu-item' data-scale='Enigmatic'>Enigmatic</div>
                                <div class='p4-vega__ui--dropdown-menu-item' data-scale='Spanish Gypsy'>Spanish Gypsy</div>
                                <div class='p4-vega__ui--dropdown-menu-item' data-scale='Hirajoshi'>Hirajoshi</div>
                                <div class='p4-vega__ui--dropdown-menu-item' data-scale='Balinese Pelog'>Balinese Pelog</div>
                                <div class='p4-vega__ui--dropdown-menu-item' data-scale='Egyptian'>Egyptian</div>
                                <div class='p4-vega__ui--dropdown-menu-item' data-scale='Hungarian Gypsy'>Hungarian Gypsy</div>
                                <div class='p4-vega__ui--dropdown-menu-item' data-scale='Persian'>Persian</div>
                                <div class='p4-vega__ui--dropdown-menu-item' data-scale='Tritone'>Tritone</div>
                                <div class='p4-vega__ui--dropdown-menu-item' data-scale='Flamenco'>Flamenco</div>
                                <div class='p4-vega__ui--dropdown-menu-item' data-scale='Iwato'>Iwato</div>
                                <div class='p4-vega__ui--dropdown-menu-item' data-scale='Blues Heptatonic'>Blues Heptatonic</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>   
        `;
    }

    const action = async () => {
        await p4Vega();
    }

    return {
        render, 
        action
    }
}

export default component();