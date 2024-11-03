export default class FullscreenButton {
    private targetElement: HTMLElement;
    private fullscreenButton: HTMLButtonElement;

    constructor(canvas: HTMLElement, sectionDataAttribute: string) {
        this.targetElement = canvas;

        // Create the fullscreen button
        this.fullscreenButton = document.createElement('button');
        this.fullscreenButton.textContent = 'Fullscreen';
        this.fullscreenButton.className = 'fullscreen-btn';

        document.querySelector(sectionDataAttribute)!.append(this.fullscreenButton);

        // Attach event listeners
        this.attachEventListeners();
    }

    private attachEventListeners() {
        // Event listener for the fullscreen button
        this.fullscreenButton.addEventListener('click', () => this.enterFullscreen());

        // Event listener for when fullscreen mode changes
        document.addEventListener('fullscreenchange', () => this.onFullscreenChange());
        document.addEventListener('webkitfullscreenchange', () => this.onFullscreenChange()); // For Safari
    }

    private enterFullscreen() {
        if (this.targetElement.requestFullscreen) {
            this.targetElement.requestFullscreen();
        } else if ((this.targetElement as any).webkitRequestFullscreen) { // Safari compatibility
            (this.targetElement as any).webkitRequestFullscreen();
        }
    }

    private onFullscreenChange() {
        if (document.fullscreenElement === this.targetElement || (document as any).webkitFullscreenElement === this.targetElement) {
            // We are in fullscreen mode
            this.fullscreenButton.style.display = 'none';

            // Adjust the element size to fill the screen
            this.targetElement.style.width = `${window.innerWidth}px`;
            this.targetElement.style.height = `${window.innerHeight}px`;
        } else {
            // We have exited fullscreen mode
            this.fullscreenButton.style.display = 'block';

            // Reset the element size to its original dimensions
            this.targetElement.style.width = '';
            this.targetElement.style.height = '';
        }
    }
}
