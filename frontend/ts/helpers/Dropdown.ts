/**
 * Class to handle dropdown functionality.
 */
export default class Dropdown {
    /**
     * Initializes a new instance of the Dropdown class.
     * @param dropdownDataAttribute - The data attribute for the dropdown element.
     * @param buttonDataAttribute - The data attribute for the button element.
     * @param selectedDataAttribute - The data attribute for the selected item element.
     */
    constructor(
        private dropdownDataAttribute: string,
        private buttonDataAttribute: string,
        private selectedDataAttribute: string
    ) {}

    /**
     * Toggles the visibility of the dropdown menu.
     * @returns A function to handle the toggle event.
     */
    toggle() {
        return (event: Event): void => {
            const isDropdownBtn =
                (event.target as Element).matches(
                    `[${this.buttonDataAttribute}]`
                ) ||
                (event.target as Element).closest(
                    `[${this.dropdownDataAttribute}]`
                ) !== null;

            if (!isDropdownBtn) return;

            let currentDropdown = (event.target as Element).closest(
                `[${this.dropdownDataAttribute}]`
            ) as Element;

            const allDropdowns = document.querySelectorAll(
                `[${this.dropdownDataAttribute}]`
            );
            allDropdowns.forEach((dropdown) => {
                if (dropdown === currentDropdown) {
                    dropdown.classList.toggle('active');
                } else {
                    dropdown.classList.remove('active');
                }
            });
        };
    }

    /**
     * Toggles the selection of an item in the dropdown menu.
     * @param optionDataAttribute - The data attribute for the option element.
     * @returns A function to handle the selection event.
     */
    toggleSelection(optionDataAttribute: string) {
        return (event: Event): void => {
            const selectedItem = (event.target as Element).getAttribute(
                optionDataAttribute
            ) as string;
            const dropdown = (event.target as Element).closest(
                `[${this.dropdownDataAttribute}]`
            ) as Element;

            if (selectedItem) {
                dropdown.querySelector(
                    `[${this.selectedDataAttribute}]`
                )!.textContent = selectedItem;
                dropdown.classList.remove('active');
            }
        };
    }
}
