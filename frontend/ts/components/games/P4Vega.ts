import p4Vega from "../../actions/games/p4-Vega/p4-Vega";

function component() {
    const render = () => {
        return /*html*/`
            <section class="p4-vega" data-p4-vega>
                <h1 class="p4-vega__title u-canvas-title">p4-Vega</h1>
                <img src="./sprites/p4Vega/p4.png" style="display: none;" data-p4>
                <img src="./sprites/p4Vega/water.png" style="display: none;" data-water>
                <img src="./sprites/p4Vega/bhBlue.png" style="display: none;" data-bhBlue>
                <img src="./sprites/p4Vega/bhRed.png" style="display: none;" data-bhRed>
                <img src="./sprites/p4Vega/bhYellow.png" style="display: none;" data-bhYellow>
                <div class="p4-vega__ui">
                    <label class="p4-vega__ui--option" data-checkbox>
                        <input class="p4-vega__ui--checkbox" type="checkbox" checked data-bg-music-playing>
                        <span class="p4-vega__ui--option-btn">Background Music</span>
                    </label>
                    <label class="p4-vega__ui--option" data-checkbox>
                        <input class="p4-vega__ui--checkbox" type="checkbox" data-musical-notes-playing>
                        <span class="p4-vega__ui--option-btn">Notes Playing</span>
                    </label>
                    <div class="p4-vega__ui--dropdown-grid">
                        <div class="p4-vega__ui--dropdown" data-dropdown>
                            <button class="p4-vega__ui--dropdown-btn" data-dropdown-btn>Key: &nbsp;<span data-selected-key>C</span></button>
                            <div class="p4-vega__ui--dropdown-menu p4-vega__ui--dropdown-menu-keys">
                                <div class="p4-vega__ui--dropdown-menu-item" data-item="C">C</div>
                                <div class="p4-vega__ui--dropdown-menu-item" data-item="C#/Db">C#/Db</div>
                                <div class="p4-vega__ui--dropdown-menu-item" data-item="D">D</div>
                                <div class="p4-vega__ui--dropdown-menu-item" data-item="D#/Eb">D#/Eb</div>
                                <div class="p4-vega__ui--dropdown-menu-item" data-item="E">E</div>
                                <div class="p4-vega__ui--dropdown-menu-item" data-item="F">F</div>
                                <div class="p4-vega__ui--dropdown-menu-item" data-item="F#/Gb">F#/Gb</div>
                                <div class="p4-vega__ui--dropdown-menu-item" data-item="G">G</div>
                                <div class="p4-vega__ui--dropdown-menu-item" data-item="G#/Ab">G#/Ab</div>
                                <div class="p4-vega__ui--dropdown-menu-item" data-item="A">A</div>
                                <div class="p4-vega__ui--dropdown-menu-item" data-item="A#/Bb">A#/Bb</div>
                                <div class="p4-vega__ui--dropdown-menu-item" data-item="B">B</div>
                            </div>
                        </div>
                        <div class="p4-vega__ui--dropdown" data-dropdown>
                            <button class="p4-vega__ui--dropdown-btn" data-dropdown-btn>Scale: &nbsp;<span data-selected-scale>Major</span></button>
                            <div class="p4-vega__ui--dropdown-menu">
                                <div class="p4-vega__ui--dropdown-menu-item" data-item="Major">Major</div>
                                <div class="p4-vega__ui--dropdown-menu-item" data-item="Minor">Minor</div>
                                <div class="p4-vega__ui--dropdown-menu-item" data-item="Pentatonic">Pentatonic</div>
                                <div class="p4-vega__ui--dropdown-menu-item" data-item="Blues">Blues</div>
                                <div class="p4-vega__ui--dropdown-menu-item" data-item="Dorian">Dorian</div>
                                <div class="p4-vega__ui--dropdown-menu-item" data-item="Mixolydian">Mixolydian</div>
                                <div class="p4-vega__ui--dropdown-menu-item" data-item="Phrygian">Phrygian</div>
                                <div class="p4-vega__ui--dropdown-menu-item" data-item="Lydian">Lydian</div>
                                <div class="p4-vega__ui--dropdown-menu-item" data-item="Locrian">Locrian</div>
                                <div class="p4-vega__ui--dropdown-menu-item" data-item="Chromatic">Chromatic</div>
                                <div class="p4-vega__ui--dropdown-menu-item" data-item="Harmonic Major">Harmonic Major</div>
                                <div class="p4-vega__ui--dropdown-menu-item" data-item="Melodic Minor">Melodic Minor</div>
                                <div class="p4-vega__ui--dropdown-menu-item" data-item="Whole Tone">Whole Tone</div>
                                <div class="p4-vega__ui--dropdown-menu-item" data-item="Hungarian Minor">Hungarian Minor</div>
                                <div class="p4-vega__ui--dropdown-menu-item" data-item="Double Harmonic">Double Harmonic</div>
                                <div class="p4-vega__ui--dropdown-menu-item" data-item="Neapolitan Major">Neapolitan Major</div>
                                <div class="p4-vega__ui--dropdown-menu-item" data-item="Neapolitan Minor">Neapolitan Minor</div>
                                <div class="p4-vega__ui--dropdown-menu-item" data-item="Augmented">Augmented</div>
                                <div class="p4-vega__ui--dropdown-menu-item" data-item="Hexatonic">Hexatonic</div>
                                <div class="p4-vega__ui--dropdown-menu-item" data-item="Enigmatic">Enigmatic</div>
                                <div class="p4-vega__ui--dropdown-menu-item" data-item="Spanish Gypsy">Spanish Gypsy</div>
                                <div class="p4-vega__ui--dropdown-menu-item" data-item="Hirajoshi">Hirajoshi</div>
                                <div class="p4-vega__ui--dropdown-menu-item" data-item="Balinese Pelog">Balinese Pelog</div>
                                <div class="p4-vega__ui--dropdown-menu-item" data-item="Egyptian">Egyptian</div>
                                <div class="p4-vega__ui--dropdown-menu-item" data-item="Hungarian Gypsy">Hungarian Gypsy</div>
                                <div class="p4-vega__ui--dropdown-menu-item" data-item="Persian">Persian</div>
                                <div class="p4-vega__ui--dropdown-menu-item" data-item="Tritone">Tritone</div>
                                <div class="p4-vega__ui--dropdown-menu-item" data-item="Flamenco">Flamenco</div>
                                <div class="p4-vega__ui--dropdown-menu-item" data-item="Iwato">Iwato</div>
                                <div class="p4-vega__ui--dropdown-menu-item" data-item="Blues Heptatonic">Blues Heptatonic</div>
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