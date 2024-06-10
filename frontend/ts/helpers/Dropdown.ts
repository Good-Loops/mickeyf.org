export default class Dropdown {
    constructor(private dropdownAttr: string, private buttonAttr: string, private selectedAttr: string) { }

    // Static method to toggle the active class of a dropdown element
    public static toggle(dropdownAttr: string, buttonAttr: string) {
        return (event: Event): void => {
            const isDropdownBtn: boolean = (event.target as Element).matches(`[${buttonAttr}]`)
                || (event.target as Element).closest(`[${dropdownAttr}]`) !== null;

            if (!isDropdownBtn) return;

            let currentDropdown: Element = (event.target as Element).closest(`[${dropdownAttr}]`) as Element;

            const allDropdowns: NodeListOf<Element> = document.querySelectorAll(`[${dropdownAttr}]`);
            allDropdowns.forEach(dropdown => {
                if (dropdown === currentDropdown) {
                    dropdown.classList.toggle('active');
                } else {
                    dropdown.classList.remove('active');
                }
            });
        };
    }

    // Static method to toggle the selected item and update the dropdown
    public static toggleSelection(dropdownAttr: string, selectedAttr: string, attributeName: string) {
        return (event: Event): void => {
            const selectedItem: string = (event.target as Element).getAttribute(attributeName) as string;
            const dropdown: Element = (event.target as Element).closest(`[${dropdownAttr}]`) as Element;

            if (selectedItem) {
                dropdown.querySelector(`[${selectedAttr}]`)!.textContent = selectedItem;
                dropdown.classList.remove('active');
            }
        };
    }
}