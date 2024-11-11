export default class Dropdown {
    constructor(private dropdownDataAttribute: string, 
                private buttonDataAttribute: string, 
                private selectedDataAttribute: string) { }

    toggle() {
        return (event: Event): void => {
            const isDropdownBtn: boolean = (event.target as Element).matches(`[${this.buttonDataAttribute}]`)
                || (event.target as Element).closest(`[${this.dropdownDataAttribute}]`) !== null;

            if (!isDropdownBtn) return;

            let currentDropdown: Element = (event.target as Element).closest(`[${this.dropdownDataAttribute}]`) as Element;

            const allDropdowns: NodeListOf<Element> = document.querySelectorAll(`[${this.dropdownDataAttribute}]`);
            allDropdowns.forEach(dropdown => {
                if (dropdown === currentDropdown) {
                    dropdown.classList.toggle('active');
                } else {
                    dropdown.classList.remove('active');
                }
            });
        };
    }

    toggleSelection(optionDataAttribute: string) {
        return (event: Event): void => {
            const selectedItem: string = (event.target as Element).getAttribute(optionDataAttribute) as string;
            const dropdown: Element = (event.target as Element).closest(`[${this.dropdownDataAttribute}]`) as Element;

            if (selectedItem) {
                dropdown.querySelector(`[${this.selectedDataAttribute}]`)!.textContent = selectedItem;
                dropdown.classList.remove('active');
            }
        };
    }
}