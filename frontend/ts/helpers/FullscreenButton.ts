export default class FullscreenButton {
    private targetElement: HTMLElement;
    private fullscreenButton: HTMLButtonElement;

    constructor(canvas: HTMLElement, sectionDataAttribute: string) {
        this.targetElement = canvas;

        this.fullscreenButton = document.createElement('button');
        this.fullscreenButton.textContent = 'Fullscreen';
        this.fullscreenButton.className = 'fullscreen-btn';

        document.querySelector(sectionDataAttribute)!.append(this.fullscreenButton);

        this.attachEventListeners();
    }

    private attachEventListeners() {
        this.fullscreenButton.addEventListener('click', () => this.enterFullscreen());

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

    // TODO: Review else statement
    private onFullscreenChange() {
        if (document.fullscreenElement === this.targetElement 
            || (document as any).webkitFullscreenElement === this.targetElement) {

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
