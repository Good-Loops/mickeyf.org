// For toggling the active class of a dropdown element 
// and setting the selected key text content to the selected key
export default class Dropdown {
    // The toggle method toggles the active class of a dropdown element
    public static toggle = (event: Event): void => {
        // Check if the event target is a dropdown button, selected element, or a dropdown element
        const isDropdownBtn: boolean = (event.target as Element).matches('[data-dropdown-btn]')
                                        || (event.target as Element).matches('[data-dropdown]')
                                        || (event.target as Element).matches('[data-selected-key]')
                                        || (event.target as Element).matches('[data-selected-scale]');

        // If the event target is not a dropdown button, selected key element, or a dropdown element
        // and the target is not null, return
        // This is a guard clause to prevent the function from running when the event target is not related to a dropdown
        if (!isDropdownBtn && (event.target as Element).closest('[data-dropdown]') !== null) return;

        // Get the closest dropdown element to the event target
        let currentDropdown: Element = (event.target as Element).closest('[data-dropdown]') as Element;

        // If there is a dropdown element, toggle the active class
        if (currentDropdown) currentDropdown.classList.toggle('active');

        // Get all dropdown elements with the active class
        document.querySelectorAll('[data-dropdown].active').forEach(dropdown => {
            // If the dropdown element is the same as the current dropdown, return
            if (dropdown === currentDropdown) return;
            // Otherwise, remove the active class from the dropdown element
            else dropdown.classList.remove('active');
        });
    }

    // The toggleKeySelection method sets the selected key text content to the selected key
    public static toggleKeySelection = (event: Event): void => {
        // Get the selected key as a string from the event target
        const selectedKey: string = (event.target as Element).getAttribute('data-item') as string;
        // Get the dropdown element
        const dropdown: Element = document.querySelector('[data-dropdown]') as Element;

        // If there is a selected key, set the selected key 
        // text content to the selected key
        if (selectedKey) {
            document.querySelector('[data-selected-key]')!.textContent = selectedKey;
            dropdown.classList.remove('active');
        }
    }

    public static toggleScaleSelection = (event: Event): void => {
        // Get the selected scale as a string from the event target
        const selectedScale: string = (event.target as Element).getAttribute('data-item') as string;
        // Get the dropdown element
        const dropdown: Element = document.querySelector('[data-dropdown]') as Element;

        // If there is a selected scale, set the selected scale 
        // text content to the selected scale
        if (selectedScale) {
            document.querySelector('[data-selected-scale]')!.textContent = selectedScale;
            dropdown.classList.remove('active');
        }
    }
}