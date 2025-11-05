/**
 * Class to handle the fullscreen functionality for a given target element.
 */
export default class FullscreenButton {
    private targetElement: HTMLElement;
    private fullscreenButton: HTMLButtonElement;

    /**
     * Initializes a new instance of the FullscreenButton class.
     * @param canvas - The target element to be displayed in fullscreen.
     * @param parent - The container element where the fullscreen button will be appended.
     */
    constructor(canvas: HTMLElement, parent: HTMLElement) {
        this.targetElement = canvas;

        this.fullscreenButton = document.createElement('button');
        this.fullscreenButton.textContent = 'Fullscreen';
        this.fullscreenButton.className = 'fullscreen-btn';

        parent.append(this.fullscreenButton);

        this.attachEventListeners();
    }

    /**
     * Attaches event listeners for the fullscreen button and fullscreen change events.
     */
    private attachEventListeners() {
        this.fullscreenButton.addEventListener('click', () =>
            this.enterFullscreen()
        );

        document.addEventListener('fullscreenchange', () =>
            this.onFullscreenChange()
        );
        document.addEventListener('webkitfullscreenchange', () =>
            this.onFullscreenChange()
        ); // Safari
    }

    /**
     * Enters fullscreen mode for the target element.
     */
    private enterFullscreen() {
        if (this.targetElement.requestFullscreen) {
            this.targetElement.requestFullscreen();
        } else if ((this.targetElement as any).webkitRequestFullscreen) {
            // Safari
            (this.targetElement as any).webkitRequestFullscreen();
        }
    }

    /**
     * Handles changes to fullscreen mode, adjusting the display and size of the target element.
     */
    private onFullscreenChange() {
        if (
            document.fullscreenElement === this.targetElement ||
            (document as any).webkitFullscreenElement === this.targetElement
        ) {
            this.fullscreenButton.style.display = 'none';

            this.targetElement.style.width = `${window.innerWidth}px`;
            this.targetElement.style.height = `${window.innerHeight}px`;
        } else {
            this.fullscreenButton.style.display = 'block';

            this.targetElement.style.width = '';
            this.targetElement.style.height = '';
        }
    }
}
