export default class Dropdown {
    
    public static toggle = (event: Event): void => {
        const isDropdownBtn: boolean = (event.target as Element).matches('[data-dropdown-btn]')
            || (event.target as Element).matches('[data-selected-key]')
            || (event.target as Element).matches('[data-dropdown]');
        if (!isDropdownBtn && (event.target as Element).closest('[data-dropdown]') !== null) return;

        let currentDropdown: Element;
        currentDropdown = (event.target as Element).closest('[data-dropdown]') as Element;
        if (currentDropdown) currentDropdown.classList.toggle('active');

        document.querySelectorAll('[data-dropdown].active').forEach(dropdown => {
            if (dropdown === currentDropdown) return;
            dropdown.classList.remove('active');
        });
    }

    // Toggle key selection
    public static toggleKeySelection = (event: Event): void => {
        const selectedKey: string = (event.target as Element).getAttribute('data-item') as string;
        const dropdown: Element = document.querySelector('[data-dropdown]') as Element;

        if (selectedKey) {
            document.querySelector('[data-selected-key]')!.textContent = selectedKey;
            dropdown.classList.remove('active');
        }
    }
}